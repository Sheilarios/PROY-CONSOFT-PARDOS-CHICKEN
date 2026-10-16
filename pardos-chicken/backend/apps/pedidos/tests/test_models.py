"""Pruebas del Incremento 1: total, stock y prioridad de pedidos."""
import pytest
from decimal import Decimal

from apps.usuarios.models import Usuario
from apps.pedidos.models import Producto, Pedido, DetallePedido


@pytest.mark.django_db
class TestCalculoTotalPedido:
    def test_total_se_calcula_sumando_subtotales_de_detalles(self):
        cajero = Usuario.objects.create_user(username="caja1", password="12345678", rol="CAJERO")
        producto = Producto.objects.create(
            nombre="1/4 Pollo a la brasa", precio_unitario=Decimal("18.50"), stock_disponible=10
        )
        pedido = Pedido.objects.create(
            registrado_por=cajero, modalidad_entrega=Pedido.ModalidadEntrega.SALON
        )
        DetallePedido.objects.create(
            pedido=pedido,
            producto=producto,
            cantidad=3,
            precio_unitario_congelado=producto.precio_unitario,
        )

        assert pedido.total == Decimal("55.50")

    def test_total_suma_productos_con_precios_y_cantidades_distintos(self):
        cajero = Usuario.objects.create_user(username="caja_total", password="12345678")
        pollo = Producto.objects.create(
            nombre="1/4 Pollo", precio_unitario=Decimal("18.50"), stock_disponible=10
        )
        bebida = Producto.objects.create(
            nombre="Bebida", precio_unitario=Decimal("8.20"), stock_disponible=10
        )
        pedido = Pedido.objects.create(
            registrado_por=cajero, modalidad_entrega=Pedido.ModalidadEntrega.SALON
        )
        DetallePedido.objects.create(
            pedido=pedido, producto=pollo, cantidad=2,
            precio_unitario_congelado=Decimal("18.50"),
        )
        DetallePedido.objects.create(
            pedido=pedido, producto=bebida, cantidad=3,
            precio_unitario_congelado=Decimal("8.20"),
        )

        assert pedido.total == Decimal("61.60")

    def test_total_conserva_el_precio_registrado_aunque_cambie_el_catalogo(self):
        cajero = Usuario.objects.create_user(username="caja_precio", password="12345678")
        producto = Producto.objects.create(
            nombre="Pollo", precio_unitario=Decimal("18.50"), stock_disponible=10
        )
        pedido = Pedido.objects.create(
            registrado_por=cajero, modalidad_entrega=Pedido.ModalidadEntrega.SALON
        )
        DetallePedido.objects.create(
            pedido=pedido, producto=producto, cantidad=2,
            precio_unitario_congelado=producto.precio_unitario,
        )
        producto.precio_unitario = Decimal("20.00")
        producto.save(update_fields=["precio_unitario"])

        assert pedido.total == Decimal("37.00")

    def test_pedido_genera_codigo_unico_al_guardarse(self):
        cajero = Usuario.objects.create_user(username="caja2", password="12345678", rol="CAJERO")
        pedido = Pedido.objects.create(
            registrado_por=cajero, modalidad_entrega=Pedido.ModalidadEntrega.RECOJO
        )
        assert pedido.codigo.startswith("PC-")
        assert len(pedido.codigo) == 11


@pytest.mark.django_db
class TestReglaDePrioridad:
    @pytest.mark.parametrize(
        "modalidad, prioridad_esperada",
        [
            (Pedido.ModalidadEntrega.SALON, 1),
            (Pedido.ModalidadEntrega.DELIVERY, 2),
            (Pedido.ModalidadEntrega.RECOJO, 3),
        ],
    )
    def test_prioridad_segun_modalidad(self, modalidad, prioridad_esperada):
        cajero = Usuario.objects.create_user(username="caja3", password="12345678", rol="CAJERO")
        pedido = Pedido.objects.create(registrado_por=cajero, modalidad_entrega=modalidad)
        assert pedido.prioridad == prioridad_esperada


class TestValidacionStockDeProducto:
    def test_hay_stock_suficiente_true(self):
        producto = Producto(nombre="Gaseosa 1.5L", precio_unitario=8, stock_disponible=5)
        assert producto.hay_stock_suficiente(3) is True

    def test_hay_stock_suficiente_false_por_cantidad(self):
        producto = Producto(nombre="Gaseosa 1.5L", precio_unitario=8, stock_disponible=2)
        assert producto.hay_stock_suficiente(3) is False

    def test_hay_stock_suficiente_si_la_cantidad_es_igual_al_stock(self):
        producto = Producto(nombre="Gaseosa 1.5L", precio_unitario=8, stock_disponible=5)
        assert producto.hay_stock_suficiente(5) is True

    def test_hay_stock_suficiente_false_por_producto_inactivo(self):
        producto = Producto(
            nombre="Papas fritas", precio_unitario=10, stock_disponible=20, activo=False
        )
        assert producto.hay_stock_suficiente(1) is False
