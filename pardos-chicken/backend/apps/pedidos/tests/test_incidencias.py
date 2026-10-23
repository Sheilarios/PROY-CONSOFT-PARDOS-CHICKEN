"""Registro de incidencias en caja y consulta por administración."""

import pytest
from rest_framework.test import APIClient

from apps.pedidos.models import DetallePedido, Incidencia, Pedido, Producto
from apps.usuarios.models import Usuario


@pytest.mark.django_db
def test_cajero_registra_incidencia_y_administrador_la_consulta():
    cajero = Usuario.objects.create_user(
        username="caja_incidencia", password="12345678", rol=Usuario.Rol.CAJERO
    )
    administrador = Usuario.objects.create_user(
        username="admin_incidencia", password="12345678",
        rol=Usuario.Rol.ADMINISTRADOR,
    )
    pedido = Pedido.objects.create(
        registrado_por=cajero,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        cliente_nombre="Ana",
    )
    api = APIClient()
    api.force_authenticate(user=cajero)

    respuesta = api.post(
        "/api/pedidos/incidencias/",
        {
            "pedido_id": pedido.id,
            "tipo": "ERROR_PRODUCTOS",
            "descripcion": "Faltó una bebida.",
        },
        format="json",
    )

    assert respuesta.status_code == 201
    incidencia = Incidencia.objects.get()
    assert incidencia.pedido == pedido
    assert incidencia.registrado_por == cajero
    assert respuesta.data["pedido_codigo"] == pedido.codigo
    assert respuesta.data["registrado_por_nombre"] == cajero.username
    assert Pedido.objects.get(pk=pedido.pk).estado == Pedido.Estado.CANCELADO

    api.force_authenticate(user=administrador)
    historial = api.get("/api/pedidos/incidencias/")

    assert historial.status_code == 200
    assert len(historial.data) == 1
    assert historial.data[0]["descripcion"] == "Faltó una bebida."
    assert historial.data[0]["pedido_codigo"] == pedido.codigo
    assert historial.data[0]["tipo"] == "ERROR_PRODUCTOS"
    assert historial.data[0]["pedido_estado"] == Pedido.Estado.CANCELADO


@pytest.mark.django_db
def test_roles_no_autorizados_no_acceden_a_incidencias():
    cajero = Usuario.objects.create_user(username="cajero", password="12345678")
    cocinero = Usuario.objects.create_user(
        username="cocinero", password="12345678", rol=Usuario.Rol.COCINERO
    )
    administrador = Usuario.objects.create_user(
        username="administrador", password="12345678",
        rol=Usuario.Rol.ADMINISTRADOR,
    )
    pedido = Pedido.objects.create(
        registrado_por=cajero, modalidad_entrega=Pedido.ModalidadEntrega.RECOJO
    )
    api = APIClient()

    api.force_authenticate(user=cajero)
    assert api.get("/api/pedidos/incidencias/").status_code == 403

    datos = {"pedido_id": pedido.id, "tipo": "CANCELACION", "descripcion": "Cancelado."}
    for usuario in (cocinero, administrador):
        api.force_authenticate(user=usuario)
        assert api.post("/api/pedidos/incidencias/", datos, format="json").status_code == 403

    assert Incidencia.objects.count() == 0


@pytest.mark.django_db
def test_incidencia_exige_pedido_tipo_y_descripcion_validos():
    cajero = Usuario.objects.create_user(username="caja_validacion", password="12345678")
    pedido = Pedido.objects.create(
        registrado_por=cajero, modalidad_entrega=Pedido.ModalidadEntrega.DELIVERY
    )
    api = APIClient()
    api.force_authenticate(user=cajero)

    for datos in (
        {"pedido_id": 999999, "tipo": "CANCELACION", "descripcion": "Cancelado."},
        {"pedido_id": pedido.id, "tipo": "OTRO", "descripcion": "Error."},
        {"pedido_id": pedido.id, "tipo": "ERROR_CLIENTE", "descripcion": "   "},
        {"pedido_id": pedido.id, "tipo": "DEMORA", "descripcion": "Demora."},
        {"pedido_id": pedido.id, "tipo": "ERROR", "descripcion": "Error anterior."},
        {"pedido_id": pedido.id, "tipo": "DEVOLUCION", "descripcion": "Devolución."},
    ):
        assert api.post("/api/pedidos/incidencias/", datos, format="json").status_code == 400

    assert Incidencia.objects.count() == 0
    assert Pedido.objects.get(pk=pedido.pk).estado == Pedido.Estado.REGISTRADO


