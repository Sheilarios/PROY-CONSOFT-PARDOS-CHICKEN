import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Producto(models.Model):
    """Catálogo de productos vendidos por el local (pollo a la brasa y afines)."""

    nombre = models.CharField(max_length=120)
    imagen = models.ImageField(upload_to="productos/", blank=True)
    precio_unitario = models.DecimalField(max_digits=8, decimal_places=2)
    stock_disponible = models.PositiveIntegerField(default=0)
    tiempo_preparacion_minutos = models.PositiveSmallIntegerField(
        default=10, help_text="Usado en el Incremento 2 para calcular tiempos de cola."
    )
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} (stock: {self.stock_disponible})"

    def hay_stock_suficiente(self, cantidad: int) -> bool:
        """RN-01: valida disponibilidad de stock en tiempo real."""
        return self.activo and self.stock_disponible >= cantidad


class Insumo(models.Model):
    """Material disponible para preparar productos de la carta."""

    nombre = models.CharField(max_length=120, unique=True)
    unidad = models.CharField(max_length=30, default="unidades")
    stock_disponible = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Insumo"
        verbose_name_plural = "Insumos"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.stock_disponible} {self.unidad})"


class RecetaInsumo(models.Model):
    """Cantidad de un insumo necesaria para una unidad de producto."""

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name="receta")
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT, related_name="recetas")
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        verbose_name = "Insumo de la receta"
        verbose_name_plural = "Insumos de la receta"
        constraints = [
            models.UniqueConstraint(
                fields=["producto", "insumo"], name="receta_producto_insumo_unico"
            )
        ]

    def __str__(self):
        return (
            f"{self.producto.nombre}: {self.cantidad} {self.insumo.unidad} "
            f"de {self.insumo.nombre}"
        )


class Cliente(models.Model):
    """Cliente registrado para buscarlo por nombre en caja."""

    nombre = models.CharField(max_length=120)
    telefono = models.CharField(max_length=9, unique=True)

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Repartidor(models.Model):
    """Repartidor propio disponible para un pedido Delivery a la vez."""

    nombre = models.CharField(max_length=120)
    telefono = models.CharField(max_length=9, unique=True)
    zona = models.CharField(max_length=120, blank=True)
    activo = models.BooleanField(default=True)
    disponible = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Pedido(models.Model):
    """
    Pedido registrado por caja (RF-01, RF-02, RF-03).

    RN-03: la producción avanza secuencialmente por ESTADOS_ORDEN.
    Una incidencia registrada por caja cierra el pedido antes de prepararlo.
    """

    class ModalidadEntrega(models.TextChoices):
        SALON = "SALON", "Salón"
        RECOJO = "RECOJO", "Recojo en mostrador"
        DELIVERY = "DELIVERY", "Delivery"

    class Estado(models.TextChoices):
        REGISTRADO = "REGISTRADO", "Registrado"
        EN_COLA = "EN_COLA", "En cola"
        EN_PREPARACION = "EN_PREPARACION", "En preparación"
        LISTO = "LISTO", "Listo"
        DESPACHADO = "DESPACHADO", "Despachado"
        CANCELADO = "CANCELADO", "Cancelado"


    ESTADOS_ORDEN = [
        Estado.REGISTRADO,
        Estado.EN_COLA,
        Estado.EN_PREPARACION,
        Estado.LISTO,
        Estado.DESPACHADO,
    ]

    codigo = models.CharField(max_length=12, unique=True, editable=False)
    cliente = models.ForeignKey(
        Cliente, on_delete=models.SET_NULL, null=True, blank=True, related_name="pedidos"
    )
    cliente_nombre = models.CharField(max_length=120, blank=True)
    cliente_telefono = models.CharField(max_length=9, blank=True)
    direccion_delivery = models.CharField(max_length=200, blank=True)
    observaciones = models.CharField(max_length=500, blank=True, default="")

    modalidad_entrega = models.CharField(max_length=10, choices=ModalidadEntrega.choices)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.REGISTRADO)

    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pedidos_registrados"
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    hora_inicio_preparacion = models.DateTimeField(null=True, blank=True)
    hora_fin_preparacion = models.DateTimeField(null=True, blank=True)
    verificado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="pedidos_verificados",
    )
    fecha_verificacion = models.DateTimeField(null=True, blank=True)
    repartidor = models.ForeignKey(
        Repartidor, on_delete=models.PROTECT, null=True, blank=True,
        related_name="pedidos_asignados",
    )
    asignado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="pedidos_asignados_por_usuario",
    )
    fecha_asignacion = models.DateTimeField(null=True, blank=True)
    despachado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="pedidos_despachados",
    )
    fecha_despacho = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Pedido"
        verbose_name_plural = "Pedidos"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Pedido {self.codigo} - {self.get_estado_display()}"

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = self._generar_codigo_unico()
        super().save(*args, **kwargs)

    @staticmethod
    def _generar_codigo_unico() -> str:
        """RF-02: genera un código único legible para cada pedido aceptado."""
        return f"PC-{uuid.uuid4().hex[:8].upper()}"

    @property
    def total(self):
        """Calcula el total del pedido en función del detalle registrado."""
        return sum(detalle.subtotal for detalle in self.detalles.all())

    @property
    def prioridad(self) -> int:

        orden = {
            self.ModalidadEntrega.SALON: 1,
            self.ModalidadEntrega.DELIVERY: 2,
            self.ModalidadEntrega.RECOJO: 3,
        }
        return orden[self.modalidad_entrega]


