"""Las acciones de la API impiden retrocesos y cambios directos (Capítulo 6.3)."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Pedido
from apps.usuarios.models import Usuario


@pytest.fixture
def api_cocina():
    usuario = Usuario.objects.create_user(
        username="cocina_defensiva", password="12345678", rol=Usuario.Rol.COCINERO
    )
    api = APIClient()
    api.force_authenticate(user=usuario)
    return api, usuario


@pytest.mark.django_db
def test_pedido_listo_no_puede_volver_a_la_cola(api_cocina):
    api, usuario = api_cocina
    pedido = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.LISTO,
    )

    respuesta = api.post(f"/api/pedidos/{pedido.id}/enviar-a-produccion/")

    assert respuesta.status_code == 400
    assert "Transición inválida" in str(respuesta.data["estado"])
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.LISTO


@pytest.mark.django_db
def test_no_se_puede_saltar_de_cola_a_listo(api_cocina):
    api, usuario = api_cocina
    pedido = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_COLA,
    )

    respuesta = api.post(f"/api/pedidos/{pedido.id}/marcar-listo/")

    assert respuesta.status_code == 400
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.EN_COLA
    assert pedido.hora_fin_preparacion is None


@pytest.mark.django_db
def test_no_se_puede_cambiar_estado_con_patch_ni_put(api_cocina):
    api, usuario = api_cocina
    pedido = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.LISTO,
    )
    ruta = f"/api/pedidos/{pedido.id}/"

    assert api.patch(ruta, {"estado": Pedido.Estado.EN_COLA}, format="json").status_code == 405
    assert api.put(ruta, {"estado": Pedido.Estado.EN_COLA}, format="json").status_code == 405
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.LISTO
