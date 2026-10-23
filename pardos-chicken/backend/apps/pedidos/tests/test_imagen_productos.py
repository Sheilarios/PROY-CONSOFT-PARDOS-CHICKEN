"""Carga y consulta de imágenes del catálogo."""

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.pedidos.models import Producto
from apps.usuarios.models import Usuario


def imagen_de_prueba(formato="PNG", nombre="producto.png"):
    datos = BytesIO()
    Image.new("RGB", (8, 8), "orange").save(datos, format=formato)
    tipo = "image/png" if formato == "PNG" else "image/jpeg"
    return SimpleUploadedFile(nombre, datos.getvalue(), content_type=tipo)


@pytest.fixture
def administrador_api():
    usuario = Usuario.objects.create_user(
        username="admin_imagen", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    api = APIClient()
    api.force_authenticate(user=usuario)
    return api


@pytest.mark.django_db
def test_agregar_producto_con_png_y_ver_imagen_en_catalogo(administrador_api, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        respuesta = administrador_api.post("/api/pedidos/productos/", {
            "nombre": "Ensalada",
            "precio_unitario": "8.00",
            "stock_disponible": 4,
            "imagen": imagen_de_prueba(),
        }, format="multipart")

        assert respuesta.status_code == 201
        producto = Producto.objects.get(pk=respuesta.data["id"])
        assert producto.imagen.name.startswith("productos/")
        assert producto.imagen.path.endswith(".png")
        assert (tmp_path / producto.imagen.name).is_file()
        catalogo = administrador_api.get("/api/pedidos/productos/")
        assert catalogo.data[0]["imagen"].endswith(producto.imagen.url)


@pytest.mark.django_db
def test_editar_producto_sin_nueva_imagen_conserva_la_actual(administrador_api, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        creado = administrador_api.post("/api/pedidos/productos/", {
            "nombre": "Papas",
            "precio_unitario": "12.00",
            "stock_disponible": 5,
            "imagen": imagen_de_prueba(formato="JPEG", nombre="papas.jpg"),
        }, format="multipart")
        assert creado.status_code == 201
        producto = Producto.objects.get(pk=creado.data["id"])
        imagen_anterior = producto.imagen.name

        editado = administrador_api.put(f"/api/pedidos/productos/{producto.id}/", {
            "nombre": "Papas fritas",
            "precio_unitario": "13.00",
            "stock_disponible": 5,
            "stock_anterior": 5,
        }, format="multipart")

        assert editado.status_code == 200
        producto.refresh_from_db()
        assert producto.imagen.name == imagen_anterior
        assert editado.data["imagen"].endswith(producto.imagen.url)

        reemplazo = administrador_api.put(f"/api/pedidos/productos/{producto.id}/", {
            "stock_disponible": 5,
            "stock_anterior": 5,
            "imagen": imagen_de_prueba(nombre="papas-nuevas.png"),
        }, format="multipart")
        assert reemplazo.status_code == 200
        producto.refresh_from_db()
        assert producto.imagen.name != imagen_anterior
        assert producto.imagen.path.endswith(".png")


@pytest.mark.django_db
@pytest.mark.parametrize("formato,nombre", [
    ("GIF", "producto.gif"),
    ("JPEG", "producto.png"),
])
def test_rechaza_formatos_o_extensiones_incorrectas(
    administrador_api, tmp_path, formato, nombre
):
    with override_settings(MEDIA_ROOT=tmp_path):
        respuesta = administrador_api.post("/api/pedidos/productos/", {
            "nombre": "Producto nuevo",
            "precio_unitario": "10.00",
            "stock_disponible": 1,
            "imagen": imagen_de_prueba(formato=formato, nombre=nombre),
        }, format="multipart")

    assert respuesta.status_code == 400
    assert "imagen" in respuesta.data
    assert Producto.objects.count() == 0
