import pytest
from rest_framework.test import APIClient

from apps.usuarios.models import Usuario


@pytest.mark.django_db
def test_perfil_devuelve_rol_y_nombre_del_usuario_autenticado():
    usuario = Usuario.objects.create_user(
        username="cocina1",
        password="12345678",
        first_name="María",
        rol=Usuario.Rol.COCINERO,
    )
    api = APIClient()
    api.force_authenticate(user=usuario)

    respuesta = api.get("/api/usuarios/me/")

    assert respuesta.status_code == 200
    assert respuesta.data == {
        "username": "cocina1",
        "nombre": "María",
        "rol": Usuario.Rol.COCINERO,
    }


@pytest.mark.django_db
def test_superusuario_usa_menu_de_administrador():
    usuario = Usuario.objects.create_superuser(username="admin1", password="12345678")
    api = APIClient()
    api.force_authenticate(user=usuario)

    respuesta = api.get("/api/usuarios/me/")

    assert respuesta.status_code == 200
    assert respuesta.data["rol"] == Usuario.Rol.ADMINISTRADOR
