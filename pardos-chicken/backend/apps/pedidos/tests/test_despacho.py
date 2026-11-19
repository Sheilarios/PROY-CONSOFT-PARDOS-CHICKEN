"""Flujo real de Caja, Cocina y Despacho con permisos e inventario."""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.pedidos.models import (
    DetallePedido, EventoDespacho, Incidencia, Insumo, Pedido, Producto,
    RecetaInsumo, Repartidor,
)
from apps.usuarios.models import Usuario


def cliente_api(usuario):
    api = APIClient()
    api.force_authenticate(user=usuario)
    return api


@pytest.fixture
def usuarios():
    return {
        rol: Usuario.objects.create_user(
            username=rol.lower(), password="12345678", rol=rol
        )
        for rol in (
            Usuario.Rol.CAJERO,
            Usuario.Rol.COCINERO,
            Usuario.Rol.DESPACHADOR,
            Usuario.Rol.ADMINISTRADOR,
        )
    }


@pytest.fixture
def pedido_listo(usuarios):
    producto = Producto.objects.create(
        nombre="Pollo de prueba", precio_unitario=20, stock_disponible=8
    )
    pedido = Pedido.objects.create(
        registrado_por=usuarios[Usuario.Rol.CAJERO],
        cliente_nombre="Ana",
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.LISTO,
        hora_inicio_preparacion=timezone.now(),
        hora_fin_preparacion=timezone.now(),
    )
    detalle = DetallePedido.objects.create(
        pedido=pedido, producto=producto, cantidad=2, precio_unitario_congelado=20
    )
    return pedido, detalle, producto


def verificar(api, pedido, detalle):
    return api.post(
        f"/api/pedidos/{pedido.id}/verificar-despacho/",
        {
            "detalles_confirmados": [detalle.id],
            "empaque_confirmado": True,
            "observaciones_confirmadas": True,
        },
        format="json",
    )


@pytest.mark.django_db
def test_panel_solo_muestra_listos_y_despachados(usuarios, pedido_listo):
    pedido, _, _ = pedido_listo
    Pedido.objects.create(
        registrado_por=usuarios[Usuario.Rol.CAJERO],
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.EN_PREPARACION,
    )
    Pedido.objects.create(
        registrado_por=usuarios[Usuario.Rol.CAJERO],
        modalidad_entrega=Pedido.ModalidadEntrega.SALON,
        estado=Pedido.Estado.DESPACHADO,
    )
    for rol in (Usuario.Rol.DESPACHADOR, Usuario.Rol.ADMINISTRADOR):
        respuesta = cliente_api(usuarios[rol]).get("/api/pedidos/despacho/")
        assert respuesta.status_code == 200
        assert len(respuesta.data) == 2
        assert pedido.id in [p["id"] for p in respuesta.data]
        assert {p["estado"] for p in respuesta.data} == {
            Pedido.Estado.LISTO, Pedido.Estado.DESPACHADO
        }
    assert cliente_api(usuarios[Usuario.Rol.CAJERO]).get("/api/pedidos/despacho/").status_code == 403


@pytest.mark.django_db
def test_verificacion_exige_estado_y_checklist_completo(usuarios, pedido_listo):
    pedido, detalle, _ = pedido_listo
    api = cliente_api(usuarios[Usuario.Rol.DESPACHADOR])
    incompleto = api.post(
        f"/api/pedidos/{pedido.id}/verificar-despacho/",
        {"detalles_confirmados": [detalle.id], "empaque_confirmado": False,
         "observaciones_confirmadas": True},
        format="json",
    )
    assert incompleto.status_code == 400
    pedido.refresh_from_db()
    assert pedido.fecha_verificacion is None
    verificado = verificar(api, pedido, detalle)
    assert verificado.status_code == 200
    assert len(verificado.data["eventos_despacho"]) == 1
    pedido.refresh_from_db()
    assert pedido.verificado_por == usuarios[Usuario.Rol.DESPACHADOR]
    assert pedido.fecha_verificacion is not None
    assert EventoDespacho.objects.filter(
        pedido=pedido, tipo=EventoDespacho.Tipo.VERIFICACION
    ).count() == 1
    assert verificar(api, pedido, detalle).status_code == 400
    pedido.estado = Pedido.Estado.EN_PREPARACION
    pedido.save(update_fields=["estado"])
    assert verificar(api, pedido, detalle).status_code == 400


