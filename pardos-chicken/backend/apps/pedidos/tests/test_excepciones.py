"""Pruebas del manejo de errores al registrar pedidos (Capítulo 5.5)."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Pedido, Producto
from apps.usuarios.models import Usuario


@pytest.mark.django_db
def test_producto_agotado_rechaza_el_pedido_sin_descontar_stock():
    cajero = Usuario.objects.create_user(username="caja_agotado", password="12345678")
    producto = Producto.objects.create(
        nombre="Pollo entero", precio_unitario=65, stock_disponible=0
    )
    cliente_api = APIClient()
    cliente_api.force_authenticate(user=cajero)

    respuesta = cliente_api.post(
        "/api/pedidos/",
        {
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )

    assert respuesta.status_code == 400
    assert "Stock insuficiente para: Pollo entero" in str(respuesta.data["detalles"])
    assert Pedido.objects.count() == 0
    producto.refresh_from_db()
    assert producto.stock_disponible == 0
