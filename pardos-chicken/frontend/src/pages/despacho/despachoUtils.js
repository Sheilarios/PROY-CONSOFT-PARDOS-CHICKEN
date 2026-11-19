import { formatearFechaHora } from "../../utils/fechas";

export const MODALIDADES = { SALON: "Salón", RECOJO: "Recojo", DELIVERY: "Delivery" };
export const ESTADOS = {
  REGISTRADO: "Registrado",
  EN_COLA: "En cola",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  DESPACHADO: "Despachado",
  CANCELADO: "Cancelado",
};

export const fecha = (valor) => valor
  ? formatearFechaHora(valor, { dateStyle: "short", timeStyle: "short" })
  : "—";

export function mensajeError(error, fallback = "No se pudo completar la operación.") {
  const datos = error.response?.data;
  if (!datos) return fallback;
  const valor = Object.values(datos).find(Boolean);
  if (Array.isArray(valor)) return String(valor[0]);
  if (typeof valor === "string") return valor;
  return fallback;
}

export const productos = (pedido) => pedido.detalles
  .map((detalle) => `${detalle.cantidad} × ${detalle.producto_nombre}`).join(", ");
