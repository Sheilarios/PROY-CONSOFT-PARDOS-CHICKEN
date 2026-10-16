from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from datetime import datetime, time, timedelta
from django.utils import timezone


from .models import Producto, Cliente, Pedido
from .serializers import (
    ProductoSerializer,
    ClienteSerializer,
    PedidoRegistroSerializer,
    PedidoConsultaSerializer,
)
from . import validators


class PedidoFiltro(filters.FilterSet):
    fecha = filters.DateFilter(method="filtrar_por_fecha")

    def filtrar_por_fecha(self, queryset, name, value):
        inicio = timezone.make_aware(datetime.combine(value, time.min))
        fin = inicio + timedelta(days=1)

        return queryset.filter(
            fecha_creacion__gte=inicio,
            fecha_creacion__lt=fin,
        )

    class Meta:
        model = Pedido
        fields = ["fecha", "estado", "modalidad_entrega"]


class ProductoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Catálogo de productos, usado por caja para armar el pedido (RF-01)."""

    queryset = Producto.objects.filter(activo=True)
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]


class ClienteViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Registro y búsqueda de clientes para el personal de caja."""

    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    @action(detail=False, methods=["get"], url_path="buscar-por-nombre")
    def buscar_por_nombre(self, request):
        nombre = request.query_params.get("nombre", "").strip()
        if not nombre:
            raise ValidationError({"nombre": "Ingrese el nombre del cliente."})

        clientes = Cliente.objects.filter(nombre__icontains=nombre)[:10]
        resultados = [
            {
                "id": cliente.id,
                "nombre": cliente.nombre,
                "telefono": cliente.telefono,
                "origen": "registro",
            }
            for cliente in clientes
        ]

        # Los pedidos anteriores guardaban el nombre sin crear un Cliente.
        encontrados = {
            (cliente_encontrado["nombre"].casefold(), cliente_encontrado["telefono"])
            for cliente_encontrado in resultados
        }
        pedidos_anteriores = (
            Pedido.objects.filter(cliente_nombre__icontains=nombre)
            .exclude(cliente_nombre="")
            .order_by("cliente_nombre", "cliente_telefono")
            .values_list("cliente_nombre", "cliente_telefono")
            .distinct()
        )
        for nombre_anterior, telefono_anterior in pedidos_anteriores:
            if len(resultados) == 10:
                break
            clave = (nombre_anterior.casefold(), telefono_anterior)
            if clave not in encontrados:
                resultados.append(
                    {
                        "id": None,
                        "nombre": nombre_anterior,
                        "telefono": telefono_anterior,
                        "origen": "historial",
                    }
                )
                encontrados.add(clave)

        if not resultados:
            raise NotFound("Cliente no encontrado.")
        return Response(resultados)


class PedidoViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Módulo 1: Control de pedidos.

    - create  -> RF-01 / RF-02: registrar pedido y validar stock.
    - list    -> RF-03: consultar pedidos registrados (filtrable por estado
                 y modalidad de entrega).
    - retrieve-> RF-03: consultar el detalle de un pedido puntual.
    - enviar_a_produccion -> RF-03: mueve el pedido de REGISTRADO a EN_COLA,
                 dejándolo listo para el Incremento 2.
    - cola_produccion -> RN-02: muestra los pedidos en cola según prioridad.
    - iniciar_preparacion / marcar_listo -> avanza el trabajo de cocina.
    """

    queryset = Pedido.objects.prefetch_related("detalles__producto").select_related(
        "registrado_por"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = PedidoFiltro
    pagination_class = None

    def get_serializer_class(self):
        if self.action == "create":
            return PedidoRegistroSerializer
        return PedidoConsultaSerializer

    def create(self, request, *args, **kwargs):
        serializador_registro = self.get_serializer(data=request.data)
        serializador_registro.is_valid(raise_exception=True)
        pedido_registrado = serializador_registro.save()

        # Se responde con el serializer de consulta para incluir
        # código generado, total calculado y estado.
        respuesta_pedido = PedidoConsultaSerializer(pedido_registrado)
        return Response(respuesta_pedido.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="cola-produccion")
    def cola_produccion(self, request):
        """RN-02: Salón, Delivery y Recojo; ante empate, primero el más antiguo."""
        pedidos_en_cola = self.get_queryset().filter(estado=Pedido.Estado.EN_COLA)
        pedidos_ordenados = sorted(
            pedidos_en_cola,
            key=lambda pedido: (pedido.prioridad, pedido.fecha_creacion, pedido.id),
        )
        return Response(PedidoConsultaSerializer(pedidos_ordenados, many=True).data)

    @action(detail=False, methods=["get"], url_path="seguimiento-produccion")
    def seguimiento_produccion(self, request):
        """Muestra los pedidos en preparación y los que ya están listos."""
        pedidos = self.get_queryset().filter(
            estado__in=[Pedido.Estado.EN_PREPARACION, Pedido.Estado.LISTO]
        )
        return Response(PedidoConsultaSerializer(pedidos, many=True).data)

    @action(detail=True, methods=["post"], url_path="enviar-a-produccion")
    def enviar_a_produccion(self, request, pk=None):
        """RF-03: envía un pedido registrado a la cola de producción."""
        pedido = self.get_object()

        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.EN_COLA,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )

        pedido.estado = Pedido.Estado.EN_COLA
        pedido.save(update_fields=["estado"])

        return Response(PedidoConsultaSerializer(pedido).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="iniciar-preparacion")
    def iniciar_preparacion(self, request, pk=None):
        """Pasa un pedido de la cola a preparación."""
        pedido = self.get_object()
        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.EN_PREPARACION,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )

        pedido.estado = Pedido.Estado.EN_PREPARACION
        pedido.hora_inicio_preparacion = timezone.now()
        pedido.save(update_fields=["estado", "hora_inicio_preparacion", "fecha_actualizacion"])
        return Response(PedidoConsultaSerializer(pedido).data)

    @action(detail=True, methods=["post"], url_path="marcar-listo")
    def marcar_listo(self, request, pk=None):
        """Marca como listo un pedido que está en preparación."""
        pedido = self.get_object()
        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.LISTO,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )

        pedido.estado = Pedido.Estado.LISTO
        pedido.hora_fin_preparacion = timezone.now()
        pedido.save(update_fields=["estado", "hora_fin_preparacion", "fecha_actualizacion"])
        return Response(PedidoConsultaSerializer(pedido).data)
