from rest_framework.routers import DefaultRouter
from .views import (
    ProductoViewSet, ClienteViewSet, PedidoViewSet, IncidenciaViewSet,
    EdicionPedidoViewSet,
)

router = DefaultRouter()
router.register("productos", ProductoViewSet, basename="producto")
router.register("clientes", ClienteViewSet, basename="cliente")
router.register("incidencias", IncidenciaViewSet, basename="incidencia")
router.register("ediciones", EdicionPedidoViewSet, basename="edicion-pedido")
router.register("", PedidoViewSet, basename="pedido")

urlpatterns = router.urls