@pytest.mark.django_db
def test_incidencia_antigua_sigue_visible_en_historial():
    cajero = Usuario.objects.create_user(username="caja_historial", password="12345678")
    administrador = Usuario.objects.create_user(
        username="admin_historial", password="12345678",
        rol=Usuario.Rol.ADMINISTRADOR,
    )
    pedido = Pedido.objects.create(
        registrado_por=cajero, modalidad_entrega=Pedido.ModalidadEntrega.RECOJO
    )
    Incidencia.objects.create(
        pedido=pedido, tipo=Incidencia.Tipo.DEMORA,
        descripcion="Incidencia anterior.", registrado_por=cajero,
    )
    api = APIClient()
    api.force_authenticate(user=administrador)

    historial = api.get("/api/pedidos/incidencias/")

    assert historial.status_code == 200
    assert historial.data[0]["tipo"] == "DEMORA"


@pytest.mark.django_db
@pytest.mark.parametrize("estado", [Pedido.Estado.REGISTRADO, Pedido.Estado.EN_COLA])
@pytest.mark.parametrize(
    "tipo",
    ["CANCELACION", "ERROR_PRODUCTOS", "ERROR_MODALIDAD", "ERROR_CLIENTE"],
)
def test_cancelacion_temprana_anula_pedido_y_devuelve_stock_una_vez(estado, tipo):
    cajero = Usuario.objects.create_user(username="caja_cancelacion", password="12345678")
    producto = Producto.objects.create(
        nombre="Pollo", precio_unitario=20, stock_disponible=3
    )
    pedido = Pedido.objects.create(
        registrado_por=cajero,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=estado,
    )
    DetallePedido.objects.create(
        pedido=pedido, producto=producto, cantidad=2, precio_unitario_congelado=20
    )
    api = APIClient()
    api.force_authenticate(user=cajero)
    datos = {
        "pedido_id": pedido.id,
        "tipo": tipo,
        "descripcion": "El cliente pidió otro producto.",
    }

    respuesta = api.post("/api/pedidos/incidencias/", datos, format="json")

    assert respuesta.status_code == 201
    assert respuesta.data["pedido_estado"] == Pedido.Estado.CANCELADO
    pedido.refresh_from_db()
    producto.refresh_from_db()
    assert pedido.estado == Pedido.Estado.CANCELADO
    assert producto.stock_disponible == 5
    assert Incidencia.objects.filter(pedido=pedido, tipo=tipo).count() == 1

    repetida = api.post("/api/pedidos/incidencias/", datos, format="json")
    assert repetida.status_code == 400
    producto.refresh_from_db()
    assert producto.stock_disponible == 5
    assert Incidencia.objects.count() == 1
    assert api.post(f"/api/pedidos/{pedido.id}/enviar-a-produccion/").status_code == 400


@pytest.mark.django_db
@pytest.mark.parametrize(
    "estado",
    [
        Pedido.Estado.EN_PREPARACION,
        Pedido.Estado.LISTO,
        Pedido.Estado.DESPACHADO,
        Pedido.Estado.CANCELADO,
    ],
)
def test_no_se_registran_incidencias_tras_iniciar_preparacion(estado):
    cajero = Usuario.objects.create_user(username="caja_tarde", password="12345678")
    producto = Producto.objects.create(
        nombre="Papas", precio_unitario=12, stock_disponible=3
    )
    pedido = Pedido.objects.create(
        registrado_por=cajero,
        modalidad_entrega=Pedido.ModalidadEntrega.RECOJO,
        estado=estado,
    )
    DetallePedido.objects.create(
        pedido=pedido, producto=producto, cantidad=2, precio_unitario_congelado=12
    )
    api = APIClient()
    api.force_authenticate(user=cajero)

    for tipo in ("CANCELACION", "ERROR_MODALIDAD"):
        respuesta = api.post(
            "/api/pedidos/incidencias/",
            {"pedido_id": pedido.id, "tipo": tipo, "descripcion": "Cambio solicitado."},
            format="json",
        )
        assert respuesta.status_code == 400

    pedido.refresh_from_db()
    producto.refresh_from_db()
    assert pedido.estado == estado
    assert producto.stock_disponible == 3
    assert Incidencia.objects.count() == 0
