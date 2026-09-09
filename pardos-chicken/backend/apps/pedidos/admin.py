from django.contrib import admin
from .models import Producto, Pedido, DetallePedido, Incidencia


class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 0
    readonly_fields = ["precio_unitario_congelado"]


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "precio_unitario", "stock_disponible", "activo"]
    list_filter = ["activo"]
    search_fields = ["nombre"]


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "cliente_nombre", "modalidad_entrega", "estado", "fecha_creacion"]
    list_filter = ["estado", "modalidad_entrega"]
    search_fields = ["codigo", "cliente_nombre", "cliente_telefono"]
    inlines = [DetallePedidoInline]
    readonly_fields = ["codigo", "fecha_creacion", "fecha_actualizacion"]


@admin.register(Incidencia)
class IncidenciaAdmin(admin.ModelAdmin):
    list_display = ["pedido", "tipo", "registrado_por", "fecha_registro"]
    list_filter = ["tipo"]
