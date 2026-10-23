from django.contrib import admin
from .models import (
    Producto, Insumo, RecetaInsumo, Cliente, Pedido, DetallePedido, Incidencia,
)


class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 0
    readonly_fields = ["precio_unitario_congelado"]


class RecetaInsumoInline(admin.TabularInline):
    model = RecetaInsumo
    extra = 1


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "precio_unitario", "stock_disponible", "activo"]
    list_filter = ["activo"]
    search_fields = ["nombre"]
    inlines = [RecetaInsumoInline]


@admin.register(Insumo)
class InsumoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "stock_disponible", "unidad"]
    search_fields = ["nombre"]


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["nombre", "telefono"]
    search_fields = ["nombre", "telefono"]


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "cliente_nombre", "modalidad_entrega", "estado", "fecha_creacion"]
    list_filter = ["estado", "modalidad_entrega"]
    search_fields = ["codigo", "cliente_nombre", "cliente_telefono"]
    inlines = [DetallePedidoInline]
    readonly_fields = ["codigo", "estado", "fecha_creacion", "fecha_actualizacion"]


@admin.register(Incidencia)
class IncidenciaAdmin(admin.ModelAdmin):
    list_display = ["pedido", "tipo", "registrado_por", "fecha_registro"]
    list_filter = ["tipo"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
