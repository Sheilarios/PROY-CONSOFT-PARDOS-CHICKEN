"""Incidencias de cocina durante la preparación (Capítulo 6.6)."""

from unittest.mock import patch

import pytest
from django.db import DatabaseError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.pedidos.models import DetallePedido, Incidencia, Insumo, Pedido, Producto
from apps.usuarios.models import Usuario


RUTA = "/api/pedidos/incidencias/cocina/"


@pytest.fixture
def caso_cocina(db):
    cajero = Usuario.objects.create_user(username="caja_66", password="12345678")
    cocinero = Usuario.objects.create_user(
        username="cocina_66", password="12345678", rol=Usuario.Rol.COCINERO
    )
    administrador = Usuario.objects.create_user(
        username="admin_66", password="12345678", rol=Usuario.Rol.ADMINISTRADOR
    )
    producto = Producto.objects.create(
        nombre="Pollo de prueba", precio_unitario=20, stock_disponible=3
    )
    insumo = Insumo.objects.create(nombre="Insumo de prueba", stock_disponible=5)
    pedido = Pedido.objects.create(
        registrado_por=cajero,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_PREPARACION,
    )
    DetallePedido.objects.create(
        pedido=pedido, producto=producto, cantidad=2, precio_unitario_congelado=20
    )
    api = APIClient()
    api.force_authenticate(user=cocinero)
    return api, cajero, cocinero, administrador, pedido, producto, insumo


@pytest.mark.django_db
@pytest.mark.parametrize(
    "tipo",
    [
        "FALTA_INSUMOS", "PRODUCTO_DANADO", "EQUIPO_AVERIADO",
        "ERROR_PREPARACION", "DEMORA_COCINA", "OTRO_COCINA",
    ],
)
def test_cocina_registra_incidencia_sin_cambiar_pedido_ni_stock(caso_cocina, tipo):
    api, _, cocinero, administrador, pedido, producto, insumo = caso_cocina
    antes = timezone.now()

    respuesta = api.post(
        RUTA,
        {"pedido_id": pedido.id, "tipo": tipo, "descripcion": "  Se detuvo la preparación.  "},
        format="json",
    )

    assert respuesta.status_code == 201
    incidencia = Incidencia.objects.get()
    assert incidencia.pedido_id == pedido.id
    assert incidencia.tipo == tipo
    assert incidencia.descripcion == "Se detuvo la preparación."
    assert incidencia.registrado_por_id == cocinero.id
    assert antes <= incidencia.fecha_registro <= timezone.now()
    assert respuesta.data["pedido_codigo"] == pedido.codigo
    assert respuesta.data["rol_registrador"] == Usuario.Rol.COCINERO
    pedido.refresh_from_db()
    producto.refresh_from_db()
    insumo.refresh_from_db()
    assert pedido.estado == Pedido.Estado.EN_PREPARACION
    assert producto.stock_disponible == 3
    assert insumo.stock_disponible == 5

    api.force_authenticate(user=administrador)
    historial = api.get("/api/pedidos/incidencias/")
    assert historial.status_code == 200
    assert historial.data[0]["id"] == incidencia.id
    assert historial.data[0]["tipo"] == tipo


@pytest.mark.django_db
@pytest.mark.parametrize("descripcion", ["", "   ", None])
def test_cocina_exige_descripcion(caso_cocina, descripcion):
    api, _, _, _, pedido, _, _ = caso_cocina
    datos = {"pedido_id": pedido.id, "tipo": "FALTA_INSUMOS"}
    if descripcion is not None:
        datos["descripcion"] = descripcion

    respuesta = api.post(RUTA, datos, format="json")

    assert respuesta.status_code == 400
    assert "descripcion" in respuesta.data
    assert Incidencia.objects.count() == 0


