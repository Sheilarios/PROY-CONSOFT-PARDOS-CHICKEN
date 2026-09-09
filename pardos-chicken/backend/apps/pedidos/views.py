from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Producto, Pedido
from .serializers import (
    ProductoSerializer,
    PedidoRegistroSerializer,
    PedidoConsultaSerializer,
)
from . import validators


class ProductoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Catálogo de productos, usado por caja para armar el pedido (RF-01)."""

    queryset = Producto.objects.filter(activo=True)
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]


class PedidoViewSet(viewsets.ModelViewSet):
    """
    Módulo 1: Control de pedidos.

    - create  -> RF-01 / RF-02: registrar pedido y validar stock.
    - list    -> RF-03: consultar pedidos registrados (filtrable por estado
                 y modalidad de entrega).
    - retrieve-> RF-03: consultar el detalle de un pedido puntual.
    - enviar_a_produccion -> RF-03: mueve el pedido de REGISTRADO a EN_COLA,
                 dejándolo listo para el Incremento 2.
    """

    queryset = Pedido.objects.prefetch_related("detalles__producto").select_related(
        "registrado_por"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["estado", "modalidad_entrega"]

    def get_serializer_class(self):
        if self.action == "create":
            return PedidoRegistroSerializer
        return PedidoConsultaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pedido = serializer.save()

        # Se responde con el serializer de consulta para incluir
        # código generado, total calculado y estado.
        salida = PedidoConsultaSerializer(pedido)
        return Response(salida.data, status=status.HTTP_201_CREATED)

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