class DetallePedido(models.Model):
    """Línea de detalle: producto + cantidad dentro de un pedido."""

    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="detalles")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_unitario_congelado = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        verbose_name = "Detalle de pedido"
        verbose_name_plural = "Detalles de pedido"

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre}"

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario_congelado


class Incidencia(models.Model):
    """Problema de un pedido registrado por caja, cocina o despacho."""

    class Tipo(models.TextChoices):
        DEMORA = "DEMORA", "Demora"
        CANCELACION = "CANCELACION", "Cancelación"
        ERROR = "ERROR", "Error en el pedido"
        DEVOLUCION = "DEVOLUCION", "Devolución"
        ERROR_PRODUCTOS = "ERROR_PRODUCTOS", "Producto o cantidad incorrectos"
        ERROR_MODALIDAD = "ERROR_MODALIDAD", "Modalidad de entrega incorrecta"
        ERROR_CLIENTE = "ERROR_CLIENTE", "Datos del cliente incorrectos"
        FALTA_INSUMOS = "FALTA_INSUMOS", "Falta inesperada de insumos"
        PRODUCTO_DANADO = "PRODUCTO_DANADO", "Producto dañado o en mal estado"
        EQUIPO_AVERIADO = "EQUIPO_AVERIADO", "Avería de equipo de cocina"
        ERROR_PREPARACION = "ERROR_PREPARACION", "Error en la preparación"
        DEMORA_COCINA = "DEMORA_COCINA", "Demora inesperada"
        OTRO_COCINA = "OTRO_COCINA", "Otro motivo de cocina"
        PEDIDO_INCOMPLETO = "PEDIDO_INCOMPLETO", "Pedido incompleto"
        PRODUCTO_INCORRECTO = "PRODUCTO_INCORRECTO", "Producto incorrecto"
        PRODUCTO_DANADO_DESPACHO = "PRODUCTO_DANADO_DESPACHO", "Producto dañado en despacho"
        REPARTIDOR_NO_DISPONIBLE = "REPARTIDOR_NO_DISPONIBLE", "Repartidor no disponible"
        DEMORA_DESPACHO = "DEMORA_DESPACHO", "Demora en despacho"
        PROBLEMA_ENTREGA = "PROBLEMA_ENTREGA", "Problema con la entrega"
        OTRO_DESPACHO = "OTRO_DESPACHO", "Otro motivo de despacho"

    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="incidencias")
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    descripcion = models.TextField(blank=True)
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Incidencia"
        verbose_name_plural = "Incidencias"


class EdicionPedido(models.Model):
    """Registro de una modificación hecha en caja antes de la preparación."""

    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="ediciones")
    modificado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField()
    total_anterior = models.DecimalField(max_digits=10, decimal_places=2)
    total_nuevo = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "Edición de pedido"
        verbose_name_plural = "Ediciones de pedidos"
        ordering = ["-fecha", "-id"]


class EventoDespacho(models.Model):
    """Trazabilidad de las operaciones de Despacho sobre un pedido."""

    class Tipo(models.TextChoices):
        VERIFICACION = "VERIFICACION", "Verificación"
        ASIGNACION = "ASIGNACION", "Asignación de repartidor"
        DESPACHO = "DESPACHO", "Despacho"

    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="eventos_despacho")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.CharField(max_length=250)

    class Meta:
        ordering = ["-fecha", "-id"]
