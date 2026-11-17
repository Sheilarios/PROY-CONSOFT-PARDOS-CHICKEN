const IDIOMA_FECHAS = "es-PE";
const OPCIONES_HORA = { hour: "2-digit", minute: "2-digit" };

export function formatearHora(valor) {
  return new Date(valor).toLocaleTimeString(IDIOMA_FECHAS, OPCIONES_HORA);
}

export function formatearFechaHora(valor, opciones) {
  return new Date(valor).toLocaleString(IDIOMA_FECHAS, opciones);
}
