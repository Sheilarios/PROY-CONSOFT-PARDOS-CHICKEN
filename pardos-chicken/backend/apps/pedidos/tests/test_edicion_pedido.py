"""Edición de pedidos antes de comenzar la preparación."""

from decimal import Decimal
from types import SimpleNamespace

import pytest
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.pedidos.models import EdicionPedido, Pedido, Producto
from apps.pedidos.serializers import PedidoRegistroSerializer
from apps.usuarios.models import Usuario


@pytest.fixture
def escenario():
    cajero = Usuario.objects.create_user(
        username="caja_edicion", password="12345678", rol=Usuario.Rol.CAJERO
    )
    administrador = Usuario.objects.create_user(
        username="admin_edicion", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    api_caja = APIClient()
    api_caja.force_authenticate(user=cajero)
    api_admin = APIClient()
    api_admin.force_authenticate(user=administrador)
    pollo = Producto.objects.create(
        nombre="Pollo", precio_unitario=Decimal("20.00"), stock_disponible=10
    )
    papas = Producto.objects.create(
        nombre="Papas adicionales", precio_unitario=Decimal("7.00"), stock_disponible=5
    )
    registro = api_caja.post(
        "/api/pedidos/",
        {
            "cliente_nombre": "Ana",
            "modalidad_entrega": "SALON",
            "detalles": [{"producto_id": pollo.id, "cantidad": 1}],
        },
        format="json",
    )
    assert registro.status_code == 201
    return api_caja, api_admin, cajero, Pedido.objects.get(pk=registro.data["id"]), pollo, papas


def editar(api, pedido, detalles, observaciones=""):
    return api.post(
        f"/api/pedidos/{pedido.id}/editar/",
        {"detalles": detalles, "observaciones": observaciones},
        format="json",
    )


@pytest.mark.django_db
def test_pedido_registrado_se_edita_y_guarda_quien_cuando_y_que_cambio(escenario):
    api, api_admin, cajero, pedido, pollo, papas = escenario
    respuesta = editar(
        api, pedido,
        [{"producto_id": pollo.id, "cantidad": 1}, {"producto_id": papas.id, "cantidad": 1}],
        "Sin salsas",
    )

    assert respuesta.status_code == 200
    assert respuesta.data["estado"] == Pedido.Estado.REGISTRADO
    assert respuesta.data["observaciones"] == "Sin salsas"
    assert Decimal(respuesta.data["total"]) == Decimal("27.00")
    pedido.refresh_from_db()
    assert (pedido.cliente_nombre, pedido.modalidad_entrega) == ("Ana", "SALON")
    assert pedido.detalles.count() == 2
    papas.refresh_from_db()
    assert papas.stock_disponible == 4

    edicion = EdicionPedido.objects.get(pedido=pedido)
    assert edicion.modificado_por == cajero
    assert edicion.fecha is not None
    assert "Se agregó 1 Papas adicionales." in edicion.descripcion
    assert "observaciones" in edicion.descripcion
    assert (edicion.total_anterior, edicion.total_nuevo) == (
        Decimal("20.00"), Decimal("27.00")
    )
    historial = api_admin.get("/api/pedidos/ediciones/")
    assert historial.status_code == 200
    assert historial.data[0]["pedido_codigo"] == pedido.codigo
    assert historial.data[0]["modificado_por_nombre"] == cajero.username


@pytest.mark.django_db
def test_pedido_en_cola_se_edita_sin_cambiar_su_estado(escenario):
    api, _, _, pedido, pollo, papas = escenario
    assert api.post(f"/api/pedidos/{pedido.id}/enviar-a-produccion/").status_code == 200

    respuesta = editar(
        api, pedido,
        [{"producto_id": pollo.id, "cantidad": 1}, {"producto_id": papas.id, "cantidad": 2}],
    )

    assert respuesta.status_code == 200
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.EN_COLA
    cola = api.get("/api/pedidos/cola-produccion/")
    assert [item["id"] for item in cola.data] == [pedido.id]


@pytest.mark.django_db
@pytest.mark.parametrize("estado", [
    Pedido.Estado.EN_PREPARACION, Pedido.Estado.LISTO,
    Pedido.Estado.DESPACHADO, Pedido.Estado.CANCELADO,
])
def test_no_se_editan_pedidos_tras_iniciar_preparacion_o_cancelados(escenario, estado):
    api, _, _, pedido, pollo, papas = escenario
    pedido.estado = estado
    pedido.save(update_fields=["estado"])
    respuesta = editar(api, pedido, [{"producto_id": papas.id, "cantidad": 1}])

    assert respuesta.status_code == 400
    assert "Solo se pueden editar" in str(respuesta.data["estado"])
    pedido.refresh_from_db()
    papas.refresh_from_db()
    assert pedido.estado == estado
    assert pedido.detalles.count() == 1
    assert papas.stock_disponible == 5
    assert not EdicionPedido.objects.filter(pedido=pedido).exists()


@pytest.mark.django_db
def test_stock_insuficiente_no_modifica_pedido_inventario_ni_historial(escenario):
    api, _, _, pedido, pollo, papas = escenario
    papas.stock_disponible = 1
    papas.save(update_fields=["stock_disponible"])
    respuesta = editar(
        api, pedido,
        [{"producto_id": pollo.id, "cantidad": 1}, {"producto_id": papas.id, "cantidad": 2}],
    )

    assert respuesta.status_code == 400
    assert "Papas adicionales" in str(respuesta.data["detalles"])
    assert "Disponible: 1" in str(respuesta.data["detalles"])
    assert pedido.detalles.count() == 1
    papas.refresh_from_db()
    assert papas.stock_disponible == 1
    assert not EdicionPedido.objects.filter(pedido=pedido).exists()


@pytest.mark.django_db
def test_quitar_producto_recalcula_total_y_devuelve_stock(escenario):
    api, _, _, pedido, pollo, papas = escenario
    assert editar(
        api, pedido,
        [{"producto_id": pollo.id, "cantidad": 1}, {"producto_id": papas.id, "cantidad": 2}],
    ).status_code == 200

    respuesta = editar(api, pedido, [{"producto_id": pollo.id, "cantidad": 1}])

    assert respuesta.status_code == 200
    assert Decimal(respuesta.data["total"]) == Decimal("20.00")
    assert pedido.detalles.count() == 1
    papas.refresh_from_db()
    assert papas.stock_disponible == 5
    edicion = EdicionPedido.objects.filter(pedido=pedido).latest("id")
    assert "Se quitó 2 Papas adicionales." in edicion.descripcion
    assert (edicion.total_anterior, edicion.total_nuevo) == (
        Decimal("34.00"), Decimal("20.00")
    )


@pytest.mark.django_db
def test_aumento_valida_solo_el_stock_adicional_y_conserva_precio_original(escenario):
    api, _, _, pedido, pollo, _ = escenario
    pollo.stock_disponible = 2
    pollo.precio_unitario = Decimal("25.00")
    pollo.save(update_fields=["stock_disponible", "precio_unitario"])

    respuesta = editar(api, pedido, [{"producto_id": pollo.id, "cantidad": 3}])

    assert respuesta.status_code == 200
    assert Decimal(respuesta.data["total"]) == Decimal("60.00")
    pollo.refresh_from_db()
    assert pollo.stock_disponible == 0
    assert pedido.detalles.get().precio_unitario_congelado == Decimal("20.00")
    rechazado = editar(api, pedido, [{"producto_id": pollo.id, "cantidad": 4}])
    assert rechazado.status_code == 400
    assert "Disponible: 0" in str(rechazado.data["detalles"])
    assert pedido.detalles.get().cantidad == 3
    assert EdicionPedido.objects.filter(pedido=pedido).count() == 1


@pytest.mark.django_db
def test_producto_repetido_se_agrupa_en_una_sola_linea(escenario):
    api, _, _, pedido, pollo, papas = escenario
    respuesta = editar(api, pedido, [
        {"producto_id": pollo.id, "cantidad": 1},
        {"producto_id": papas.id, "cantidad": 1},
        {"producto_id": papas.id, "cantidad": 2},
    ])
    assert respuesta.status_code == 200
    assert pedido.detalles.filter(producto=papas).count() == 1
    assert pedido.detalles.get(producto=papas).cantidad == 3


@pytest.mark.django_db
@pytest.mark.parametrize("cantidad", [0, -1])
def test_rechaza_cantidades_no_positivas(escenario, cantidad):
    api, _, _, pedido, pollo, _ = escenario
    respuesta = editar(api, pedido, [{"producto_id": pollo.id, "cantidad": cantidad}])
    assert respuesta.status_code == 400
    assert pedido.detalles.get().cantidad == 1
    assert not EdicionPedido.objects.filter(pedido=pedido).exists()


@pytest.mark.django_db
def test_rechaza_pedido_sin_productos(escenario):
    api, _, _, pedido, _, _ = escenario
    assert editar(api, pedido, []).status_code == 400
    assert pedido.detalles.count() == 1


@pytest.mark.django_db
def test_otro_rol_no_puede_editar_y_caja_no_ve_historial_general(escenario):
    api, api_admin, _, pedido, pollo, _ = escenario
    respuesta = editar(api_admin, pedido, [{"producto_id": pollo.id, "cantidad": 2}])
    assert respuesta.status_code == 403
    assert api.get("/api/pedidos/ediciones/").status_code == 403
    assert pedido.detalles.get().cantidad == 1


@pytest.mark.django_db
def test_put_y_patch_generales_siguen_no_disponibles(escenario):
    api, _, _, pedido, pollo, _ = escenario
    ruta = f"/api/pedidos/{pedido.id}/"
    datos = {"estado": Pedido.Estado.EN_COLA, "detalles": [{"producto_id": pollo.id, "cantidad": 2}]}
    assert api.put(ruta, datos, format="json").status_code == 405
    assert api.patch(ruta, datos, format="json").status_code == 405
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.REGISTRADO


@pytest.mark.django_db
def test_cambiar_solo_observaciones_no_mueve_stock(escenario):
    api, _, _, pedido, pollo, _ = escenario
    respuesta = editar(api, pedido, [{"producto_id": pollo.id, "cantidad": 1}], "Sin ají")
    assert respuesta.status_code == 200
    assert respuesta.data["observaciones"] == "Sin ají"
    assert Decimal(respuesta.data["total"]) == Decimal("20.00")
    pollo.refresh_from_db()
    assert pollo.stock_disponible == 9
    assert EdicionPedido.objects.get(pedido=pedido).descripcion == (
        "Se actualizaron las observaciones."
    )


@pytest.mark.django_db
def test_cancelar_despues_de_editar_devuelve_el_stock_actual(escenario):
    api, _, _, pedido, pollo, papas = escenario
    assert editar(api, pedido, [
        {"producto_id": pollo.id, "cantidad": 1},
        {"producto_id": papas.id, "cantidad": 1},
    ]).status_code == 200

    anulacion = api.post("/api/pedidos/incidencias/", {
        "pedido_id": pedido.id,
        "tipo": "CANCELACION",
        "descripcion": "El cliente ya no desea el pedido.",
    }, format="json")

    assert anulacion.status_code == 201
    pedido.refresh_from_db()
    pollo.refresh_from_db()
    papas.refresh_from_db()
    assert pedido.estado == Pedido.Estado.CANCELADO
    assert (pollo.stock_disponible, papas.stock_disponible) == (10, 5)
    assert editar(api, pedido, [{"producto_id": pollo.id, "cantidad": 1}]).status_code == 400


@pytest.mark.django_db
def test_registro_revalida_stock_si_cambio_despues_de_validar(escenario):
    _, _, cajero, _, pollo, _ = escenario
    serializador = PedidoRegistroSerializer(
        data={
            "cliente_nombre": "Luis",
            "modalidad_entrega": "SALON",
            "detalles": [{"producto_id": pollo.id, "cantidad": 1}],
        },
        context={"request": SimpleNamespace(user=cajero)},
    )
    assert serializador.is_valid()
    pollo.stock_disponible = 0
    pollo.save(update_fields=["stock_disponible"])

    with pytest.raises(ValidationError):
        serializador.save()

    assert Pedido.objects.count() == 1
    assert not Pedido.objects.filter(cliente_nombre="Luis").exists()


@pytest.mark.django_db
def test_registro_no_acepta_producto_desactivado(escenario):
    api, _, _, _, pollo, _ = escenario
    pollo.activo = False
    pollo.save(update_fields=["activo"])
    respuesta = api.post("/api/pedidos/", {
        "cliente_nombre": "Luis",
        "modalidad_entrega": "SALON",
        "detalles": [{"producto_id": pollo.id, "cantidad": 1}],
    }, format="json")

    assert respuesta.status_code == 400
    assert "Productos no disponibles" in str(respuesta.data["detalles"])
    assert Pedido.objects.count() == 1


@pytest.mark.django_db
def test_registro_revalida_producto_desactivado_si_cambio_despues_de_validar(escenario):
    _, _, cajero, _, pollo, _ = escenario
    serializador = PedidoRegistroSerializer(
        data={
            "cliente_nombre": "Luis",
            "modalidad_entrega": "SALON",
            "detalles": [{"producto_id": pollo.id, "cantidad": 1}],
        },
        context={"request": SimpleNamespace(user=cajero)},
    )
    assert serializador.is_valid()
    pollo.activo = False
    pollo.save(update_fields=["activo"])

    with pytest.raises(ValidationError):
        serializador.save()

    assert Pedido.objects.count() == 1
