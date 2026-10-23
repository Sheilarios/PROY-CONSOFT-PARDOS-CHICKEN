from rest_framework import serializers
from django.db import transaction
from pathlib import Path
from PIL import Image

from .models import Producto, Cliente, Pedido, DetallePedido, Incidencia, EdicionPedido
from . import validators


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "imagen",
            "precio_unitario",
            "stock_disponible",
            "tiempo_preparacion_minutos",
            "activo",
        ]
        read_only_fields = ["id", "activo"]

    def validate_nombre(self, nombre):
        nombre = nombre.strip()
        if not nombre:
            raise serializers.ValidationError("El nombre del producto es obligatorio.")
        existentes = Producto.objects.filter(nombre__iexact=nombre)
        if self.instance:
            existentes = existentes.exclude(pk=self.instance.pk)
        if existentes.exists():
            raise serializers.ValidationError("Ya existe un producto con ese nombre.")
        return nombre

    def validate_precio_unitario(self, precio):
        if precio <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a cero.")
        return precio

    def validate_tiempo_preparacion_minutos(self, minutos):
        if minutos < 1:
            raise serializers.ValidationError("El tiempo debe ser mayor a cero.")
        return minutos

    def validate_imagen(self, archivo):
        if archivo.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("La imagen no debe superar 5 MB.")
        extension = Path(archivo.name).suffix.lower()
        if extension not in (".jpg", ".jpeg", ".png"):
            raise serializers.ValidationError("Sube una imagen JPG o PNG.")
        try:
            archivo.seek(0)
            formato = Image.open(archivo).format
        except (OSError, ValueError):
            raise serializers.ValidationError("La imagen no es válida.")
        finally:
            archivo.seek(0)
        if (formato == "JPEG" and extension not in (".jpg", ".jpeg")) or (
            formato == "PNG" and extension != ".png"
        ) or formato not in ("JPEG", "PNG"):
            raise serializers.ValidationError("El archivo debe ser una imagen JPG o PNG.")
        return archivo


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["id", "nombre", "telefono"]
        read_only_fields = ["id"]

    def validate_telefono(self, telefono):
        if not validators.TELEFONO_REGEX.match(telefono):
            raise serializers.ValidationError(
                "El teléfono debe tener 9 dígitos y empezar con 9."
            )
        return telefono


class DetallePedidoEntradaSerializer(serializers.Serializer):
    """Serializer de entrada (no ModelSerializer) para validar el detalle
    antes de tocar la base de datos: separa claramente entrada vs. modelo."""

    producto_id = serializers.PrimaryKeyRelatedField(
        source="producto", queryset=Producto.objects.all()
    )
    cantidad = serializers.IntegerField(min_value=1)


class DetallePedidoSalidaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = DetallePedido
        fields = [
            "id",
            "producto",
            "producto_nombre",
            "cantidad",
            "precio_unitario_congelado",
            "subtotal",
        ]


