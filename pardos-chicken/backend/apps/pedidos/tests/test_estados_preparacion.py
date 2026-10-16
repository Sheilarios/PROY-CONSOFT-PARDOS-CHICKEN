"""Avance de pedidos por los estados de cocina (Capítulo 6.2)."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Pedido
from apps.usuarios.models import Usuario


@pytest.mark.django_db
def test_pedido_pasa_de_cola_a_preparacion_y_luego_a_listo():
    usuario = Usuario.objects.create_user(username="cocina_estados", password="12345678")
    api = APIClient()
    api.force_authenticate(user=usuario)
    pedido = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_COLA,
    )

    inicio = api.post(f"/api/pedidos/{pedido.id}/iniciar-preparacion/")

    assert inicio.status_code == 200
    assert inicio.data["estado"] == Pedido.Estado.EN_PREPARACION
    pedido.refresh_from_db()
    assert pedido.hora_inicio_preparacion is not None
    assert pedido.hora_fin_preparacion is None
    assert api.get("/api/pedidos/cola-produccion/").data == []
    seguimiento = api.get("/api/pedidos/seguimiento-produccion/")
    assert [item["id"] for item in seguimiento.data] == [pedido.id]

    fin = api.post(f"/api/pedidos/{pedido.id}/marcar-listo/")

    assert fin.status_code == 200
    assert fin.data["estado"] == Pedido.Estado.LISTO
    pedido.refresh_from_db()
    assert pedido.hora_fin_preparacion is not None
    assert pedido.hora_fin_preparacion >= pedido.hora_inicio_preparacion
    seguimiento = api.get("/api/pedidos/seguimiento-produccion/")
    assert seguimiento.data[0]["estado"] == Pedido.Estado.LISTO
