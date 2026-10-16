from rest_framework.routers import DefaultRouter
from .views import ProductoViewSet, ClienteViewSet, PedidoViewSet

router = DefaultRouter()
router.register("productos", ProductoViewSet, basename="producto")
router.register("clientes", ClienteViewSet, basename="cliente")
router.register("", PedidoViewSet, basename="pedido")

urlpatterns = router.urls
