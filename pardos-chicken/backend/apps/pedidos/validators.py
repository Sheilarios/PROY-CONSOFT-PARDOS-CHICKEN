import re
from rest_framework.exceptions import ValidationError

TELEFONO_REGEX = re.compile(r"^9\d{8}$")  


def validar_telefono(telefono: str) -> None:
    if telefono and not TELEFONO_REGEX.match(telefono):
        raise ValidationError(
            {"cliente_telefono": "El teléfono debe tener 9 dígitos y empezar con 9."}
        )


def validar_direccion_delivery(modalidad: str, direccion: str) -> None:
    if modalidad == "DELIVERY" and not direccion.strip():
        raise ValidationError(
            {"direccion_delivery": "La dirección es obligatoria para pedidos con delivery."}
        )


def validar_stock_de_detalles(detalles_solicitados) -> None:
    productos_sin_stock = []
    for producto, cantidad in detalles_solicitados:
        if not producto.hay_stock_suficiente(cantidad):
            productos_sin_stock.append(producto.nombre)

    if productos_sin_stock:
        raise ValidationError(
            {
                "detalles": (
                    "Stock insuficiente para: " + ", ".join(productos_sin_stock)
                )
            }
        )


def validar_transicion_estado(estado_actual: str, estado_nuevo: str, estados_orden) -> None:
    if estado_actual == estado_nuevo:
        return

    indice_actual = estados_orden.index(estado_actual)
    indice_nuevo = estados_orden.index(estado_nuevo)

    if indice_nuevo != indice_actual + 1:
        raise ValidationError(
            {
                "estado": (
                    f"Transición inválida: no se puede pasar de '{estado_actual}' "
                    f"a '{estado_nuevo}'. El flujo debe ser secuencial."
                )
            }
        )
