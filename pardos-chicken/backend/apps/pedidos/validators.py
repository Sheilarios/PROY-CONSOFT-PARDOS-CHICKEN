"""
Programación defensiva del módulo de pedidos (Capítulo 5.2 del documento):

- Validación de stock disponible al momento del registro (RN-01).
- Validación de formato de datos ingresados (teléfono, dirección).
- Validación de transición de estados (RN-03 / RN-04), reutilizada en el
  Incremento 2 cuando se actualice el estado de preparación.
"""
import re
from rest_framework.exceptions import ValidationError

TELEFONO_REGEX = re.compile(r"^9\d{8}$")  # celular peruano: 9 dígitos, empieza en 9


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
    """
    RN-01: un pedido solo se registra si TODOS los productos solicitados
    tienen stock suficiente. Se valida todo antes de descontar nada,
    evitando estados intermedios inconsistentes.

    detalles_solicitados: lista de tuplas (producto, cantidad)
    """
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
    """
    RN-04: un pedido no puede retroceder de estado ni saltarse pasos.
    Solo se permite avanzar al estado inmediatamente siguiente.
    """
    if estado_actual not in estados_orden or estado_nuevo not in estados_orden:
        raise ValidationError({"estado": "Estado de pedido desconocido."})

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
