from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from django.db import DatabaseError
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from datetime import datetime, time, timedelta
from django.db import transaction
from django.db.models import Count, F
from django.shortcuts import get_object_or_404
from django.utils import timezone


from apps.usuarios.models import Usuario

from .models import (
    Producto, Insumo, RecetaInsumo, Cliente, Pedido, DetallePedido,
    Incidencia, EdicionPedido, Repartidor, EventoDespacho,
)
from .serializers import (
    ProductoSerializer,
    ClienteSerializer,
    PedidoRegistroSerializer,
    PedidoEdicionSerializer,
    PedidoConsultaSerializer,
    IncidenciaSerializer,
    IncidenciaCocinaEntradaSerializer,
    IncidenciaDespachoEntradaSerializer,
    EdicionPedidoSerializer,
    RepartidorSerializer,
    EventoDespachoSerializer,
    VerificacionPedidoEntradaSerializer,
    AsignacionRepartidorEntradaSerializer,
)
from . import validators


class PedidoFiltro(filters.FilterSet):
    fecha = filters.DateFilter(method="filtrar_por_fecha")

    def filtrar_por_fecha(self, queryset, name, value):
        inicio = timezone.make_aware(datetime.combine(value, time.min))
        fin = inicio + timedelta(days=1)

        return queryset.filter(
            fecha_creacion__gte=inicio,
            fecha_creacion__lt=fin,
        )

    class Meta:
        model = Pedido
        fields = ["fecha", "estado", "modalidad_entrega"]


class ProductoViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
    mixins.UpdateModelMixin, viewsets.GenericViewSet,
):
    """Catálogo de productos, usado por caja para armar el pedido (RF-01)."""

    queryset = Producto.objects.filter(activo=True)
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ("update", "partial_update"):
            return queryset.select_for_update()
        return queryset

    def create(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR):
            raise PermissionDenied("Solo administración puede agregar productos.")
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR):
            raise PermissionDenied("Solo administración puede editar productos.")
        producto = self.get_object()
        try:
            stock_anterior = int(request.data.get("stock_anterior", ""))
        except (TypeError, ValueError):
            raise ValidationError({"stock_anterior": "Indica el stock que se mostró al abrir."})
        if producto.stock_disponible != stock_anterior:
            raise ValidationError({
                "stock_anterior": "El stock cambió. Actualiza la página antes de guardar."
            })
        serializer = self.get_serializer(producto, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ClienteViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Registro y búsqueda de clientes para el personal de caja."""

    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    @action(detail=False, methods=["get"], url_path="buscar-por-nombre")
    def buscar_por_nombre(self, request):
        nombre = request.query_params.get("nombre", "").strip()
        if not nombre:
            raise ValidationError({"nombre": "Ingrese el nombre del cliente."})

        clientes = Cliente.objects.filter(nombre__icontains=nombre)[:10]
        resultados = [
            {
                "id": cliente.id,
                "nombre": cliente.nombre,
                "telefono": cliente.telefono,
                "origen": "registro",
            }
            for cliente in clientes
        ]

        # Los pedidos anteriores guardaban el nombre sin crear un Cliente.
        encontrados = {
            (cliente_encontrado["nombre"].casefold(), cliente_encontrado["telefono"])
            for cliente_encontrado in resultados
        }
        pedidos_anteriores = (
            Pedido.objects.filter(cliente_nombre__icontains=nombre)
            .exclude(cliente_nombre="")
            .order_by("cliente_nombre", "cliente_telefono")
            .values_list("cliente_nombre", "cliente_telefono")
            .distinct()
        )
        for nombre_anterior, telefono_anterior in pedidos_anteriores:
            if len(resultados) == 10:
                break
            clave = (nombre_anterior.casefold(), telefono_anterior)
            if clave not in encontrados:
                resultados.append(
                    {
                        "id": None,
                        "nombre": nombre_anterior,
                        "telefono": telefono_anterior,
                        "origen": "historial",
                    }
                )
                encontrados.add(clave)

        if not resultados:
            raise NotFound("Cliente no encontrado.")
        return Response(resultados)


class PermisoIncidencia(BasePermission):
    """Cada área registra sus incidencias; administración consulta."""

    def has_permission(self, request, view):
        if view.action == "create":
            return request.user.rol == Usuario.Rol.CAJERO and not request.user.is_superuser
        if view.action == "cocina":
            return request.user.rol == Usuario.Rol.COCINERO and not request.user.is_superuser
        if view.action == "despacho":
            return request.user.rol == Usuario.Rol.DESPACHADOR and not request.user.is_superuser
        if view.action == "list":
            return request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR
        return False


class IncidenciaViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = Incidencia.objects.select_related("pedido", "registrado_por").order_by(
        "-fecha_registro", "-id"
    )
    serializer_class = IncidenciaSerializer
    permission_classes = [IsAuthenticated, PermisoIncidencia]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == "cocina":
            return IncidenciaCocinaEntradaSerializer
        if self.action == "despacho":
            return IncidenciaDespachoEntradaSerializer
        return IncidenciaSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        pedido = Pedido.objects.select_for_update().get(
            pk=serializer.validated_data["pedido"].pk
        )
        if pedido.estado not in (Pedido.Estado.REGISTRADO, Pedido.Estado.EN_COLA):
            raise ValidationError(
                {"pedido_id": "Solo se permiten incidencias en pedidos registrados o en cola."}
            )

        for producto_id, cantidad in pedido.detalles.values_list(
            "producto_id", "cantidad"
        ):
            Producto.objects.filter(pk=producto_id).update(
                stock_disponible=F("stock_disponible") + cantidad
            )
        pedido.estado = Pedido.Estado.CANCELADO
        pedido.save(update_fields=["estado", "fecha_actualizacion"])

        serializer.save(pedido=pedido, registrado_por=self.request.user)

    @action(detail=False, methods=["post"], url_path="cocina")
    def cocina(self, request):
        """Registra un problema durante la preparación sin alterar pedido ni stock."""
        entrada = self.get_serializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        try:
            with transaction.atomic():
                pedido = get_object_or_404(
                    Pedido.objects.select_for_update(), pk=datos["pedido_id"]
                )
                if pedido.estado != Pedido.Estado.EN_PREPARACION:
                    raise ValidationError(
                        {"pedido_id": "Solo se permiten incidencias de cocina en pedidos en preparación."}
                    )

                incidencia = (
                    Incidencia.objects.filter(
                        pedido=pedido,
                        tipo=datos["tipo"],
                        descripcion=datos["descripcion"],
                        registrado_por=request.user,
                        fecha_registro__gte=timezone.now() - timedelta(seconds=60),
                    )
                    .order_by("-fecha_registro")
                    .first()
                )
                creada = incidencia is None
                if creada:
                    incidencia = Incidencia.objects.create(
                        pedido=pedido,
                        tipo=datos["tipo"],
                        descripcion=datos["descripcion"],
                        registrado_por=request.user,
                    )
        except DatabaseError:
            return Response(
                {"detail": "No se pudo guardar la incidencia. Intenta de nuevo."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            IncidenciaSerializer(incidencia).data,
            status=status.HTTP_201_CREATED if creada else status.HTTP_200_OK,
        )

    @transaction.atomic
    @action(detail=False, methods=["post"], url_path="despacho")
    def despacho(self, request):
        """Registra un incidente sin cambiar estado ni inventario."""
        entrada = self.get_serializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        pedido = get_object_or_404(Pedido.objects.select_for_update(), pk=entrada.validated_data["pedido_id"])
        if pedido.estado != Pedido.Estado.LISTO or pedido.fecha_verificacion is not None:
            raise ValidationError({"pedido_id": "Solo se registran incidencias de despacho antes de verificar un pedido listo."})
        incidencia = Incidencia.objects.create(
            pedido=pedido,
            tipo=entrada.validated_data["tipo"],
            descripcion=entrada.validated_data["descripcion"],
            registrado_por=request.user,
        )
        return Response(IncidenciaSerializer(incidencia).data, status=status.HTTP_201_CREATED)


class PermisoHistorialEdiciones(BasePermission):
    """Solo administración consulta las ediciones de pedidos."""

    def has_permission(self, request, view):
        return view.action == "list" and (
            request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR
        )


class EdicionPedidoViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = EdicionPedido.objects.select_related(
        "pedido", "modificado_por"
    ).order_by("-fecha", "-id")
    serializer_class = EdicionPedidoSerializer
    permission_classes = [IsAuthenticated, PermisoHistorialEdiciones]
    pagination_class = None


class PermisoDespacho(BasePermission):
    """Despacho opera; administración solo consulta listados."""

    def has_permission(self, request, view):
        if view.action == "list":
            return request.user.is_superuser or request.user.rol in (
                Usuario.Rol.ADMINISTRADOR, Usuario.Rol.DESPACHADOR
            )
        return request.user.rol == Usuario.Rol.DESPACHADOR and not request.user.is_superuser


class RepartidorViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    queryset = Repartidor.objects.all()
    serializer_class = RepartidorSerializer
    permission_classes = [IsAuthenticated, PermisoDespacho]
    pagination_class = None

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="liberar")
    def liberar(self, request, pk=None):
        """Libera al repartidor cuando no queda una entrega lista a su cargo."""
        repartidor = get_object_or_404(Repartidor.objects.select_for_update(), pk=pk)
        if Pedido.objects.filter(repartidor=repartidor, estado=Pedido.Estado.LISTO).exists():
            raise ValidationError({"repartidor": "Tiene un pedido listo pendiente de despacho."})
        repartidor.disponible = True
        repartidor.save(update_fields=["disponible"])
        return Response(RepartidorSerializer(repartidor).data)


class EventoDespachoViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = EventoDespacho.objects.select_related("pedido", "usuario").all()
    serializer_class = EventoDespachoSerializer
    permission_classes = [IsAuthenticated, PermisoHistorialEdiciones]
    pagination_class = None


class PedidoViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):

    queryset = Pedido.objects.prefetch_related("detalles__producto", "eventos_despacho__usuario").select_related(
        "registrado_por"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = PedidoFiltro
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, "action", None) in {
            "enviar_a_produccion", "iniciar_preparacion", "marcar_listo", "editar",
            "verificar_despacho", "asignar_repartidor", "confirmar_despacho",
        }:
            return queryset.select_for_update()
        return queryset.select_related("verificado_por", "asignado_por", "despachado_por", "repartidor")

    def get_serializer_class(self):
        if self.action == "create":
            return PedidoRegistroSerializer
        return PedidoConsultaSerializer

    @action(detail=False, methods=["get"], url_path="estadisticas")
    def estadisticas(self, request):
        """Tres reportes de negocio para administración, filtrados en hora local."""
        if not (request.user.is_superuser or request.user.rol == Usuario.Rol.ADMINISTRADOR):
            raise PermissionDenied("Solo administración puede consultar los reportes.")

        periodo = request.query_params.get("periodo", "hoy")
        hoy = timezone.localdate()
        if periodo == "hoy":
            fecha_inicio, fecha_fin = hoy, hoy + timedelta(days=1)
        elif periodo == "semana":
            fecha_inicio = hoy - timedelta(days=hoy.weekday())
            fecha_fin = fecha_inicio + timedelta(days=7)
        elif periodo == "mes":
            fecha_inicio = hoy.replace(day=1)
            fecha_fin = (fecha_inicio.replace(day=28) + timedelta(days=4)).replace(day=1)
        else:
            raise ValidationError({"periodo": "Elige hoy, semana o mes."})

        inicio = timezone.make_aware(datetime.combine(fecha_inicio, time.min))
        fin = timezone.make_aware(datetime.combine(fecha_fin, time.min))

        # El registro es la fecha de venta disponible; los pedidos cancelados
        # no cuentan como productos vendidos.
        cantidades = {}
        detalles = DetallePedido.objects.select_related("pedido", "producto").filter(
            pedido__fecha_creacion__gte=inicio,
            pedido__fecha_creacion__lt=fin,
        ).exclude(pedido__estado=Pedido.Estado.CANCELADO)
        for detalle in detalles:
            hora = timezone.localtime(detalle.pedido.fecha_creacion).strftime("%Y-%m-%d %H:00")
            clave = (hora, detalle.producto_id, detalle.producto.nombre)
            cantidades[clave] = cantidades.get(clave, 0) + detalle.cantidad
        productos_por_hora = [
            {"hora": hora, "producto_id": producto_id, "producto": nombre, "cantidad": cantidad}
            for (hora, producto_id, nombre), cantidad in cantidades.items()
        ]
        productos_por_hora.sort(key=lambda fila: (fila["hora"], -fila["cantidad"], fila["producto"]))

        duraciones = []
        preparaciones = Pedido.objects.filter(
            hora_fin_preparacion__gte=inicio,
            hora_fin_preparacion__lt=fin,
            hora_inicio_preparacion__isnull=False,
        ).values_list("hora_inicio_preparacion", "hora_fin_preparacion")
        for hora_inicio, hora_fin in preparaciones:
            segundos = (hora_fin - hora_inicio).total_seconds()
            if segundos >= 0:
                duraciones.append(segundos)
        tiempo_promedio = (
            round(sum(duraciones) / len(duraciones) / 60, 1) if duraciones else None
        )

        incidencias_contadas = dict(
            Incidencia.objects.filter(
                fecha_registro__gte=inicio, fecha_registro__lt=fin,
            ).values("pedido__modalidad_entrega").annotate(cantidad=Count("id"))
            .values_list("pedido__modalidad_entrega", "cantidad")
        )
        incidencias_por_modalidad = [
            {"modalidad": modalidad, "cantidad": incidencias_contadas.get(modalidad, 0)}
            for modalidad in Pedido.ModalidadEntrega.values
        ]

        return Response({
            "periodo": periodo,
            "inicio": inicio.isoformat(),
            "fin_exclusivo": fin.isoformat(),
            "productos_por_hora": productos_por_hora,
            "tiempo_promedio_preparacion_minutos": tiempo_promedio,
            "pedidos_preparados": len(duraciones),
            "incidencias_por_modalidad": incidencias_por_modalidad,
        })

    def create(self, request, *args, **kwargs):
        serializador_registro = self.get_serializer(data=request.data)
        serializador_registro.is_valid(raise_exception=True)
        pedido_registrado = serializador_registro.save()

        # Se responde con el serializer de consulta para incluir
        # código generado, total calculado y estado.
        respuesta_pedido = PedidoConsultaSerializer(pedido_registrado)
        return Response(respuesta_pedido.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="editar")
    def editar(self, request, pk=None):
        """Modifica productos y observaciones sin cambiar el estado del pedido."""
        if request.user.is_superuser or request.user.rol != Usuario.Rol.CAJERO:
            raise PermissionDenied("Solo el personal de caja puede editar pedidos.")

        pedido = self.get_object()
        if pedido.estado not in (Pedido.Estado.REGISTRADO, Pedido.Estado.EN_COLA):
            raise ValidationError(
                {"estado": "Solo se pueden editar pedidos registrados o en cola."}
            )

        entrada = PedidoEdicionSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        detalles_actuales = list(pedido.detalles.select_related("producto").order_by("id"))
        cantidades_actuales = {}
        lineas_actuales = {}
        for detalle in detalles_actuales:
            cantidades_actuales[detalle.producto_id] = (
                cantidades_actuales.get(detalle.producto_id, 0) + detalle.cantidad
            )
            lineas_actuales.setdefault(detalle.producto_id, []).append(detalle)

        cantidades_nuevas = {
            detalle["producto"].pk: detalle["cantidad"]
            for detalle in entrada.validated_data["detalles"]
        }
        observaciones_nuevas = entrada.validated_data.get(
            "observaciones", pedido.observaciones
        )
        if (
            cantidades_nuevas == cantidades_actuales
            and observaciones_nuevas == pedido.observaciones
        ):
            raise ValidationError({"detalles": "No hay cambios para guardar."})

        ids_productos = set(cantidades_actuales) | set(cantidades_nuevas)
        productos = {
            producto.pk: producto
            for producto in Producto.objects.select_for_update()
            .filter(pk__in=ids_productos).order_by("pk")
        }
        for producto_id, cantidad_nueva in cantidades_nuevas.items():
            cantidad_adicional = cantidad_nueva - cantidades_actuales.get(producto_id, 0)
            if cantidad_adicional <= 0:
                continue
            producto = productos[producto_id]
            if not producto.activo:
                raise ValidationError(
                    {"detalles": f"{producto.nombre} ya no está disponible."}
                )
            if producto.stock_disponible < cantidad_adicional:
                raise ValidationError({
                    "detalles": (
                        f"Stock insuficiente para {producto.nombre}. "
                        f"Disponible: {producto.stock_disponible}."
                    )
                })

        total_anterior = sum(detalle.subtotal for detalle in detalles_actuales)
        cambios = []
        for producto_id in sorted(ids_productos):
            diferencia = cantidades_nuevas.get(producto_id, 0) - cantidades_actuales.get(producto_id, 0)
            if diferencia == 0:
                continue
            producto = productos[producto_id]
            Producto.objects.filter(pk=producto_id).update(
                stock_disponible=F("stock_disponible") - diferencia
            )
            if diferencia > 0:
                cambios.append(f"Se agregó {diferencia} {producto.nombre}.")
            else:
                cambios.append(f"Se quitó {-diferencia} {producto.nombre}.")

        for producto_id, lineas in lineas_actuales.items():
            cantidad_nueva = cantidades_nuevas.get(producto_id, 0)
            if not cantidad_nueva:
                pedido.detalles.filter(producto_id=producto_id).delete()
                continue
            principal = lineas[0]
            if principal.cantidad != cantidad_nueva:
                principal.cantidad = cantidad_nueva
                principal.save(update_fields=["cantidad"])
            if len(lineas) > 1:
                pedido.detalles.filter(pk__in=[linea.pk for linea in lineas[1:]]).delete()

        for producto_id, cantidad_nueva in cantidades_nuevas.items():
            if producto_id not in lineas_actuales:
                DetallePedido.objects.create(
                    pedido=pedido,
                    producto=productos[producto_id],
                    cantidad=cantidad_nueva,
                    precio_unitario_congelado=productos[producto_id].precio_unitario,
                )

        if observaciones_nuevas != pedido.observaciones:
            pedido.observaciones = observaciones_nuevas
            cambios.append("Se actualizaron las observaciones.")
        pedido.save(update_fields=["observaciones", "fecha_actualizacion"])
        pedido.refresh_from_db()
        EdicionPedido.objects.create(
            pedido=pedido,
            modificado_por=request.user,
            descripcion=" ".join(cambios),
            total_anterior=total_anterior,
            total_nuevo=pedido.total,
        )
        return Response(PedidoConsultaSerializer(pedido).data)

    @action(detail=False, methods=["get"], url_path="cola-produccion")
    def cola_produccion(self, request):

        pedidos_en_cola = self.get_queryset().filter(estado=Pedido.Estado.EN_COLA)
        pedidos_ordenados = sorted(
            pedidos_en_cola,
            key=lambda pedido: (pedido.prioridad, pedido.fecha_creacion, pedido.id),
        )
        return Response(PedidoConsultaSerializer(pedidos_ordenados, many=True).data)

    @action(detail=False, methods=["get"], url_path="seguimiento-produccion")
    def seguimiento_produccion(self, request):
        """Muestra los pedidos en preparación y los que ya están listos."""
        pedidos = self.get_queryset().filter(
            estado__in=[Pedido.Estado.EN_PREPARACION, Pedido.Estado.LISTO]
        )
        return Response(PedidoConsultaSerializer(pedidos, many=True).data)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="enviar-a-produccion")
    def enviar_a_produccion(self, request, pk=None):
        """RF-03: envía un pedido registrado a la cola de producción."""
        pedido = self.get_object()

        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.EN_COLA,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )

        pedido.estado = Pedido.Estado.EN_COLA
        pedido.save(update_fields=["estado"])

        return Response(PedidoConsultaSerializer(pedido).data, status=status.HTTP_200_OK)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="iniciar-preparacion")
    def iniciar_preparacion(self, request, pk=None):
        """Inicia la preparación solo si hay insumos y los descuenta una vez."""
        if request.user.is_superuser or request.user.rol != Usuario.Rol.COCINERO:
            raise PermissionDenied("Solo el personal de cocina puede iniciar la preparación.")
        pedido = self.get_object()
        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.EN_PREPARACION,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )

        detalles = list(pedido.detalles.select_related("producto"))
        if not detalles:
            raise ValidationError({"detalles": "El pedido no tiene productos para preparar."})

        recetas = RecetaInsumo.objects.filter(
            producto_id__in=[detalle.producto_id for detalle in detalles]
        )
        recetas_por_producto = {}
        for receta in recetas:
            recetas_por_producto.setdefault(receta.producto_id, []).append(receta)

        insumos_necesarios = {}
        for detalle in detalles:
            receta_producto = recetas_por_producto.get(detalle.producto_id)
            if not receta_producto:
                raise ValidationError(
                    {"insumos": f"Configura los insumos de {detalle.producto.nombre}."}
                )
            for receta in receta_producto:
                insumos_necesarios[receta.insumo_id] = (
                    insumos_necesarios.get(receta.insumo_id, 0)
                    + receta.cantidad * detalle.cantidad
                )

        insumos = {
            insumo.id: insumo
            for insumo in Insumo.objects.select_for_update()
            .filter(id__in=insumos_necesarios)
            .order_by("id")
        }
        faltantes = [
            f"{insumos[id_insumo].nombre}: se necesitan {cantidad} y hay "
            f"{insumos[id_insumo].stock_disponible}"
            for id_insumo, cantidad in insumos_necesarios.items()
            if insumos[id_insumo].stock_disponible < cantidad
        ]
        if faltantes:
            raise ValidationError({"insumos": "Stock insuficiente de " + ", ".join(faltantes)})

        for id_insumo, cantidad in insumos_necesarios.items():
            insumo = insumos[id_insumo]
            insumo.stock_disponible -= cantidad
            insumo.save(update_fields=["stock_disponible"])

        pedido.estado = Pedido.Estado.EN_PREPARACION
        pedido.hora_inicio_preparacion = timezone.now()
        pedido.save(update_fields=["estado", "hora_inicio_preparacion", "fecha_actualizacion"])
        return Response(PedidoConsultaSerializer(pedido).data)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="marcar-listo")
    def marcar_listo(self, request, pk=None):

        if request.user.is_superuser or request.user.rol != Usuario.Rol.COCINERO:
            raise PermissionDenied("Solo el personal de cocina puede marcar un pedido como listo.")
        pedido = self.get_object()
        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.LISTO,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )

        pedido.estado = Pedido.Estado.LISTO
        pedido.hora_fin_preparacion = timezone.now()
        pedido.save(update_fields=["estado", "hora_fin_preparacion", "fecha_actualizacion"])
        return Response(PedidoConsultaSerializer(pedido).data)

    @action(detail=False, methods=["get"], url_path="despacho")
    def despacho(self, request):
        """Solo los pedidos listos o despachados entran al panel de Despacho."""
        if not (request.user.is_superuser or request.user.rol in (
            Usuario.Rol.DESPACHADOR, Usuario.Rol.ADMINISTRADOR
        )):
            raise PermissionDenied("Solo Despacho y Administración consultan este panel.")
        pedidos = self.get_queryset().filter(
            estado__in=(Pedido.Estado.LISTO, Pedido.Estado.DESPACHADO)
        )
        return Response(PedidoConsultaSerializer(pedidos, many=True).data)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="verificar-despacho")
    def verificar_despacho(self, request, pk=None):
        if request.user.is_superuser or request.user.rol != Usuario.Rol.DESPACHADOR:
            raise PermissionDenied("Solo el personal de despacho puede verificar pedidos.")
        pedido = self.get_object()
        if pedido.estado != Pedido.Estado.LISTO:
            raise ValidationError({"estado": "Solo se pueden verificar pedidos listos."})
        if pedido.fecha_verificacion:
            raise ValidationError({"verificacion": "El pedido ya fue verificado."})
        datos = VerificacionPedidoEntradaSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        detalle_ids = list(pedido.detalles.values_list("id", flat=True))
        confirmados = datos.validated_data["detalles_confirmados"]
        if not detalle_ids or len(confirmados) != len(detalle_ids) or set(confirmados) != set(detalle_ids):
            raise ValidationError({"detalles_confirmados": "Confirma todos los productos y cantidades del pedido una sola vez."})
        if not datos.validated_data["empaque_confirmado"]:
            raise ValidationError({"empaque_confirmado": "Confirma que el pedido esté completo y correctamente empacado."})
        if not datos.validated_data["observaciones_confirmadas"]:
            raise ValidationError({"observaciones_confirmadas": "Revisa las observaciones antes de verificar."})
        pedido.verificado_por = request.user
        pedido.fecha_verificacion = timezone.now()
        pedido.save(update_fields=["verificado_por", "fecha_verificacion", "fecha_actualizacion"])
        EventoDespacho.objects.create(
            pedido=pedido, tipo=EventoDespacho.Tipo.VERIFICACION, usuario=request.user,
            descripcion="Pedido completo, cantidades, empaque y observaciones verificados.",
        )
        pedido._prefetched_objects_cache.pop("eventos_despacho", None)
        return Response(PedidoConsultaSerializer(pedido).data)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="asignar-repartidor")
    def asignar_repartidor(self, request, pk=None):
        if request.user.is_superuser or request.user.rol != Usuario.Rol.DESPACHADOR:
            raise PermissionDenied("Solo el personal de despacho puede asignar repartidores.")
        pedido = self.get_object()
        if pedido.estado != Pedido.Estado.LISTO or pedido.modalidad_entrega != Pedido.ModalidadEntrega.DELIVERY:
            raise ValidationError({"pedido": "Solo se asignan repartidores a pedidos Delivery listos."})
        if not pedido.fecha_verificacion:
            raise ValidationError({"verificacion": "Verifica el pedido antes de asignar repartidor."})
        if pedido.repartidor_id:
            raise ValidationError({"repartidor": "El pedido ya tiene un repartidor asignado."})
        datos = AsignacionRepartidorEntradaSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        repartidor = get_object_or_404(
            Repartidor.objects.select_for_update(), pk=datos.validated_data["repartidor_id"]
        )
        if not repartidor.activo or not repartidor.disponible:
            raise ValidationError({"repartidor": "El repartidor no está disponible."})
        repartidor.disponible = False
        repartidor.save(update_fields=["disponible"])
        pedido.repartidor = repartidor
        pedido.asignado_por = request.user
        pedido.fecha_asignacion = timezone.now()
        pedido.save(update_fields=["repartidor", "asignado_por", "fecha_asignacion", "fecha_actualizacion"])
        EventoDespacho.objects.create(
            pedido=pedido, tipo=EventoDespacho.Tipo.ASIGNACION, usuario=request.user,
            descripcion=f"Se asignó a {repartidor.nombre} para la entrega Delivery.",
        )
        pedido._prefetched_objects_cache.pop("eventos_despacho", None)
        return Response(PedidoConsultaSerializer(pedido).data)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="confirmar-despacho")
    def confirmar_despacho(self, request, pk=None):
        if request.user.is_superuser or request.user.rol != Usuario.Rol.DESPACHADOR:
            raise PermissionDenied("Solo el personal de despacho puede confirmar despachos.")
        pedido = self.get_object()
        if pedido.estado != Pedido.Estado.LISTO:
            raise ValidationError({"estado": "Solo se pueden despachar pedidos listos."})
        if not pedido.hora_fin_preparacion or not pedido.detalles.exists():
            raise ValidationError({"preparacion": "El pedido debe tener productos preparados por Cocina."})
        if not pedido.fecha_verificacion:
            raise ValidationError({"verificacion": "Verifica el pedido antes de despacharlo."})
        if pedido.modalidad_entrega == Pedido.ModalidadEntrega.DELIVERY and not pedido.repartidor_id:
            raise ValidationError({"repartidor": "Asigna un repartidor antes de despachar un Delivery."})
        validators.validar_transicion_estado(
            estado_actual=pedido.estado,
            estado_nuevo=Pedido.Estado.DESPACHADO,
            estados_orden=Pedido.ESTADOS_ORDEN,
        )
        pedido.estado = Pedido.Estado.DESPACHADO
        pedido.despachado_por = request.user
        pedido.fecha_despacho = timezone.now()
        pedido.save(update_fields=["estado", "despachado_por", "fecha_despacho", "fecha_actualizacion"])
        EventoDespacho.objects.create(
            pedido=pedido, tipo=EventoDespacho.Tipo.DESPACHO, usuario=request.user,
            descripcion=(
                f"Pedido entregado al repartidor {pedido.repartidor.nombre}."
                if pedido.modalidad_entrega == Pedido.ModalidadEntrega.DELIVERY
                else "Pedido entregado al cliente."
            ),
        )
        # El producto se reserva en Caja y los insumos se consumen en Cocina.
        # Un segundo descuento aquí alteraría dos veces el mismo inventario.
        pedido._prefetched_objects_cache.pop("eventos_despacho", None)
        return Response(PedidoConsultaSerializer(pedido).data)
