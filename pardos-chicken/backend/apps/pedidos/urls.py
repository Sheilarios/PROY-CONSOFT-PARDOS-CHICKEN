from rest_framework.routers import DefaultRouter
from .views import ProductoViewSet, PedidoViewSet

router = DefaultRouter()
router.register("productos", ProductoViewSet, basename="producto")
router.register("", PedidoViewSet, basename="pedido")

urlpatterns = router.urls
