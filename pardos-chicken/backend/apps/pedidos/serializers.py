from rest_framework import serializers
from django.db import transaction

from .models import Producto, Pedido, DetallePedido
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

    class Meta:
        model = Pedido
        fields = [
            "id",
            "codigo",
            "cliente_nombre",
            "cliente_telefono",
            "direccion_delivery",
            "modalidad_entrega",
            "estado",
            "detalles",
        ]
        read_only_fields = ["id", "codigo", "estado"]

    def validate(self, datos):
        validators.validar_telefono(datos.get("cliente_telefono", ""))
        validators.validar_direccion_delivery(
            datos["modalidad_entrega"], datos.get("direccion_delivery", "")
        )

        detalles_solicitados = [
            (d["producto"], d["cantidad"]) for d in datos.get("detalles", [])
        ]
        if not detalles_solicitados:
            raise serializers.ValidationError(
                {"detalles": "Debe registrar al menos un producto en el pedido."}
            )
        validators.validar_stock_de_detalles(detalles_solicitados)
        return datos

    @transaction.atomic
    def create(self, datos_validados):
        detalles_datos = datos_validados.pop("detalles")
        usuario = self.context["request"].user

        pedido = Pedido.objects.create(
            registrado_por=usuario,
            estado=Pedido.Estado.REGISTRADO,
            **datos_validados,
        )

        for detalle in detalles_datos:
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
            "modalidad_entrega",
            "estado",
            "total",
            "detalles",
            "registrado_por_nombre",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
