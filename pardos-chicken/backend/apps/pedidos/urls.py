from rest_framework.routers import DefaultRouter
from .views import (
    ProductoViewSet, ClienteViewSet, PedidoViewSet, IncidenciaViewSet,
    EdicionPedidoViewSet, RepartidorViewSet, EventoDespachoViewSet,
)

router = DefaultRouter()
router.register("productos", ProductoViewSet, basename="producto")
router.register("clientes", ClienteViewSet, basename="cliente")
router.register("incidencias", IncidenciaViewSet, basename="incidencia")
router.register("ediciones", EdicionPedidoViewSet, basename="edicion-pedido")
router.register("repartidores", RepartidorViewSet, basename="repartidor")
router.register("eventos-despacho", EventoDespachoViewSet, basename="evento-despacho")
router.register("", PedidoViewSet, basename="pedido")

urlpatterns = router.urls
