"""Solo Cocina puede ejecutar las transiciones de preparación."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Pedido
from apps.usuarios.models import Usuario


@pytest.mark.django_db
@pytest.mark.parametrize(
    "rol,es_superusuario",
    [
        (Usuario.Rol.ADMINISTRADOR, False),
        (Usuario.Rol.CAJERO, False),
        (Usuario.Rol.DESPACHADOR, False),
        (Usuario.Rol.COCINERO, True),
    ],
)
@pytest.mark.parametrize(
    "estado,accion",
    [
        (Pedido.Estado.EN_COLA, "iniciar-preparacion"),
        (Pedido.Estado.EN_PREPARACION, "marcar-listo"),
    ],
)
def test_otro_rol_no_puede_cambiar_estado_de_cocina(
    rol, es_superusuario, estado, accion
):
    usuario = Usuario.objects.create_user(
        username="usuario_sin_permiso",
        password="12345678",
        rol=rol,
        is_superuser=es_superusuario,
    )
    pedido = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=estado,
    )
    api = APIClient()
    api.force_authenticate(user=usuario)

    respuesta = api.post(f"/api/pedidos/{pedido.id}/{accion}/")

    assert respuesta.status_code == 403
    pedido.refresh_from_db()
    assert pedido.estado == estado
    assert pedido.hora_inicio_preparacion is None
    assert pedido.hora_fin_preparacion is None


@pytest.mark.django_db
def test_administrador_puede_consultar_produccion():
    administrador = Usuario.objects.create_user(
        username="admin_consulta", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    Pedido.objects.create(
        registrado_por=administrador,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_COLA,
    )
    Pedido.objects.create(
        registrado_por=administrador,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_PREPARACION,
    )
    api = APIClient()
    api.force_authenticate(user=administrador)

    cola = api.get("/api/pedidos/cola-produccion/")
    seguimiento = api.get("/api/pedidos/seguimiento-produccion/")

    assert cola.status_code == 200
    assert seguimiento.status_code == 200
    assert len(cola.data) == 1
    assert len(seguimiento.data) == 1