@pytest.mark.django_db
def test_cocina_rechaza_pedido_inexistente_y_tipo_invalido(caso_cocina):
    api, _, _, _, pedido, _, _ = caso_cocina
    datos = {"pedido_id": 999999, "tipo": "FALTA_INSUMOS", "descripcion": "Falta pollo."}
    assert api.post(RUTA, datos, format="json").status_code == 404

    datos["pedido_id"] = pedido.id
    for tipo in ("INVENTADO", "CANCELACION", "ERROR_PRODUCTOS"):
        datos["tipo"] = tipo
        respuesta = api.post(RUTA, datos, format="json")
        assert respuesta.status_code == 400
        assert "tipo" in respuesta.data
    assert Incidencia.objects.count() == 0


@pytest.mark.django_db
@pytest.mark.parametrize(
    "estado",
    [
        Pedido.Estado.REGISTRADO,
        Pedido.Estado.EN_COLA,
        Pedido.Estado.LISTO,
        Pedido.Estado.DESPACHADO,
        Pedido.Estado.CANCELADO,
    ],
)
def test_cocina_rechaza_pedido_fuera_de_preparacion(caso_cocina, estado):
    api, _, _, _, pedido, producto, insumo = caso_cocina
    pedido.estado = estado
    pedido.save(update_fields=["estado"])

    respuesta = api.post(
        RUTA,
        {"pedido_id": pedido.id, "tipo": "DEMORA_COCINA", "descripcion": "Se demoró."},
        format="json",
    )

    assert respuesta.status_code == 400
    assert "pedido_id" in respuesta.data
    assert Incidencia.objects.count() == 0
    pedido.refresh_from_db()
    producto.refresh_from_db()
    insumo.refresh_from_db()
    assert pedido.estado == estado
    assert producto.stock_disponible == 3
    assert insumo.stock_disponible == 5


@pytest.mark.django_db
def test_solo_cocinero_puede_registrar_incidencia_de_cocina(caso_cocina):
    api, cajero, _, administrador, pedido, _, _ = caso_cocina
    datos = {"pedido_id": pedido.id, "tipo": "DEMORA_COCINA", "descripcion": "Demora."}
    for usuario in (cajero, administrador):
        api.force_authenticate(user=usuario)
        assert api.post(RUTA, datos, format="json").status_code == 403
    api.force_authenticate(user=None)
    assert api.post(RUTA, datos, format="json").status_code == 401
    assert Incidencia.objects.count() == 0


@pytest.mark.django_db
def test_envio_repetido_no_duplica_incidencia(caso_cocina):
    api, _, _, _, pedido, _, _ = caso_cocina
    datos = {"pedido_id": pedido.id, "tipo": "OTRO_COCINA", "descripcion": "Se cortó la luz."}

    primera = api.post(RUTA, datos, format="json")
    repetida = api.post(RUTA, datos, format="json")

    assert primera.status_code == 201
    assert repetida.status_code == 200
    assert repetida.data["id"] == primera.data["id"]
    assert Incidencia.objects.count() == 1


@pytest.mark.django_db
def test_error_de_guardado_revierte_registro_incompleto(caso_cocina):
    api, _, _, _, pedido, producto, insumo = caso_cocina
    crear_original = Incidencia.objects.create

    def crear_y_fallar(**datos):
        crear_original(**datos)
        raise DatabaseError("Fallo simulado después de insertar")

    with patch.object(Incidencia.objects, "create", side_effect=crear_y_fallar):
        respuesta = api.post(
            RUTA,
            {"pedido_id": pedido.id, "tipo": "PRODUCTO_DANADO", "descripcion": "No sirve."},
            format="json",
        )

    assert respuesta.status_code == 500
    assert "No se pudo guardar" in respuesta.data["detail"]
    assert Incidencia.objects.count() == 0
    pedido.refresh_from_db()
    producto.refresh_from_db()
    insumo.refresh_from_db()
    assert pedido.estado == Pedido.Estado.EN_PREPARACION
    assert producto.stock_disponible == 3
    assert insumo.stock_disponible == 5
