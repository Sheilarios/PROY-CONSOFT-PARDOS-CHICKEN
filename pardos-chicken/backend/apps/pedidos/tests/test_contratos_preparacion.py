"""Precondiciones y poscondiciones del inicio de preparación (Capítulo 6.4)."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import DetallePedido, Insumo, Pedido, Producto, RecetaInsumo
from apps.usuarios.models import Usuario


@pytest.fixture
def api_cocina():
    usuario = Usuario.objects.create_user(username="cocina_contratos", password="12345678")
    api = APIClient()
    api.force_authenticate(user=usuario)
    return api, usuario


@pytest.mark.django_db
def test_inicio_consume_insumos_compartidos_una_vez_sin_descontar_producto_dos_veces(
    api_cocina,
):
    api, _ = api_cocina
    cuarto = Producto.objects.create(
        nombre="1/4 Pollo", precio_unitario=20, stock_disponible=10
    )
    entero = Producto.objects.create(
        nombre="Pollo entero", precio_unitario=65, stock_disponible=5
    )
    pollo_crudo = Insumo.objects.create(
        nombre="Pollo crudo", unidad="cuartos", stock_disponible=6
    )
    RecetaInsumo.objects.create(producto=cuarto, insumo=pollo_crudo, cantidad=1)
    RecetaInsumo.objects.create(producto=entero, insumo=pollo_crudo, cantidad=4)

    registro = api.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Ana",
            "modalidad_entrega": "SALON",
            "detalles": [
                {"producto_id": cuarto.id, "cantidad": 2},
                {"producto_id": entero.id, "cantidad": 1},
            ],
        },
        format="json",
    )
    assert registro.status_code == 201
    pedido_id = registro.data["id"]
    cuarto.refresh_from_db()
    entero.refresh_from_db()
    pollo_crudo.refresh_from_db()
    assert (cuarto.stock_disponible, entero.stock_disponible) == (8, 4)
    assert pollo_crudo.stock_disponible == 6
    assert api.post(f"/api/pedidos/{pedido_id}/enviar-a-produccion/").status_code == 200

    inicio = api.post(f"/api/pedidos/{pedido_id}/iniciar-preparacion/")

    assert inicio.status_code == 200
    assert inicio.data["estado"] == Pedido.Estado.EN_PREPARACION
    assert inicio.data["hora_inicio_preparacion"] is not None
    pollo_crudo.refresh_from_db()
    cuarto.refresh_from_db()
    entero.refresh_from_db()
    assert pollo_crudo.stock_disponible == 0
    assert (cuarto.stock_disponible, entero.stock_disponible) == (8, 4)

    repetido = api.post(f"/api/pedidos/{pedido_id}/iniciar-preparacion/")
    assert repetido.status_code == 400
    pollo_crudo.refresh_from_db()
    assert pollo_crudo.stock_disponible == 0


@pytest.mark.django_db
def test_sin_stock_de_un_insumo_no_cambia_pedido_ni_ningun_inventario(api_cocina):
    api, usuario = api_cocina
    producto = Producto.objects.create(
        nombre="Pollo con papas", precio_unitario=30, stock_disponible=4
    )
    pollo = Insumo.objects.create(nombre="Pollo crudo", stock_disponible=2)
    papas = Insumo.objects.create(nombre="Papas", stock_disponible=1)
    RecetaInsumo.objects.create(producto=producto, insumo=pollo, cantidad=1)
    RecetaInsumo.objects.create(producto=producto, insumo=papas, cantidad=1)
    pedido = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_COLA,
    )
    DetallePedido.objects.create(
        pedido=pedido, producto=producto, cantidad=2, precio_unitario_congelado=30
    )

    inicio = api.post(f"/api/pedidos/{pedido.id}/iniciar-preparacion/")

    assert inicio.status_code == 400
    assert "Papas" in str(inicio.data["insumos"])
    pedido.refresh_from_db()
    pollo.refresh_from_db()
    papas.refresh_from_db()
    assert pedido.estado == Pedido.Estado.EN_COLA
    assert pedido.hora_inicio_preparacion is None
    assert (pollo.stock_disponible, papas.stock_disponible) == (2, 1)


@pytest.mark.django_db
def test_sin_receta_no_se_inicia_preparacion(api_cocina):
    api, usuario = api_cocina
    producto = Producto.objects.create(nombre="Papas", precio_unitario=12)
    pedido = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.RECOJO,
        estado=Pedido.Estado.EN_COLA,
    )
    DetallePedido.objects.create(
        pedido=pedido, producto=producto, cantidad=1, precio_unitario_congelado=12
    )

    inicio = api.post(f"/api/pedidos/{pedido.id}/iniciar-preparacion/")

    assert inicio.status_code == 400
    assert "Configura los insumos" in str(inicio.data["insumos"])
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.EN_COLA
    assert pedido.hora_inicio_preparacion is None
