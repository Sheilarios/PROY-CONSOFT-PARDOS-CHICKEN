from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from datetime import datetime, time, timedelta
from django.db import transaction
from django.db.models import F
from django.utils import timezone


from apps.usuarios.models import Usuario

from .models import (
    Producto, Insumo, RecetaInsumo, Cliente, Pedido, DetallePedido,
    Incidencia, EdicionPedido,
)
from .serializers import (
    ProductoSerializer,
    ClienteSerializer,
    PedidoRegistroSerializer,
    PedidoEdicionSerializer,
    PedidoConsultaSerializer,
    IncidenciaSerializer,
    EdicionPedidoSerializer,
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


class ProductoViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
    mixins.UpdateModelMixin, viewsets.GenericViewSet,
):
    """Catálogo de productos, usado por caja para armar el pedido (RF-01)."""

    queryset = Producto.objects.filter(activo=True)
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ("update", "partial_update"):
            return queryset.select_for_update()
        return queryset

    def create(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR):
            raise PermissionDenied("Solo administración puede agregar productos.")
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR):
            raise PermissionDenied("Solo administración puede editar productos.")
        producto = self.get_object()
        try:
            stock_anterior = int(request.data.get("stock_anterior", ""))
        except (TypeError, ValueError):
            raise ValidationError({"stock_anterior": "Indica el stock que se mostró al abrir."})
        if producto.stock_disponible != stock_anterior:
            raise ValidationError({
                "stock_anterior": "El stock cambió. Actualiza la página antes de guardar."
            })
        serializer = self.get_serializer(producto, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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


class PermisoIncidencia(BasePermission):
    """Caja registra incidencias; administración consulta el historial."""

    def has_permission(self, request, view):
        if view.action == "create":
            return request.user.rol == Usuario.Rol.CAJERO and not request.user.is_superuser
        if view.action == "list":
            return request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR
        return False


class IncidenciaViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = Incidencia.objects.select_related("pedido", "registrado_por").order_by(
        "-fecha_registro", "-id"
    )
    serializer_class = IncidenciaSerializer
    permission_classes = [IsAuthenticated, PermisoIncidencia]
    pagination_class = None

    @transaction.atomic
    def perform_create(self, serializer):
        pedido = Pedido.objects.select_for_update().get(
            pk=serializer.validated_data["pedido"].pk
        )
        if pedido.estado not in (Pedido.Estado.REGISTRADO, Pedido.Estado.EN_COLA):
            raise ValidationError(
                {"pedido_id": "Solo se permiten incidencias en pedidos registrados o en cola."}
            )

        for producto_id, cantidad in pedido.detalles.values_list(
            "producto_id", "cantidad"
        ):
            Producto.objects.filter(pk=producto_id).update(
                stock_disponible=F("stock_disponible") + cantidad
            )
        pedido.estado = Pedido.Estado.CANCELADO
        pedido.save(update_fields=["estado", "fecha_actualizacion"])

        serializer.save(pedido=pedido, registrado_por=self.request.user)


class PermisoHistorialEdiciones(BasePermission):
    """Solo administración consulta las ediciones de pedidos."""

    def has_permission(self, request, view):
        return view.action == "list" and (
            request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR
        )


class EdicionPedidoViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = EdicionPedido.objects.select_related(
        "pedido", "modificado_por"
    ).order_by("-fecha", "-id")
    serializer_class = EdicionPedidoSerializer
    permission_classes = [IsAuthenticated, PermisoHistorialEdiciones]
    pagination_class = None


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

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, "action", None) in {
            "enviar_a_produccion", "iniciar_preparacion", "marcar_listo", "editar"
        }:
            return queryset.select_for_update()
        return queryset

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

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="editar")
    def editar(self, request, pk=None):
        """Modifica productos y observaciones sin cambiar el estado del pedido."""
        if request.user.is_superuser or request.user.rol != Usuario.Rol.CAJERO:
            raise PermissionDenied("Solo el personal de caja puede editar pedidos.")

        pedido = self.get_object()
        if pedido.estado not in (Pedido.Estado.REGISTRADO, Pedido.Estado.EN_COLA):
            raise ValidationError(
                {"estado": "Solo se pueden editar pedidos registrados o en cola."}
            )

        entrada = PedidoEdicionSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        detalles_actuales = list(pedido.detalles.select_related("producto").order_by("id"))
        cantidades_actuales = {}
        lineas_actuales = {}
        for detalle in detalles_actuales:
            cantidades_actuales[detalle.producto_id] = (
                cantidades_actuales.get(detalle.producto_id, 0) + detalle.cantidad
            )
            lineas_actuales.setdefault(detalle.producto_id, []).append(detalle)

        cantidades_nuevas = {
            detalle["producto"].pk: detalle["cantidad"]
            for detalle in entrada.validated_data["detalles"]
        }
        observaciones_nuevas = entrada.validated_data.get(
            "observaciones", pedido.observaciones
        )
        if (
            cantidades_nuevas == cantidades_actuales
            and observaciones_nuevas == pedido.observaciones
        ):
            raise ValidationError({"detalles": "No hay cambios para guardar."})

        ids_productos = set(cantidades_actuales) | set(cantidades_nuevas)
        productos = {
            producto.pk: producto
            for producto in Producto.objects.select_for_update()
            .filter(pk__in=ids_productos).order_by("pk")
        }
        for producto_id, cantidad_nueva in cantidades_nuevas.items():
            cantidad_adicional = cantidad_nueva - cantidades_actuales.get(producto_id, 0)
            if cantidad_adicional <= 0:
                continue
            producto = productos[producto_id]
            if not producto.activo:
                raise ValidationError(
                    {"detalles": f"{producto.nombre} ya no está disponible."}
                )
            if producto.stock_disponible < cantidad_adicional:
                raise ValidationError({
                    "detalles": (
                        f"Stock insuficiente para {producto.nombre}. "
                        f"Disponible: {producto.stock_disponible}."
                    )
                })

        total_anterior = sum(detalle.subtotal for detalle in detalles_actuales)
        cambios = []
        for producto_id in sorted(ids_productos):
            diferencia = cantidades_nuevas.get(producto_id, 0) - cantidades_actuales.get(producto_id, 0)
            if diferencia == 0:
                continue
            producto = productos[producto_id]
            Producto.objects.filter(pk=producto_id).update(
                stock_disponible=F("stock_disponible") - diferencia
            )
            if diferencia > 0:
                cambios.append(f"Se agregó {diferencia} {producto.nombre}.")
            else:
                cambios.append(f"Se quitó {-diferencia} {producto.nombre}.")

        for producto_id, lineas in lineas_actuales.items():
            cantidad_nueva = cantidades_nuevas.get(producto_id, 0)
            if not cantidad_nueva:
                pedido.detalles.filter(producto_id=producto_id).delete()
                continue
            principal = lineas[0]
            if principal.cantidad != cantidad_nueva:
                principal.cantidad = cantidad_nueva
                principal.save(update_fields=["cantidad"])
            if len(lineas) > 1:
                pedido.detalles.filter(pk__in=[linea.pk for linea in lineas[1:]]).delete()

        for producto_id, cantidad_nueva in cantidades_nuevas.items():
            if producto_id not in lineas_actuales:
                DetallePedido.objects.create(
                    pedido=pedido,
                    producto=productos[producto_id],
                    cantidad=cantidad_nueva,
                    precio_unitario_congelado=productos[producto_id].precio_unitario,
                )

        if observaciones_nuevas != pedido.observaciones:
            pedido.observaciones = observaciones_nuevas
            cambios.append("Se actualizaron las observaciones.")
        pedido.save(update_fields=["observaciones", "fecha_actualizacion"])
        pedido.refresh_from_db()
        EdicionPedido.objects.create(
            pedido=pedido,
            modificado_por=request.user,
            descripcion=" ".join(cambios),
            total_anterior=total_anterior,
            total_nuevo=pedido.total,
        )
        return Response(PedidoConsultaSerializer(pedido).data)

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

    @transaction.atomic
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

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="iniciar-preparacion")
    def iniciar_preparacion(self, request, pk=None):
        """Inicia la preparación solo si hay insumos y los descuenta una vez."""
        pedido = self.get_object()
        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.EN_PREPARACION,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )

        detalles = list(pedido.detalles.select_related("producto"))
        if not detalles:
            raise ValidationError({"detalles": "El pedido no tiene productos para preparar."})

        recetas = RecetaInsumo.objects.filter(
            producto_id__in=[detalle.producto_id for detalle in detalles]
        )
        recetas_por_producto = {}
        for receta in recetas:
            recetas_por_producto.setdefault(receta.producto_id, []).append(receta)

        insumos_necesarios = {}
        for detalle in detalles:
            receta_producto = recetas_por_producto.get(detalle.producto_id)
            if not receta_producto:
                raise ValidationError(
                    {"insumos": f"Configura los insumos de {detalle.producto.nombre}."}
                )
            for receta in receta_producto:
                insumos_necesarios[receta.insumo_id] = (
                    insumos_necesarios.get(receta.insumo_id, 0)
                    + receta.cantidad * detalle.cantidad
                )

        insumos = {
            insumo.id: insumo
            for insumo in Insumo.objects.select_for_update()
            .filter(id__in=insumos_necesarios)
            .order_by("id")
        }
        faltantes = [
            f"{insumos[id_insumo].nombre}: se necesitan {cantidad} y hay "
            f"{insumos[id_insumo].stock_disponible}"
            for id_insumo, cantidad in insumos_necesarios.items()
            if insumos[id_insumo].stock_disponible < cantidad
        ]
        if faltantes:
            raise ValidationError({"insumos": "Stock insuficiente de " + ", ".join(faltantes)})

        for id_insumo, cantidad in insumos_necesarios.items():
            insumo = insumos[id_insumo]
            insumo.stock_disponible -= cantidad
            insumo.save(update_fields=["stock_disponible"])

        pedido.estado = Pedido.Estado.EN_PREPARACION
        pedido.hora_inicio_preparacion = timezone.now()
        pedido.save(update_fields=["estado", "hora_inicio_preparacion", "fecha_actualizacion"])
        return Response(PedidoConsultaSerializer(pedido).data)

    @transaction.atomic
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
