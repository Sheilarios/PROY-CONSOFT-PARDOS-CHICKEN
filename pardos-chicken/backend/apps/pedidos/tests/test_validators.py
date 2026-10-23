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


class TestValidarStockDeDetalles:
    def test_stock_suficiente_para_todos_los_productos(self):
        pollo = Producto(nombre="Pollo entero", precio_unitario=65, stock_disponible=5)
        papas = Producto(nombre="Papas", precio_unitario=12, stock_disponible=10)

        validators.validar_stock_de_detalles([(pollo, 5), (papas, 3)])

        assert pollo.stock_disponible == 5
        assert papas.stock_disponible == 10

    def test_producto_agotado_lanza_error_con_nombre_del_producto(self):
        agotado = Producto(nombre="Alitas BBQ", precio_unitario=20, stock_disponible=0)
        with pytest.raises(ValidationError) as excinfo:
            validators.validar_stock_de_detalles([(agotado, 1)])

        assert "Alitas BBQ" in str(excinfo.value)

    def test_un_producto_sin_stock_rechaza_todo_el_pedido_sin_descontar(self):
        pollo = Producto(nombre="Pollo", precio_unitario=65, stock_disponible=5)
        papas = Producto(nombre="Papas", precio_unitario=12, stock_disponible=2)

        with pytest.raises(ValidationError) as excinfo:
            validators.validar_stock_de_detalles([(pollo, 2), (papas, 3)])

        assert "Papas" in str(excinfo.value)
        assert pollo.stock_disponible == 5
        assert papas.stock_disponible == 2


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

    def test_repetir_el_mismo_estado_lanza_error(self):
        with pytest.raises(ValidationError):
            validators.validar_transicion_estado(
                Pedido.Estado.EN_COLA, Pedido.Estado.EN_COLA, Pedido.ESTADOS_ORDEN
            )

    def test_estado_desconocido_lanza_error(self):
        with pytest.raises(ValidationError):
            validators.validar_transicion_estado(
                Pedido.Estado.EN_COLA, "DESCONOCIDO", Pedido.ESTADOS_ORDEN
            )