class PedidoRegistroSerializer(serializers.ModelSerializer):
    """
    RF-01 / RF-02: registra un pedido validando stock y modalidad de
    entrega, y genera un código único al aceptarlo.
    """

    detalles = DetallePedidoEntradaSerializer(many=True, write_only=True)
    cliente_id = serializers.PrimaryKeyRelatedField(
        source="cliente", queryset=Cliente.objects.all(), required=False, write_only=True
    )

    class Meta:
        model = Pedido
        fields = [
            "id",
            "codigo",
            "cliente_id",
            "cliente_nombre",
            "cliente_telefono",
            "direccion_delivery",
            "observaciones",
            "modalidad_entrega",
            "estado",
            "detalles",
        ]
        read_only_fields = ["id", "codigo", "estado"]

    def validate(self, datos_pedido):
        cliente_registrado = datos_pedido.get("cliente")
        if cliente_registrado:
            datos_pedido["cliente_nombre"] = cliente_registrado.nombre
            datos_pedido["cliente_telefono"] = cliente_registrado.telefono

        validators.validar_telefono(datos_pedido.get("cliente_telefono", ""))
        validators.validar_direccion_delivery(
            datos_pedido["modalidad_entrega"], datos_pedido.get("direccion_delivery", "")
        )

        # Un producto aparece una sola vez aunque llegue repetido en la entrada.
        detalles_por_producto = {}
        for detalle in datos_pedido.get("detalles", []):
            producto_id = detalle["producto"].pk
            if producto_id in detalles_por_producto:
                detalles_por_producto[producto_id]["cantidad"] += detalle["cantidad"]
            else:
                detalles_por_producto[producto_id] = detalle.copy()
        datos_pedido["detalles"] = list(detalles_por_producto.values())

        detalles_solicitados = [
            (detalle["producto"], detalle["cantidad"])
            for detalle in datos_pedido["detalles"]
        ]
        if not detalles_solicitados:
            raise serializers.ValidationError(
                {"detalles": "Debe registrar al menos un producto en el pedido."}
            )
        productos_inactivos = [
            producto.nombre for producto, _ in detalles_solicitados if not producto.activo
        ]
        if productos_inactivos:
            raise serializers.ValidationError(
                {"detalles": "Productos no disponibles: " + ", ".join(productos_inactivos)}
            )
        validators.validar_stock_de_detalles(detalles_solicitados)
        return datos_pedido

    @transaction.atomic
    def create(self, datos_pedido_validados):
        detalles_pedido = datos_pedido_validados.pop("detalles")
        usuario_que_registra = self.context["request"].user

        # La validación inicial pudo quedar desactualizada antes de guardar.
        productos = {
            producto.pk: producto
            for producto in Producto.objects.select_for_update().filter(
                pk__in=[detalle["producto"].pk for detalle in detalles_pedido]
            ).order_by("pk")
        }
        productos_inactivos = [
            productos[detalle["producto"].pk].nombre
            for detalle in detalles_pedido
            if not productos[detalle["producto"].pk].activo
        ]
        if productos_inactivos:
            raise serializers.ValidationError(
                {"detalles": "Productos no disponibles: " + ", ".join(productos_inactivos)}
            )
        validators.validar_stock_de_detalles([
            (productos[detalle["producto"].pk], detalle["cantidad"])
            for detalle in detalles_pedido
        ])

        nombre_cliente = datos_pedido_validados.get("cliente_nombre", "").strip()
        telefono_cliente = datos_pedido_validados.get("cliente_telefono", "")
        if (
            not datos_pedido_validados.get("cliente")
            and nombre_cliente
            and telefono_cliente
        ):
            datos_pedido_validados["cliente_nombre"] = nombre_cliente
            cliente_registrado = Cliente.objects.filter(telefono=telefono_cliente).first()
            if (
                cliente_registrado
                and cliente_registrado.nombre.casefold() != nombre_cliente.casefold()
            ):
                raise serializers.ValidationError(
                    {
                        "cliente_telefono": (
                            "Este teléfono pertenece a otro cliente. Corrige los datos."
                        )
                    }
                )
            if not cliente_registrado:
                cliente_registrado = Cliente.objects.create(
                    nombre=nombre_cliente, telefono=telefono_cliente
                )
            datos_pedido_validados["cliente"] = cliente_registrado

        pedido = Pedido.objects.create(
            registrado_por=usuario_que_registra,
            estado=Pedido.Estado.REGISTRADO,
            **datos_pedido_validados,
        )

        for detalle in detalles_pedido:
            producto = productos[detalle["producto"].pk]
            cantidad = detalle["cantidad"]

            DetallePedido.objects.create(
                pedido=pedido,
                producto=producto,
                cantidad=cantidad,
                precio_unitario_congelado=producto.precio_unitario,
            )
            # Reserva de stock (Regla 1 del diagrama de complejidad esencial)
            producto.stock_disponible -= cantidad
            producto.save(update_fields=["stock_disponible"])

        return pedido


