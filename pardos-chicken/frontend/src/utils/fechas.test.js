import { describe, expect, it } from "vitest";
import { formatearFechaHora, formatearHora } from "./fechas";
import { fecha as fechaDespacho } from "../pages/despacho/despachoUtils";

const FECHA = "2026-11-16T19:42:00-05:00";

describe("formatos de fecha anteriores al refactor", () => {
  it("conserva la hora mostrada por Caja y Cocina", () => {
    expect(formatearHora(FECHA)).toBe(
      new Date(FECHA).toLocaleTimeString("es-PE", {
        hour: "2-digit", minute: "2-digit",
      }),
    );
  });

  it("conserva el formato completo del Historial", () => {
    const opciones = {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    };
    expect(formatearFechaHora(FECHA, opciones)).toBe(
      new Date(FECHA).toLocaleString("es-PE", opciones),
    );
  });

  it("conserva la fecha corta y el valor vacío de Despacho", () => {
    expect(fechaDespacho(FECHA)).toBe(
      new Date(FECHA).toLocaleString("es-PE", {
        dateStyle: "short", timeStyle: "short",
      }),
    );
    expect(fechaDespacho(null)).toBe("—");
  });
});
