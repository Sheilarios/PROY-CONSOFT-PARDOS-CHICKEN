"""Integración entre caja, datos de la vista de cocina e inventario (6.5)."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import Insumo, Pedido, Producto, RecetaInsumo
from apps.usuarios.models import Usuario


@pytest.fixture
def clientes_api():
    cajero = Usuario.objects.create_user(
        username="caja_integracion", password="12345678", rol=Usuario.Rol.CAJERO
    )
    cocinero = Usuario.objects.create_user(
        username="cocina_integracion", password="12345678", rol=Usuario.Rol.COCINERO
    )
    api_caja = APIClient()
    api_caja.force_authenticate(user=cajero)
    api_cocina = APIClient()
    api_cocina.force_authenticate(user=cocinero)
    return api_caja, api_cocina


@pytest.mark.django_db
def test_cambios_de_estado_actualizan_listas_de_cocina_y_consumen_insumos(clientes_api):
    api_caja, api_cocina = clientes_api
    producto = Producto.objects.create(
        nombre="Pollo a la brasa", precio_unitario=20, stock_disponible=5
    )
    insumo = Insumo.objects.create(nombre="Pollo crudo", stock_disponible=6)
    RecetaInsumo.objects.create(producto=producto, insumo=insumo, cantidad=2)

    registro = api_caja.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Ana",
            "modalidad_entrega": "SALON",
            "detalles": [{"producto_id": producto.id, "cantidad": 2}],
        },
        format="json",
    )
    assert registro.status_code == 201
    pedido_id = registro.data["id"]
    ruta_pedido = f"/api/pedidos/{pedido_id}/"
    producto.refresh_from_db()
    insumo.refresh_from_db()
    assert producto.stock_disponible == 3
    assert insumo.stock_disponible == 6
    assert api_cocina.get("/api/pedidos/cola-produccion/").data == []

    envio = api_caja.post(ruta_pedido + "enviar-a-produccion/")
    assert envio.status_code == 200
    cola = api_cocina.get("/api/pedidos/cola-produccion/")
    assert cola.status_code == 200
    assert [p["id"] for p in cola.data] == [pedido_id]
    assert cola.data[0]["estado"] == Pedido.Estado.EN_COLA
    assert cola.data[0]["detalles"][0]["producto_nombre"] == producto.nombre
    assert api_cocina.get("/api/pedidos/seguimiento-produccion/").data == []

    inicio = api_cocina.post(ruta_pedido + "iniciar-preparacion/")
    assert inicio.status_code == 200
    assert api_cocina.get("/api/pedidos/cola-produccion/").data == []
    seguimiento = api_cocina.get("/api/pedidos/seguimiento-produccion/")
    assert [p["id"] for p in seguimiento.data] == [pedido_id]
    assert seguimiento.data[0]["estado"] == Pedido.Estado.EN_PREPARACION
    assert seguimiento.data[0]["hora_inicio_preparacion"] is not None
    producto.refresh_from_db()
    insumo.refresh_from_db()
    assert producto.stock_disponible == 3
    assert insumo.stock_disponible == 2

    listo = api_cocina.post(ruta_pedido + "marcar-listo/")
    assert listo.status_code == 200
    seguimiento = api_cocina.get("/api/pedidos/seguimiento-produccion/")
    assert seguimiento.data[0]["estado"] == Pedido.Estado.LISTO
    assert seguimiento.data[0]["hora_fin_preparacion"] is not None
    insumo.refresh_from_db()
    assert insumo.stock_disponible == 2


@pytest.mark.django_db
def test_falta_de_insumos_mantiene_pedido_en_vista_de_cola_y_stock_intacto(clientes_api):
    api_caja, api_cocina = clientes_api
    producto = Producto.objects.create(
        nombre="Papas fritas", precio_unitario=12, stock_disponible=3
    )
    insumo = Insumo.objects.create(nombre="Papas", stock_disponible=1)
    RecetaInsumo.objects.create(producto=producto, insumo=insumo, cantidad=2)
    registro = api_caja.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Luis",
            "modalidad_entrega": "RECOJO",
            "detalles": [{"producto_id": producto.id, "cantidad": 1}],
        },
        format="json",
    )
    assert registro.status_code == 201
    pedido_id = registro.data["id"]
    assert api_caja.post(f"/api/pedidos/{pedido_id}/enviar-a-produccion/").status_code == 200

    inicio = api_cocina.post(f"/api/pedidos/{pedido_id}/iniciar-preparacion/")

    assert inicio.status_code == 400
    assert "Papas" in str(inicio.data["insumos"])
    cola = api_cocina.get("/api/pedidos/cola-produccion/")
    assert [p["id"] for p in cola.data] == [pedido_id]
    assert cola.data[0]["estado"] == Pedido.Estado.EN_COLA
    assert api_cocina.get("/api/pedidos/seguimiento-produccion/").data == []
    producto.refresh_from_db()
    insumo.refresh_from_db()
    assert producto.stock_disponible == 2
    assert insumo.stock_disponible == 1