@pytest.mark.django_db
def test_despacho_rechaza_sin_verificacion_y_sin_preparacion(usuarios, pedido_listo):
    pedido, detalle, _ = pedido_listo
    api = cliente_api(usuarios[Usuario.Rol.DESPACHADOR])
    ruta = f"/api/pedidos/{pedido.id}/confirmar-despacho/"
    assert api.post(ruta).status_code == 400
    assert verificar(api, pedido, detalle).status_code == 200
    pedido.hora_fin_preparacion = None
    pedido.save(update_fields=["hora_fin_preparacion"])
    assert api.post(ruta).status_code == 400
    pedido.hora_fin_preparacion = timezone.now()
    pedido.estado = Pedido.Estado.EN_PREPARACION
    pedido.save(update_fields=["hora_fin_preparacion", "estado"])
    assert api.post(ruta).status_code == 400
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.EN_PREPARACION


@pytest.mark.django_db
def test_delivery_requiere_repartidor_y_no_permite_doble_asignacion(usuarios, pedido_listo):
    pedido, detalle, _ = pedido_listo
    pedido.modalidad_entrega = Pedido.ModalidadEntrega.DELIVERY
    pedido.direccion_delivery = "Av. Principal 123"
    pedido.save(update_fields=["modalidad_entrega", "direccion_delivery"])
    api = cliente_api(usuarios[Usuario.Rol.DESPACHADOR])
    rider = Repartidor.objects.create(nombre="Luis", telefono="987654321")
    ruta_asignacion = f"/api/pedidos/{pedido.id}/asignar-repartidor/"
    assert api.post(ruta_asignacion, {"repartidor_id": rider.id}).status_code == 400
    assert verificar(api, pedido, detalle).status_code == 200
    assert api.post(f"/api/pedidos/{pedido.id}/confirmar-despacho/").status_code == 400
    asignacion = api.post(ruta_asignacion, {"repartidor_id": rider.id})
    assert asignacion.status_code == 200
    assert len(asignacion.data["eventos_despacho"]) == 2
    assert api.post(ruta_asignacion, {"repartidor_id": rider.id}).status_code == 400
    pedido.refresh_from_db()
    rider.refresh_from_db()
    assert pedido.repartidor == rider
    assert pedido.fecha_asignacion is not None
    assert not rider.disponible
    assert EventoDespacho.objects.filter(pedido=pedido, tipo=EventoDespacho.Tipo.ASIGNACION).count() == 1
    otro_pedido = Pedido.objects.create(
        registrado_por=usuarios[Usuario.Rol.CAJERO],
        modalidad_entrega=Pedido.ModalidadEntrega.DELIVERY,
        estado=Pedido.Estado.LISTO,
        verificado_por=usuarios[Usuario.Rol.DESPACHADOR],
        fecha_verificacion=timezone.now(),
    )
    assert api.post(
        f"/api/pedidos/{otro_pedido.id}/asignar-repartidor/",
        {"repartidor_id": rider.id},
    ).status_code == 400
    assert api.post(f"/api/pedidos/repartidores/{rider.id}/liberar/").status_code == 400
    assert api.post(f"/api/pedidos/{pedido.id}/confirmar-despacho/").status_code == 200
    assert api.post(f"/api/pedidos/repartidores/{rider.id}/liberar/").status_code == 200
    rider.refresh_from_db()
    assert rider.disponible


@pytest.mark.django_db
def test_confirmar_despacho_no_descuenta_stock_otra_vez(usuarios):
    caja = cliente_api(usuarios[Usuario.Rol.CAJERO])
    cocina = cliente_api(usuarios[Usuario.Rol.COCINERO])
    despacho = cliente_api(usuarios[Usuario.Rol.DESPACHADOR])
    producto = Producto.objects.create(
        nombre="Pollo de flujo", precio_unitario=25, stock_disponible=5
    )
    insumo = Insumo.objects.create(nombre="Pollo crudo de flujo", stock_disponible=4)
    RecetaInsumo.objects.create(producto=producto, insumo=insumo, cantidad=2)
    registro = caja.post(
        "/api/pedidos/",
        {"cliente_nombre": "Ana", "modalidad_entrega": "SALON",
         "detalles": [{"producto_id": producto.id, "cantidad": 1}]},
        format="json",
    )
    assert registro.status_code == 201
    pedido_id = registro.data["id"]
    ruta = f"/api/pedidos/{pedido_id}/"
    producto.refresh_from_db()
    assert producto.stock_disponible == 4
    assert caja.post(ruta + "enviar-a-produccion/").status_code == 200
    assert cocina.post(ruta + "iniciar-preparacion/").status_code == 200
    insumo.refresh_from_db()
    assert insumo.stock_disponible == 2
    assert cocina.post(ruta + "marcar-listo/").status_code == 200
    detalle = Pedido.objects.get(pk=pedido_id).detalles.get()
    assert verificar(despacho, Pedido.objects.get(pk=pedido_id), detalle).status_code == 200
    confirmacion = despacho.post(ruta + "confirmar-despacho/")
    assert confirmacion.status_code == 200
    assert len(confirmacion.data["eventos_despacho"]) == 2
    assert despacho.post(ruta + "confirmar-despacho/").status_code == 400
    pedido = Pedido.objects.get(pk=pedido_id)
    producto.refresh_from_db()
    insumo.refresh_from_db()
    assert pedido.estado == Pedido.Estado.DESPACHADO
    assert pedido.despachado_por == usuarios[Usuario.Rol.DESPACHADOR]
    assert pedido.fecha_despacho is not None
    assert (producto.stock_disponible, insumo.stock_disponible) == (4, 2)
    assert EventoDespacho.objects.filter(pedido=pedido).count() == 2


