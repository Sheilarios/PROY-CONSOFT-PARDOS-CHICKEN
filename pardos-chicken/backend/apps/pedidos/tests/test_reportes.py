"""Reportes del capítulo 8.3 calculados a partir de pedidos e incidencias reales."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.pedidos.models import DetallePedido, Incidencia, Pedido, Producto
from apps.usuarios.models import Usuario


def momento(dia, hora=9, minuto=0):
    return timezone.make_aware(datetime(2026, 11, dia, hora, minuto))


def crear_pedido(cajero, fecha, modalidad=Pedido.ModalidadEntrega.SALON,
                 estado=Pedido.Estado.REGISTRADO):
    pedido = Pedido.objects.create(
        registrado_por=cajero, modalidad_entrega=modalidad, estado=estado,
    )
    Pedido.objects.filter(pk=pedido.pk).update(fecha_creacion=fecha)
    pedido.fecha_creacion = fecha
    return pedido


@pytest.fixture
def escenario_reportes():
    cajero = Usuario.objects.create_user(username="caja_reportes", password="12345678")
    administrador = Usuario.objects.create_user(
        username="admin_reportes", password="12345678", rol=Usuario.Rol.ADMINISTRADOR,
    )
    api = APIClient()
    api.force_authenticate(user=administrador)
    return cajero, api


@pytest.mark.django_db
def test_productos_se_agrupan_por_hora_y_se_excluyen_pedidos_cancelados(escenario_reportes):
    cajero, api = escenario_reportes
    pollo = Producto.objects.create(nombre="Pollo", precio_unitario=Decimal("18.50"))
    gaseosa = Producto.objects.create(nombre="Gaseosa", precio_unitario=Decimal("8.00"))
    for fecha, estado, cantidades in (
        (momento(16, 9, 5), Pedido.Estado.REGISTRADO, ((pollo, 2), (gaseosa, 1))),
        (momento(16, 9, 40), Pedido.Estado.EN_COLA, ((pollo, 3),)),
        (momento(16, 10, 15), Pedido.Estado.DESPACHADO, ((gaseosa, 4),)),
        (momento(16, 9, 25), Pedido.Estado.CANCELADO, ((pollo, 9),)),
        (momento(15, 9), Pedido.Estado.REGISTRADO, ((pollo, 7),)),
    ):
        pedido = crear_pedido(cajero, fecha, estado=estado)
        for producto, cantidad in cantidades:
            DetallePedido.objects.create(
                pedido=pedido, producto=producto, cantidad=cantidad,
                precio_unitario_congelado=producto.precio_unitario,
            )

    with patch("apps.pedidos.views.timezone.localdate", return_value=date(2026, 11, 16)):
        respuesta = api.get("/api/pedidos/estadisticas/", {"periodo": "hoy"})

    assert respuesta.status_code == 200
    assert respuesta.data["productos_por_hora"] == [
        {"hora": "2026-11-16 09:00", "producto_id": pollo.id, "producto": "Pollo", "cantidad": 5},
        {"hora": "2026-11-16 09:00", "producto_id": gaseosa.id, "producto": "Gaseosa", "cantidad": 1},
        {"hora": "2026-11-16 10:00", "producto_id": gaseosa.id, "producto": "Gaseosa", "cantidad": 4},
    ]


@pytest.mark.django_db
def test_promedio_usa_fin_de_preparacion_e_incidencias_usan_fecha_de_registro(
    escenario_reportes,
):
    cajero, api = escenario_reportes
    pedido_salon = crear_pedido(cajero, momento(15, 23, 50))
    pedido_delivery = crear_pedido(
        cajero, momento(16, 10), Pedido.ModalidadEntrega.DELIVERY,
    )
    for pedido, inicio, fin in (
        (pedido_salon, momento(15, 23, 55), momento(16, 0, 5)),
        (pedido_delivery, momento(16, 10), momento(16, 10, 20)),
    ):
        Pedido.objects.filter(pk=pedido.pk).update(
            hora_inicio_preparacion=inicio, hora_fin_preparacion=fin,
        )
    sin_terminar = crear_pedido(cajero, momento(16, 11))
    Pedido.objects.filter(pk=sin_terminar.pk).update(
        hora_inicio_preparacion=momento(16, 11),
    )
    for pedido, fecha in (
        (pedido_salon, momento(16, 12)),
        (pedido_salon, momento(16, 13)),
        (pedido_delivery, momento(16, 14)),
        (pedido_delivery, momento(15, 23)),
    ):
        incidencia = Incidencia.objects.create(
            pedido=pedido, tipo=Incidencia.Tipo.DEMORA, registrado_por=cajero,
        )
        Incidencia.objects.filter(pk=incidencia.pk).update(fecha_registro=fecha)

    with patch("apps.pedidos.views.timezone.localdate", return_value=date(2026, 11, 16)):
        respuesta = api.get("/api/pedidos/estadisticas/", {"periodo": "hoy"})

    assert respuesta.status_code == 200
    assert respuesta.data["tiempo_promedio_preparacion_minutos"] == 15.0
    assert respuesta.data["pedidos_preparados"] == 2
    assert respuesta.data["incidencias_por_modalidad"] == [
        {"modalidad": "SALON", "cantidad": 2},
        {"modalidad": "RECOJO", "cantidad": 0},
        {"modalidad": "DELIVERY", "cantidad": 1},
    ]


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("periodo", "esperado"),
    [("hoy", 1), ("semana", 2), ("mes", 5)],
)
def test_filtros_hoy_semana_y_mes_respetan_sus_limites(
    escenario_reportes, periodo, esperado,
):
    cajero, api = escenario_reportes
    producto = Producto.objects.create(nombre="Papas", precio_unitario=Decimal("12.00"))
    fechas = [momento(dia) for dia in (1, 15, 16, 22, 23)]
    fechas.extend([
        timezone.make_aware(datetime(2026, 10, 31, 9)),
        timezone.make_aware(datetime(2026, 12, 1, 9)),
    ])
    for fecha in fechas:
        pedido = crear_pedido(cajero, fecha)
        DetallePedido.objects.create(
            pedido=pedido, producto=producto, cantidad=1,
            precio_unitario_congelado=producto.precio_unitario,
        )
        Pedido.objects.filter(pk=pedido.pk).update(
            hora_inicio_preparacion=fecha,
            hora_fin_preparacion=fecha + timedelta(minutes=10),
        )
        incidencia = Incidencia.objects.create(
            pedido=pedido, tipo=Incidencia.Tipo.DEMORA, registrado_por=cajero,
        )
        Incidencia.objects.filter(pk=incidencia.pk).update(fecha_registro=fecha)

    with patch("apps.pedidos.views.timezone.localdate", return_value=date(2026, 11, 16)):
        respuesta = api.get("/api/pedidos/estadisticas/", {"periodo": periodo})

    assert respuesta.status_code == 200
    assert sum(fila["cantidad"] for fila in respuesta.data["productos_por_hora"]) == esperado
    assert respuesta.data["pedidos_preparados"] == esperado
    assert respuesta.data["tiempo_promedio_preparacion_minutos"] == 10.0
    assert sum(fila["cantidad"] for fila in respuesta.data["incidencias_por_modalidad"]) == esperado


@pytest.mark.django_db
def test_reportes_vacios_y_periodo_invalido(escenario_reportes):
    _, api = escenario_reportes
    with patch("apps.pedidos.views.timezone.localdate", return_value=date(2026, 11, 16)):
        respuesta = api.get("/api/pedidos/estadisticas/")
        invalido = api.get("/api/pedidos/estadisticas/", {"periodo": "anio"})

    assert respuesta.status_code == 200
    assert respuesta.data["productos_por_hora"] == []
    assert respuesta.data["tiempo_promedio_preparacion_minutos"] is None
    assert respuesta.data["pedidos_preparados"] == 0
    assert all(fila["cantidad"] == 0 for fila in respuesta.data["incidencias_por_modalidad"])
    assert invalido.status_code == 400


@pytest.mark.django_db
def test_solo_administracion_consulta_reportes(escenario_reportes):
    _, api = escenario_reportes
    assert api.get("/api/pedidos/estadisticas/").status_code == 200
    for rol in (Usuario.Rol.CAJERO, Usuario.Rol.COCINERO, Usuario.Rol.DESPACHADOR):
        usuario = Usuario.objects.create_user(
            username=f"reporte_{rol.lower()}", password="12345678", rol=rol,
        )
        api.force_authenticate(user=usuario)
        assert api.get("/api/pedidos/estadisticas/").status_code == 403
    superusuario = Usuario.objects.create_superuser(
        username="super_reportes", password="12345678",
    )
    api.force_authenticate(user=superusuario)
    assert api.get("/api/pedidos/estadisticas/").status_code == 200
    api.force_authenticate(user=None)
    assert api.get("/api/pedidos/estadisticas/").status_code == 401
