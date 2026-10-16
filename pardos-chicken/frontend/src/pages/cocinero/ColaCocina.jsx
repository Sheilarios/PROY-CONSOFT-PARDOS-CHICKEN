import React, { useMemo, useState } from "react";
import { pedidosService } from "../../api/pedidosService";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const PEDIDOS_INICIALES = [
  {
    id: "#P0012",
    modalidad: "Delivery",
    hora: "11:25",
    tiempoEnCola: "18 min",
    productos: "1/2 Pollo, Papas familiares, Gaseosa 1.5 L",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0010",
    modalidad: "Recojo",
    hora: "11:30",
    tiempoEnCola: "13 min",
    productos: "1 Pollo entero, Papas familiares",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0008",
    modalidad: "Salón",
    hora: "11:32",
    tiempoEnCola: "11 min",
    productos: "1/4 Pollo, Ensalada, Gaseosa",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0011",
    modalidad: "Delivery",
    hora: "11:40",
    tiempoEnCola: "3 min",
    productos: "1 Pollo entero, Papas, Ensalada",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0013",
    modalidad: "Salón",
    hora: "11:48",
    tiempoEnCola: "2 min",
    productos: "1/4 Pollo, Papas familiares",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0014",
    modalidad: "Delivery",
    hora: "11:50",
    tiempoEnCola: "1 min",
    productos: "1 Pollo entero, Gaseosa 1.5 L",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0015",
    modalidad: "Recojo",
    hora: "11:52",
    tiempoEnCola: "1 min",
    productos: "1/2 Pollo, Ensalada, Papas",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0016",
    modalidad: "Salón",
    hora: "11:54",
    tiempoEnCola: "1 min",
    productos: "Papas familiares, Gaseosa 1.5 L",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0017",
    modalidad: "Delivery",
    hora: "11:55",
    tiempoEnCola: "1 min",
    productos: "1/4 Pollo, Papas, Ensalada",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
  {
    id: "#P0018",
    modalidad: "Recojo",
    hora: "11:56",
    tiempoEnCola: "1 min",
    productos: "1 Pollo entero, Papas familiares",
    estado: "En cola",
    inicio: "--:--",
    fin: "--:--",
  },
];

// ----------------------------------------------------------------------
// Estilos
// ----------------------------------------------------------------------
const MODALIDAD_STYLES = {
  Delivery: "bg-rose-50 text-rose-700",
  Recojo: "bg-indigo-50 text-blue-800",
  Salón: "bg-yellow-50 text-yellow-800",
};

const ESTADO_STYLES = {
  "En cola": "bg-rose-50 text-rose-700",
  "En preparación": "bg-indigo-50 text-blue-800",
  Listo: "bg-green-100 text-green-700",
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function ColaCocina() {
  const [pedidos, setPedidos] = useState(PEDIDOS_INICIALES);
  const [filtroEstado, setFiltroEstado] = useState("En cola");
  const [filtroModalidad, setFiltroModalidad] = useState("Todas");

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const okEstado =
        filtroEstado === "Todos" ? true : p.estado === filtroEstado;
      const okModalidad =
        filtroModalidad === "Todas" ? true : p.modalidad === filtroModalidad;
      return okEstado && okModalidad;
    });
  }, [pedidos, filtroEstado, filtroModalidad]);

  const contar = (estado) => pedidos.filter((p) => p.estado === estado).length;

  // ---------- Acciones ----------
  const iniciarPreparacion = (id) => {
    const hora = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, estado: "En preparación", inicio: hora } : p,
      ),
    );
    // await pedidosService.marcarComoPreparado(id); // cuando tengas backend
  };

  const marcarListo = (id) => {
    const hora = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: "Listo", fin: hora } : p)),
    );
    // await pedidosService.enviarAProduccion(id);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
            Cola de cocina
          </h1>
          <p className="text-xs text-slate-500 font-['Inter']">
            Pedidos ordenados por modalidad y antigüedad.
          </p>
        </div>

        <div className="px-4 py-1.5 bg-orange-100 rounded-full">
          <span className="text-xs font-bold text-orange-600 font-['Inter'] uppercase">
            Cocinero
          </span>
        </div>
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: `En cola (${contar("En cola")})`, valor: "En cola" },
            {
              label: `En preparación (${contar("En preparación")})`,
              valor: "En preparación",
            },
            { label: `Listo (${contar("Listo")})`, valor: "Listo" },
            { label: "Todos", valor: "Todos" },
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
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "# Pedido",
                  "Modalidad",
                  "Hora",
                  "Tiempo en cola",
                  "Productos",
                  "Estado",
                  "Acción",
                  "Inicio",
                  "Fin",
                  "Incidencia",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-slate-800 font-['Inter']"
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
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-slate-500"
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
                      {p.tiempoEnCola}
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
                      {p.estado === "En cola" && (
                        <button
                          type="button"
                          onClick={() => iniciarPreparacion(p.id)}
                          className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 transition-colors whitespace-nowrap"
                        >
                          Iniciar preparación
                        </button>
                      )}
                      {p.estado === "En preparación" && (
                        <button
                          type="button"
                          onClick={() => marcarListo(p.id)}
                          className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          Marcar listo
                        </button>
                      )}
                      {p.estado === "Listo" && (
                        <span className="text-xs text-green-700 font-semibold font-['Inter']">
                          ✓ Completado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.inicio}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.fin}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-white border border-orange-600 text-orange-600 text-xs font-medium rounded hover:bg-orange-50 transition-colors whitespace-nowrap"
                      >
                        Registrar incidencia
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Banner inferior ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          La cola de cocina se ordena por modalidad y antigüedad (tiempo en
          cola).
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          Total en cola: {contar("En cola")} pedidos
        </span>
      </div>
    </div>
  );
}
