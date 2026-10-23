from rest_framework import serializers
from django.db import transaction

from .models import Producto, Cliente, Pedido, DetallePedido, Incidencia
from . import validators


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "precio_unitario",
            "stock_disponible",
            "tiempo_preparacion_minutos",
            "activo",
        ]


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
        source="producto", queryset=Producto.objects.filter(activo=True)
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

        detalles_solicitados = [
            (detalle["producto"], detalle["cantidad"])
            for detalle in datos_pedido.get("detalles", [])
        ]
        if not detalles_solicitados:
            raise serializers.ValidationError(
                {"detalles": "Debe registrar al menos un producto en el pedido."}
            )
        validators.validar_stock_de_detalles(detalles_solicitados)
        return datos_pedido

    @transaction.atomic
    def create(self, datos_pedido_validados):
        detalles_pedido = datos_pedido_validados.pop("detalles")
        usuario_que_registra = self.context["request"].user

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
            producto = detalle["producto"]
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
