"""Registro, búsqueda y uso de clientes en pedidos (Capítulo 5.5)."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Cliente, Pedido, Producto
from apps.usuarios.models import Usuario


@pytest.fixture
def cliente_api():
    cajero = Usuario.objects.create_user(username="caja_clientes", password="12345678")
    api = APIClient()
    api.force_authenticate(user=cajero)
    return api


@pytest.mark.django_db
def test_registrar_cliente(cliente_api):
    registro = cliente_api.post(
        "/api/pedidos/clientes/",
        {"nombre": "Ana Pérez", "telefono": "987654321"},
        format="json",
    )
    assert registro.status_code == 201
    assert registro.data["nombre"] == "Ana Pérez"
    assert Cliente.objects.filter(telefono="987654321").exists()


@pytest.mark.django_db
def test_buscar_por_nombre_muestra_coincidencias_y_telefonos(cliente_api):
    Cliente.objects.create(nombre="Ana Pérez", telefono="987654321")
    Cliente.objects.create(nombre="Ana Torres", telefono="912345678")
    Cliente.objects.create(nombre="Luis Díaz", telefono="923456789")

    respuesta = cliente_api.get(
        "/api/pedidos/clientes/buscar-por-nombre/", {"nombre": "ana"}
    )

    assert respuesta.status_code == 200
    assert len(respuesta.data) == 2
    assert {cliente["telefono"] for cliente in respuesta.data} == {
        "987654321", "912345678"
    }


@pytest.mark.django_db
def test_buscar_por_nombre_incluye_pedidos_anteriores_sin_cliente_registrado(cliente_api):
    cajero = Usuario.objects.get(username="caja_clientes")
    for _ in range(2):
        Pedido.objects.create(
            registrado_por=cajero,
            modalidad_entrega=Pedido.ModalidadEntrega.SALON,
            cliente_nombre="Carmen",
            cliente_telefono="987654321",
        )

    respuesta = cliente_api.get(
        "/api/pedidos/clientes/buscar-por-nombre/", {"nombre": "Carmen"}
    )

    assert respuesta.status_code == 200
    assert respuesta.data == [
        {
            "id": None,
            "nombre": "Carmen",
            "telefono": "987654321",
            "origen": "historial",
        }
    ]


@pytest.mark.django_db
def test_buscar_por_nombre_no_duplica_cliente_presente_en_historial(cliente_api):
    cajero = Usuario.objects.get(username="caja_clientes")
    cliente = Cliente.objects.create(nombre="Carmen", telefono="987654321")
    Pedido.objects.create(
        registrado_por=cajero,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        cliente_nombre="Carmen",
        cliente_telefono="987654321",
    )

    respuesta = cliente_api.get(
        "/api/pedidos/clientes/buscar-por-nombre/", {"nombre": "Carmen"}
    )

    assert respuesta.status_code == 200
    assert len(respuesta.data) == 1
    assert respuesta.data[0]["id"] == cliente.id
    assert respuesta.data[0]["origen"] == "registro"


@pytest.mark.django_db
def test_buscar_por_nombre_sin_coincidencias_devuelve_404(cliente_api):
    respuesta = cliente_api.get(
        "/api/pedidos/clientes/buscar-por-nombre/", {"nombre": "Desconocido"}
    )

    assert respuesta.status_code == 404
    assert str(respuesta.data["detail"]) == "Cliente no encontrado."


@pytest.mark.django_db
def test_registrar_cliente_con_telefono_invalido_devuelve_400(cliente_api):
    respuesta = cliente_api.post(
        "/api/pedidos/clientes/",
        {"nombre": "Ana Pérez", "telefono": "12345"},
        format="json",
    )

    assert respuesta.status_code == 400
    assert "9 dígitos" in str(respuesta.data["telefono"])
    assert Cliente.objects.count() == 0


@pytest.mark.django_db
def test_pedido_usa_los_datos_del_cliente_seleccionado(cliente_api):
    cliente = Cliente.objects.create(nombre="Ana Pérez", telefono="987654321")
    producto = Producto.objects.create(nombre="Pollo", precio_unitario=65, stock_disponible=2)

    respuesta = cliente_api.post(
        "/api/pedidos/",
        {
            "cliente_id": cliente.id,
            "cliente_nombre": "Otro nombre",
            "cliente_telefono": "912345678",
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )

    assert respuesta.status_code == 201
    pedido = Pedido.objects.get(pk=respuesta.data["id"])
    assert pedido.cliente == cliente
    assert pedido.cliente_nombre == "Ana Pérez"
    assert pedido.cliente_telefono == "987654321"


@pytest.mark.django_db
def test_pedido_registra_cliente_nuevo_junto_con_su_producto(cliente_api):
    producto = Producto.objects.create(nombre="Pollo", precio_unitario=65, stock_disponible=2)

    respuesta = cliente_api.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Carmen",
            "cliente_telefono": "987654321",
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )

    assert respuesta.status_code == 201
    cliente = Cliente.objects.get(telefono="987654321")
    pedido = Pedido.objects.get(pk=respuesta.data["id"])
    assert pedido.cliente == cliente
    assert pedido.detalles.count() == 1
    assert respuesta.data["total"] == "65.00"


@pytest.mark.django_db
def test_pedido_reutiliza_cliente_previamente_registrado(cliente_api):
    cliente = Cliente.objects.create(nombre="Carmen", telefono="987654321")
    producto = Producto.objects.create(nombre="Pollo", precio_unitario=65, stock_disponible=2)

    respuesta = cliente_api.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Carmen",
            "cliente_telefono": "987654321",
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )

    assert respuesta.status_code == 201
    assert Cliente.objects.count() == 1
    assert Pedido.objects.get(pk=respuesta.data["id"]).cliente == cliente


@pytest.mark.django_db
def test_pedido_sin_productos_no_registra_cliente_ni_pedido(cliente_api):
    respuesta = cliente_api.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Carmen",
            "cliente_telefono": "987654321",
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "detalles": [],
        },
        format="json",
    )

    assert respuesta.status_code == 400
    assert "detalles" in respuesta.data
    assert Cliente.objects.count() == 0
    assert Pedido.objects.count() == 0


@pytest.mark.django_db
def test_pedido_sin_stock_no_registra_cliente(cliente_api):
    producto = Producto.objects.create(nombre="Pollo", precio_unitario=65, stock_disponible=0)

    respuesta = cliente_api.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Carmen",
            "cliente_telefono": "987654321",
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )

    assert respuesta.status_code == 400
    assert Cliente.objects.count() == 0
    assert Pedido.objects.count() == 0


@pytest.mark.django_db
def test_pedido_no_vincula_telefono_de_otro_cliente(cliente_api):
    Cliente.objects.create(nombre="Ana", telefono="987654321")
    producto = Producto.objects.create(nombre="Pollo", precio_unitario=65, stock_disponible=2)

    respuesta = cliente_api.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Carmen",
            "cliente_telefono": "987654321",
            "modalidad_entrega": Pedido.ModalidadEntrega.SALON,
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )

    assert respuesta.status_code == 400
    assert "cliente_telefono" in respuesta.data
    assert Cliente.objects.count() == 1
    assert Pedido.objects.count() == 0
