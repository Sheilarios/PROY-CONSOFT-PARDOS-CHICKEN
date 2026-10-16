"""Orden de la cola de producción según la regla RN-02 (Capítulo 6.1)."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.pedidos.models import Pedido
from apps.usuarios.models import Usuario


@pytest.mark.django_db
def test_cola_prioriza_modalidad_y_luego_antiguedad():
    usuario = Usuario.objects.create_user(username="cocina_cola", password="12345678")
    cliente_api = APIClient()
    cliente_api.force_authenticate(user=usuario)
    ahora = timezone.now()

    def crear_pedido(modalidad, estado, minutos):
        pedido = Pedido.objects.create(
            registrado_por=usuario, modalidad_entrega=modalidad, estado=estado
        )
        Pedido.objects.filter(pk=pedido.pk).update(
            fecha_creacion=ahora + timedelta(minutes=minutos)
        )
        return pedido

    recojo = crear_pedido(Pedido.ModalidadEntrega.RECOJO, Pedido.Estado.EN_COLA, -50)
    salon_reciente = crear_pedido(Pedido.ModalidadEntrega.SALON, Pedido.Estado.EN_COLA, -10)
    delivery = crear_pedido(Pedido.ModalidadEntrega.DELIVERY, Pedido.Estado.EN_COLA, -40)
    salon_antiguo = crear_pedido(Pedido.ModalidadEntrega.SALON, Pedido.Estado.EN_COLA, -30)
    crear_pedido(Pedido.ModalidadEntrega.SALON, Pedido.Estado.REGISTRADO, -60)
    crear_pedido(Pedido.ModalidadEntrega.SALON, Pedido.Estado.EN_PREPARACION, -70)

    respuesta = cliente_api.get("/api/pedidos/cola-produccion/")

    assert respuesta.status_code == 200
    assert [pedido["id"] for pedido in respuesta.data] == [
        salon_antiguo.id, salon_reciente.id, delivery.id, recojo.id
    ]
    assert [pedido["prioridad"] for pedido in respuesta.data] == [1, 1, 2, 3]


@pytest.mark.django_db
def test_cola_usa_id_para_desempatar_la_misma_fecha():
    usuario = Usuario.objects.create_user(username="cocina_empate", password="12345678")
    cliente_api = APIClient()
    cliente_api.force_authenticate(user=usuario)
    primero = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_COLA,
    )
    segundo = Pedido.objects.create(
        registrado_por=usuario,
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_COLA,
    )
    Pedido.objects.filter(pk__in=[primero.pk, segundo.pk]).update(
        fecha_creacion=timezone.now()
    )

    respuesta = cliente_api.get("/api/pedidos/cola-produccion/")

    assert respuesta.status_code == 200
    assert [pedido["id"] for pedido in respuesta.data] == [primero.id, segundo.id]
