from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Pedido, Producto
from apps.usuarios.models import Usuario


@pytest.mark.django_db
def test_observaciones_del_pedido_se_guardan_y_se_consultan():
    cajero = Usuario.objects.create_user(username="caja_observaciones", password="12345678")
    producto = Producto.objects.create(
        nombre="Pollo a la brasa", precio_unitario=Decimal("18.50"), stock_disponible=3
    )
    api = APIClient()
    api.force_authenticate(user=cajero)

    respuesta = api.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Ana",
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "observaciones": "Sin ají y con papas bien doradas",
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )

    assert respuesta.status_code == 201
    assert respuesta.data["observaciones"] == "Sin ají y con papas bien doradas"
    detalle = api.get(f"/api/pedidos/{respuesta.data['id']}/")
    assert detalle.status_code == 200
    assert detalle.data["observaciones"] == "Sin ají y con papas bien doradas"