@pytest.mark.django_db
def test_incidencia_despacho_se_ve_en_historial_sin_cambiar_pedido(usuarios, pedido_listo):
    pedido, detalle, producto = pedido_listo
    despacho = cliente_api(usuarios[Usuario.Rol.DESPACHADOR])
    ruta_incidencia = "/api/pedidos/incidencias/despacho/"
    datos = {"pedido_id": pedido.id, "tipo": Incidencia.Tipo.PEDIDO_INCOMPLETO,
             "descripcion": "Falta la gaseosa."}
    respuesta = despacho.post(
        ruta_incidencia,
        datos,
        format="json",
    )
    assert respuesta.status_code == 201
    pedido.refresh_from_db()
    producto.refresh_from_db()
    assert pedido.estado == Pedido.Estado.LISTO
    assert producto.stock_disponible == 8
    assert respuesta.data["rol_registrador"] == Usuario.Rol.DESPACHADOR
    historial = cliente_api(usuarios[Usuario.Rol.ADMINISTRADOR]).get(
        "/api/pedidos/incidencias/"
    )
    assert historial.status_code == 200
    assert any(i["id"] == respuesta.data["id"] for i in historial.data)
    assert verificar(despacho, pedido, detalle).status_code == 200
    assert despacho.post(ruta_incidencia, datos, format="json").status_code == 400
    pedido.estado = Pedido.Estado.DESPACHADO
    pedido.save(update_fields=["estado"])
    assert despacho.post(ruta_incidencia, datos, format="json").status_code == 400
    assert Incidencia.objects.filter(pedido=pedido).count() == 1


@pytest.mark.django_db
def test_administrador_consulta_eventos_pero_no_los_crea(usuarios, pedido_listo):
    pedido, detalle, _ = pedido_listo
    despacho = cliente_api(usuarios[Usuario.Rol.DESPACHADOR])
    assert verificar(despacho, pedido, detalle).status_code == 200
    admin = cliente_api(usuarios[Usuario.Rol.ADMINISTRADOR])
    eventos = admin.get("/api/pedidos/eventos-despacho/")
    assert eventos.status_code == 200
    assert len(eventos.data) == 1
    assert eventos.data[0]["tipo"] == EventoDespacho.Tipo.VERIFICACION
    assert cliente_api(usuarios[Usuario.Rol.CAJERO]).get(
        "/api/pedidos/eventos-despacho/"
    ).status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize("rol", [Usuario.Rol.CAJERO, Usuario.Rol.COCINERO, Usuario.Rol.ADMINISTRADOR])
def test_otros_roles_no_operan_despacho(usuarios, pedido_listo, rol):
    pedido, detalle, _ = pedido_listo
    api = cliente_api(usuarios[rol])
    ruta = f"/api/pedidos/{pedido.id}/"
    assert verificar(api, pedido, detalle).status_code == 403
    assert api.post(ruta + "asignar-repartidor/", {"repartidor_id": 1}).status_code == 403
    assert api.post(ruta + "confirmar-despacho/").status_code == 403
    assert api.post(
        "/api/pedidos/incidencias/despacho/",
        {"pedido_id": pedido.id, "tipo": Incidencia.Tipo.OTRO_DESPACHO,
         "descripcion": "Prueba"},
    ).status_code == 403
    assert api.post(
        "/api/pedidos/repartidores/", {"nombre": "Luis", "telefono": "987654321"}
    ).status_code == 403


@pytest.mark.django_db
def test_superusuario_no_ejecuta_acciones_operativas(usuarios, pedido_listo):
    pedido, detalle, _ = pedido_listo
    superusuario = Usuario.objects.create_user(
        username="super_despacho", password="12345678",
        rol=Usuario.Rol.DESPACHADOR, is_superuser=True,
    )
    api = cliente_api(superusuario)
    assert verificar(api, pedido, detalle).status_code == 403
    assert api.post(f"/api/pedidos/{pedido.id}/confirmar-despacho/").status_code == 403
    assert api.post("/api/pedidos/repartidores/", {
        "nombre": "Luis", "telefono": "987654321"
    }).status_code == 403
