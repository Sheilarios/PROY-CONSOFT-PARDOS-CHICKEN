import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Producto(models.Model):
    """Catálogo de productos vendidos por el local (pollo a la brasa y afines)."""

    nombre = models.CharField(max_length=120)
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


class Pedido(models.Model):
    """
    Pedido registrado por caja (RF-01, RF-02, RF-03).

    RN-03: cada pedido transita secuencialmente por los estados definidos
    en ESTADOS_ORDEN. La validación de esa transición se hace en
    apps/pedidos/validators.py (programación defensiva).
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

    # Orden estricto de transición (RN-03/RN-04). Se usa desde validators.py.
    ESTADOS_ORDEN = [
        Estado.REGISTRADO,
        Estado.EN_COLA,
        Estado.EN_PREPARACION,
        Estado.LISTO,
        Estado.DESPACHADO,
    ]

    codigo = models.CharField(max_length=12, unique=True, editable=False)
    cliente_nombre = models.CharField(max_length=120, blank=True)
    cliente_telefono = models.CharField(max_length=9, blank=True)
    direccion_delivery = models.CharField(max_length=200, blank=True)

    modalidad_entrega = models.CharField(max_length=10, choices=ModalidadEntrega.choices)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.REGISTRADO)

    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pedidos_registrados"
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    # Campos que se completan en los incrementos 2 y 3 (se dejan listos desde ahora)
    hora_inicio_preparacion = models.DateTimeField(null=True, blank=True)
    hora_fin_preparacion = models.DateTimeField(null=True, blank=True)

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
        """
        RN-02: prioridad numérica según modalidad de entrega.
        Menor número = mayor prioridad. 1) Salón 2) Delivery 3) Recojo.
        """
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
    """
    Modelo base para el Incremento 4 (RF-10), se deja definido desde ahora
    porque el diagrama de clases del proyecto ya lo contempla.
    """

    class Tipo(models.TextChoices):
        DEMORA = "DEMORA", "Demora"
        CANCELACION = "CANCELACION", "Cancelación"
        ERROR = "ERROR", "Error en el pedido"
        DEVOLUCION = "DEVOLUCION", "Devolución"

    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="incidencias")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    descripcion = models.TextField(blank=True)
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Incidencia"
        verbose_name_plural = "Incidencias"