class PedidoEdicionSerializer(serializers.Serializer):
    """Lista final de productos y observaciones de un pedido existente."""

    detalles = DetallePedidoEntradaSerializer(many=True)
    observaciones = serializers.CharField(max_length=500, allow_blank=True, required=False)

    def validate_detalles(self, detalles):
        if not detalles:
            raise serializers.ValidationError("El pedido debe conservar al menos un producto.")

        detalles_por_producto = {}
        for detalle in detalles:
            producto_id = detalle["producto"].pk
            if producto_id in detalles_por_producto:
                detalles_por_producto[producto_id]["cantidad"] += detalle["cantidad"]
            else:
                detalles_por_producto[producto_id] = detalle.copy()
        return list(detalles_por_producto.values())


class PedidoConsultaSerializer(serializers.ModelSerializer):
    """RF-03: consulta de pedidos registrados con su estado actual."""

    detalles = DetallePedidoSalidaSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    prioridad = serializers.IntegerField(read_only=True)
    registrado_por_nombre = serializers.CharField(
        source="registrado_por.get_full_name", read_only=True
    )

    class Meta:
        model = Pedido
        fields = [
            "id",
            "codigo",
            "cliente_nombre",
            "cliente_telefono",
            "direccion_delivery",
            "observaciones",
            "modalidad_entrega",
            "estado",
            "prioridad",
            "total",
            "detalles",
            "registrado_por_nombre",
            "fecha_creacion",
            "fecha_actualizacion",
            "hora_inicio_preparacion",
            "hora_fin_preparacion",
        ]


class IncidenciaSerializer(serializers.ModelSerializer):
    pedido_id = serializers.PrimaryKeyRelatedField(
        source="pedido", queryset=Pedido.objects.all()
    )
    pedido_codigo = serializers.CharField(source="pedido.codigo", read_only=True)
    pedido_cliente = serializers.CharField(source="pedido.cliente_nombre", read_only=True)
    pedido_estado = serializers.CharField(source="pedido.estado", read_only=True)
    registrado_por_nombre = serializers.SerializerMethodField()
    rol_registrador = serializers.CharField(source="registrado_por.rol", read_only=True)
    tipo = serializers.ChoiceField(
        choices=[
            Incidencia.Tipo.CANCELACION,
            Incidencia.Tipo.ERROR_PRODUCTOS,
            Incidencia.Tipo.ERROR_MODALIDAD,
            Incidencia.Tipo.ERROR_CLIENTE,
        ]
    )
    descripcion = serializers.CharField(max_length=500)

    class Meta:
        model = Incidencia
        fields = [
            "id",
            "pedido_id",
            "pedido_codigo",
            "pedido_cliente",
            "pedido_estado",
            "tipo",
            "descripcion",
            "registrado_por_nombre",
            "rol_registrador",
            "fecha_registro",
        ]
        read_only_fields = ["id", "fecha_registro"]

    def get_registrado_por_nombre(self, incidencia):
        usuario = incidencia.registrado_por
        return usuario.get_full_name() or usuario.username


class EdicionPedidoSerializer(serializers.ModelSerializer):
    pedido_id = serializers.IntegerField(source="pedido.id", read_only=True)
    pedido_codigo = serializers.CharField(source="pedido.codigo", read_only=True)
    pedido_cliente = serializers.CharField(source="pedido.cliente_nombre", read_only=True)
    pedido_estado = serializers.CharField(source="pedido.estado", read_only=True)
    modificado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = EdicionPedido
        fields = [
            "id", "pedido_id", "pedido_codigo", "pedido_cliente", "pedido_estado",
            "descripcion", "total_anterior", "total_nuevo", "modificado_por_nombre",
            "fecha",
        ]

    def get_modificado_por_nombre(self, edicion):
        usuario = edicion.modificado_por
        return usuario.get_full_name() or usuario.username
