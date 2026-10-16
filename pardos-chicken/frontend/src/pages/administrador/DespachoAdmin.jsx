import React, { useMemo, useState } from "react";

// ----------------------------------------------------------------------
// Datos de ejemplo (luego vendrán del backend)
// ----------------------------------------------------------------------
const PEDIDOS_INICIALES = [
  {
    id: "#P0012",
    modalidad: "Delivery",
    hora: "11:25",
    tiempoListo: "Hace 8 min",
    productos: "1/2 Pollo, Papas, Gaseosa",
    estado: "Listo",
    accion: "Asignar entrega",
    destino: "Sin asignar",
  },
  {
    id: "#P0010",
    modalidad: "Recojo",
    hora: "11:30",
    tiempoListo: "Hace 5 min",
    productos: "Pollo entero, Papas",
    estado: "Listo",
    accion: "Marcar entregado",
    destino: "En mostrador",
  },
  {
    id: "#P0008",
    modalidad: "Salón",
    hora: "11:32",
    tiempoListo: "Hace 3 min",
    productos: "1/4 Pollo, Ensalada",
    estado: "Listo",
    accion: "Marcar entregado",
    destino: "Mesa 08",
  },
  {
    id: "#P0011",
    modalidad: "Delivery",
    hora: "11:40",
    tiempoListo: "Hace 2 min",
    productos: "Pollo entero, Ensalada",
    estado: "En camino",
    accion: "Ver seguimiento",
    destino: "Luis Ramos",
  },
  {
    id: "#P0013",
    modalidad: "Salón",
    hora: "11:48",
    tiempoListo: "Hace 1 min",
    productos: "1/4 Pollo, Papas",
    estado: "En camino",
    accion: "Ver detalle",
    destino: "Mesa 03",
  },
];

// ----------------------------------------------------------------------
// Helpers de estilo por modalidad y estado
// ----------------------------------------------------------------------
const MODALIDAD_STYLES = {
  Delivery: "bg-rose-50 text-rose-700",
  Recojo: "bg-indigo-50 text-blue-800",
  Salón: "bg-yellow-50 text-yellow-800",
};

const ESTADO_STYLES = {
  Listo: "bg-green-100 text-green-700",
  "En camino": "bg-indigo-50 text-blue-800",
  Entregado: "bg-violet-100 text-purple-800",
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function DespachoAdmin() {
  const [filtroEstado, setFiltroEstado] = useState("Listos");
  const [filtroModalidad, setFiltroModalidad] = useState("Todas");

  const pedidosFiltrados = useMemo(() => {
    return PEDIDOS_INICIALES.filter((p) => {
      const okEstado =
        filtroEstado === "Listos"
          ? p.estado === "Listo"
          : filtroEstado === "En camino"
            ? p.estado === "En camino"
            : filtroEstado === "Entregados"
              ? p.estado === "Entregado"
              : true;

      const okModalidad =
        filtroModalidad === "Todas" ? true : p.modalidad === filtroModalidad;

      return okEstado && okModalidad;
    });
  }, [filtroEstado, filtroModalidad]);

  const contarPorEstado = (estado) =>
    PEDIDOS_INICIALES.filter((p) => p.estado === estado).length;

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Despacho
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Pedidos listos, en camino y entregados.
        </p>
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: `Listos (${contarPorEstado("Listo")})`, valor: "Listos" },
            {
              label: `En camino (${contarPorEstado("En camino")})`,
              valor: "En camino",
            },
            {
              label: `Entregados (${contarPorEstado("Entregado")})`,
              valor: "Entregados",
            },
          ].map((f) => {
            const active = filtroEstado === f.valor;
            return (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltroEstado(f.valor)}
                className={`px-4 h-10 rounded-md text-xs font-semibold transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-600 border border-orange-600"
                    : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <select
          value={filtroModalidad}
          onChange={(e) => setFiltroModalidad(e.target.value)}
          className="h-10 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
        >
          <option value="Todas">Todas las modalidades</option>
          <option value="Delivery">Delivery</option>
          <option value="Recojo">Recojo</option>
          <option value="Salón">Salón</option>
        </select>
      </div>

      {/* ---------- Tabla ---------- */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "# Pedido",
                  "Modalidad",
                  "Hora",
                  "Tiempo listo",
                  "Productos",
                  "Estado",
                  "Acción",
                  "Destino",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-xs font-semibold text-slate-800 font-['Inter']"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No hay pedidos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-3 py-3 text-xs font-semibold text-slate-800 font-['Inter']">
                      {p.id}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded text-xs font-semibold font-['Inter'] ${
                          MODALIDAD_STYLES[p.modalidad] ||
                          "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {p.modalidad}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.hora}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.tiempoListo}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.productos}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded text-xs font-semibold font-['Inter'] ${
                          ESTADO_STYLES[p.estado] ||
                          "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 transition-colors whitespace-nowrap"
                      >
                        {p.accion}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.destino}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Banner informativo ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          Despacha primero los pedidos listos según modalidad y hora de salida.
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          {PEDIDOS_INICIALES.filter((p) => p.estado !== "Entregado").length}{" "}
          pedidos activos
        </span>
      </div>
    </div>
  );
}
