"""El catálogo visible en caja y administración usa los mismos productos."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Producto
from apps.usuarios.models import Usuario


@pytest.mark.django_db
def test_administrador_agrega_producto_al_catalogo_de_caja():
    administrador = Usuario.objects.create_user(
        username="admin_nuevo", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    cajero = Usuario.objects.create_user(
        username="caja_nuevo", password="12345678", rol=Usuario.Rol.CAJERO
    )
    api_admin = APIClient()
    api_admin.force_authenticate(user=administrador)
    api_caja = APIClient()
    api_caja.force_authenticate(user=cajero)

    respuesta = api_admin.post("/api/pedidos/productos/", {
        "nombre": "Ensalada adicional",
        "precio_unitario": "6.00",
        "stock_disponible": 12,
    }, format="json")

    assert respuesta.status_code == 201
    producto = Producto.objects.get(pk=respuesta.data["id"])
    assert producto.activo
    assert producto.precio_unitario == Decimal("6.00")
    assert producto.stock_disponible == 12
    assert producto.tiempo_preparacion_minutos == 10
    catalogo_caja = api_caja.get("/api/pedidos/productos/")
    assert [item["nombre"] for item in catalogo_caja.data] == ["Ensalada adicional"]


@pytest.mark.django_db
def test_cajero_no_puede_agregar_producto():
    cajero = Usuario.objects.create_user(
        username="caja_sin_alta", password="12345678", rol=Usuario.Rol.CAJERO
    )
    api = APIClient()
    api.force_authenticate(user=cajero)

    respuesta = api.post("/api/pedidos/productos/", {
        "nombre": "Salsa extra", "precio_unitario": "3.00", "stock_disponible": 10,
    }, format="json")

    assert respuesta.status_code == 403
    assert Producto.objects.count() == 0


@pytest.mark.django_db
def test_no_se_agrega_producto_duplicado_o_sin_precio_valido():
    administrador = Usuario.objects.create_user(
        username="admin_validacion", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    Producto.objects.create(nombre="Gaseosa", precio_unitario=Decimal("8.00"))
    api = APIClient()
    api.force_authenticate(user=administrador)

    assert api.post("/api/pedidos/productos/", {
        "nombre": " gaseosa ", "precio_unitario": "9.00", "stock_disponible": 1,
    }, format="json").status_code == 400
    assert api.post("/api/pedidos/productos/", {
        "nombre": "Ají", "precio_unitario": "0.00", "stock_disponible": 1,
    }, format="json").status_code == 400
    assert Producto.objects.count() == 1


@pytest.mark.django_db
def test_administrador_edita_producto_y_caja_ve_el_mismo_precio_y_stock():
    administrador = Usuario.objects.create_user(
        username="admin_catalogo", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    cajero = Usuario.objects.create_user(
        username="caja_catalogo", password="12345678", rol=Usuario.Rol.CAJERO
    )
    producto = Producto.objects.create(
        nombre="Gaseosa", precio_unitario=Decimal("8.00"), stock_disponible=5
    )
    api_admin = APIClient()
    api_admin.force_authenticate(user=administrador)
    api_caja = APIClient()
    api_caja.force_authenticate(user=cajero)

    respuesta = api_admin.put(f"/api/pedidos/productos/{producto.id}/", {
        "nombre": "Gaseosa 1.5L",
        "precio_unitario": "9.00",
        "stock_disponible": 8,
        "stock_anterior": 5,
    }, format="json")

    assert respuesta.status_code == 200
    assert respuesta.data["nombre"] == "Gaseosa 1.5L"
    producto.refresh_from_db()
    assert producto.precio_unitario == Decimal("9.00")
    assert producto.stock_disponible == 8
    catalogo_caja = api_caja.get("/api/pedidos/productos/")
    assert catalogo_caja.status_code == 200
    assert catalogo_caja.data[0]["precio_unitario"] == "9.00"
    assert catalogo_caja.data[0]["stock_disponible"] == 8


@pytest.mark.django_db
def test_cajero_no_puede_editar_catalogo():
    cajero = Usuario.objects.create_user(
        username="caja_sin_edicion", password="12345678", rol=Usuario.Rol.CAJERO
    )
    producto = Producto.objects.create(
        nombre="Papas", precio_unitario=Decimal("12.00"), stock_disponible=5
    )
    api = APIClient()
    api.force_authenticate(user=cajero)

    respuesta = api.put(f"/api/pedidos/productos/{producto.id}/", {
        "precio_unitario": "1.00", "stock_disponible": 50, "stock_anterior": 5,
    }, format="json")

    assert respuesta.status_code == 403
    producto.refresh_from_db()
    assert producto.stock_disponible == 5
    assert producto.precio_unitario == Decimal("12.00")


@pytest.mark.django_db
def test_edicion_rechaza_stock_desactualizado_y_precio_no_valido():
    administrador = Usuario.objects.create_user(
        username="admin_stock", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    producto = Producto.objects.create(
        nombre="Pollo", precio_unitario=Decimal("20.00"), stock_disponible=4
    )
    api = APIClient()
    api.force_authenticate(user=administrador)
    ruta = f"/api/pedidos/productos/{producto.id}/"

    assert api.put(ruta, {
        "precio_unitario": "21.00", "stock_disponible": 8, "stock_anterior": 5,
    }, format="json").status_code == 400
    assert api.put(ruta, {
        "precio_unitario": "0.00", "stock_disponible": 8, "stock_anterior": 4,
    }, format="json").status_code == 400
    assert api.put(ruta, {
        "precio_unitario": "20.00", "stock_disponible": -1, "stock_anterior": 4,
    }, format="json").status_code == 400
    producto.refresh_from_db()
    assert producto.stock_disponible == 4
    assert producto.precio_unitario == Decimal("20.00")
