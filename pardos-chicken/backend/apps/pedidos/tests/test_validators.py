"""
Pruebas de la programación defensiva del módulo (Capítulo 5.2):
validación de stock, formato de teléfono/dirección y manejo de
excepciones (productos agotados).
"""
import pytest
from rest_framework.exceptions import ValidationError

from apps.pedidos import validators
from apps.pedidos.models import Producto, Pedido


class TestValidarTelefono:
    def test_telefono_vacio_no_lanza_error(self):
        validators.validar_telefono("")  # no debe lanzar excepción

    def test_telefono_valido_no_lanza_error(self):
        validators.validar_telefono("987654321")

    def test_telefono_con_formato_invalido_lanza_error(self):
        with pytest.raises(ValidationError):
            validators.validar_telefono("12345")


class TestValidarDireccionDelivery:
    def test_delivery_sin_direccion_lanza_error(self):
        with pytest.raises(ValidationError):
            validators.validar_direccion_delivery("DELIVERY", "")

    def test_salon_sin_direccion_no_lanza_error(self):
        validators.validar_direccion_delivery("SALON", "")


@pytest.mark.django_db
class TestValidarStockDeDetalles:
    def test_stock_suficiente_para_todos_los_productos(self):
        p1 = Producto.objects.create(nombre="Pollo entero", precio_unitario=65, stock_disponible=5)
        p2 = Producto.objects.create(nombre="Papas", precio_unitario=12, stock_disponible=10)
        validators.validar_stock_de_detalles([(p1, 2), (p2, 3)])  # no debe lanzar excepción

    def test_producto_agotado_lanza_error_con_nombre_del_producto(self):
        agotado = Producto.objects.create(
            nombre="Alitas BBQ", precio_unitario=20, stock_disponible=0
        )
        with pytest.raises(ValidationError) as excinfo:
            validators.validar_stock_de_detalles([(agotado, 1)])

        assert "Alitas BBQ" in str(excinfo.value)


class TestValidarTransicionEstado:
    def test_transicion_secuencial_valida(self):
        validators.validar_transicion_estado(
            Pedido.Estado.REGISTRADO, Pedido.Estado.EN_COLA, Pedido.ESTADOS_ORDEN
        )

    def test_transicion_que_salta_pasos_lanza_error(self):
        with pytest.raises(ValidationError):
            validators.validar_transicion_estado(
                Pedido.Estado.REGISTRADO, Pedido.Estado.LISTO, Pedido.ESTADOS_ORDEN
            )

    def test_transicion_hacia_atras_lanza_error(self):
        with pytest.raises(ValidationError):
            validators.validar_transicion_estado(
                Pedido.Estado.LISTO, Pedido.Estado.EN_COLA, Pedido.ESTADOS_ORDEN
            )
