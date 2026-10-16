import React, { useMemo, useState } from "react";
import DetalleProduccion from "./DetalleProduccion";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const PEDIDOS_INICIALES = [
  {
    id: "#P0012",
    modalidad: "Delivery",
    antiguedad: "Hace 18 min",
    productos: "1/2 Pollo, Papas familiares, Gaseosa 1.5 L",
    estado: "En cola",
    ingreso: "11:25",
    tiempoEnCocina: "18 min",
    tiempoEstimado: "15 min",
    prioridad: "Normal",
    observaciones: ["Sin ají", "Papas bien doradas"],
    detalleProductos: [
      { icono: "🍗", nombre: "1/2 Pollo a la brasa", cantidad: 1 },
      { icono: "🍟", nombre: "Papas familiares", cantidad: 1 },
      { icono: "🥤", nombre: "Gaseosa 1.5 L", cantidad: 1 },
    ],
    historial: [
      {
        hora: "11:25",
        estado: "En cola",
        descripcion: "Pedido enviado a cocina.",
        responsable: "Sistema (Caja)",
      },
    ],
  },
  {
    id: "#P0010",
    modalidad: "Recojo",
    antiguedad: "Hace 13 min",
    productos: "1 Pollo entero, Papas familiares",
    estado: "En cola",
    ingreso: "11:30",
    tiempoEnCocina: "13 min",
    tiempoEstimado: "15 min",
    prioridad: "Normal",
    observaciones: [],
    detalleProductos: [
      { icono: "🍗", nombre: "1 Pollo entero", cantidad: 1 },
      { icono: "🍟", nombre: "Papas familiares", cantidad: 1 },
    ],
    historial: [
      {
        hora: "11:30",
        estado: "En cola",
        descripcion: "Pedido enviado a cocina.",
        responsable: "Sistema (Caja)",
      },
    ],
  },
  {
    id: "#P0008",
    modalidad: "Salón",
    antiguedad: "Hace 11 min",
    productos: "1/4 Pollo, Ensalada, Gaseosa",
    estado: "En cola",
    ingreso: "11:32",
    tiempoEnCocina: "11 min",
    tiempoEstimado: "15 min",
    prioridad: "Normal",
    observaciones: [],
    detalleProductos: [
      { icono: "🍗", nombre: "1/4 Pollo", cantidad: 1 },
      { icono: "🥗", nombre: "Ensalada", cantidad: 1 },
      { icono: "🥤", nombre: "Gaseosa", cantidad: 1 },
    ],
    historial: [
      {
        hora: "11:32",
        estado: "En cola",
        descripcion: "Pedido enviado a cocina.",
        responsable: "Sistema (Caja)",
      },
    ],
  },
  {
    id: "#P0011",
    modalidad: "Delivery",
    antiguedad: "Hace 3 min",
    productos: "1 Pollo entero, Papas, Ensalada",
    estado: "En cola",
    ingreso: "11:40",
    tiempoEnCocina: "3 min",
    tiempoEstimado: "15 min",
    prioridad: "Normal",
    observaciones: [],
    detalleProductos: [
      { icono: "🍗", nombre: "1 Pollo entero", cantidad: 1 },
      { icono: "🍟", nombre: "Papas", cantidad: 1 },
      { icono: "🥗", nombre: "Ensalada", cantidad: 1 },
    ],
    historial: [
      {
        hora: "11:40",
        estado: "En cola",
        descripcion: "Pedido enviado a cocina.",
        responsable: "Sistema (Caja)",
      },
    ],
  },
  {
    id: "#P0013",
    modalidad: "Salón",
    antiguedad: "Hace 2 min",
    productos: "1/4 Pollo, Papas familiares",
    estado: "En preparación",
    ingreso: "11:48",
    tiempoEnCocina: "2 min",
    tiempoEstimado: "15 min",
    prioridad: "Normal",
    observaciones: [],
    detalleProductos: [
      { icono: "🍗", nombre: "1/4 Pollo", cantidad: 1 },
      { icono: "🍟", nombre: "Papas familiares", cantidad: 1 },
    ],
    historial: [
      {
        hora: "11:48",
        estado: "En cola",
        descripcion: "Pedido enviado a cocina.",
        responsable: "Sistema (Caja)",
      },
      {
        hora: "11:50",
        estado: "En preparación",
        descripcion: "Preparación iniciada.",
        responsable: "Carlos Ruiz",
      },
    ],
  },
  {
    id: "#P0014",
    modalidad: "Delivery",
    antiguedad: "Hace 1 min",
    productos: "1 Pollo entero, Gaseosa 1.5 L",
    estado: "En preparación",
    ingreso: "11:50",
    tiempoEnCocina: "1 min",
    tiempoEstimado: "15 min",
    prioridad: "Normal",
    observaciones: [],
    detalleProductos: [
      { icono: "🍗", nombre: "1 Pollo entero", cantidad: 1 },
      { icono: "🥤", nombre: "Gaseosa 1.5 L", cantidad: 1 },
    ],
    historial: [
      {
        hora: "11:50",
        estado: "En cola",
        descripcion: "Pedido enviado a cocina.",
        responsable: "Sistema (Caja)",
      },
      {
        hora: "11:52",
        estado: "En preparación",
        descripcion: "Preparación iniciada.",
        responsable: "Carlos Ruiz",
      },
    ],
  },
];

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
export default function Produccion() {
  const [filtroEstado, setFiltroEstado] = useState("En cola");
  const [filtroModalidad, setFiltroModalidad] = useState("Todas");
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  // Contadores
  const stats = useMemo(() => {
    const enCola = PEDIDOS_INICIALES.filter(
      (p) => p.estado === "En cola",
    ).length;
    const enPrep = PEDIDOS_INICIALES.filter(
      (p) => p.estado === "En preparación",
    ).length;
    const listos = PEDIDOS_INICIALES.filter((p) => p.estado === "Listo").length;
    return { enCola, enPrep, listos, tiempoMedio: "14 min" };
  }, []);

  // Filtrado
  const pedidosFiltrados = useMemo(() => {
    return PEDIDOS_INICIALES.filter((p) => {
      const okEstado =
        filtroEstado === "Todas" ? true : p.estado === filtroEstado;
      const okModalidad =
        filtroModalidad === "Todas" ? true : p.modalidad === filtroModalidad;
      return okEstado && okModalidad;
    });
  }, [filtroEstado, filtroModalidad]);

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Producción
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Seguimiento de la preparación de pedidos.
        </p>
      </div>

      {/* ---------- Tarjetas de stats ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="En cola"
          valor={stats.enCola}
          sub="Esperando preparación"
        />
        <StatCard
          label="En preparación"
          valor={stats.enPrep}
          sub="Pedidos activos"
        />
        <StatCard label="Listos" valor={stats.listos} sub="Para despacho" />
        <StatCard
          label="Tiempo medio"
          valor={stats.tiempoMedio}
          sub="Desde ingreso a listo"
        />
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: `En cola (${stats.enCola})`, valor: "En cola" },
            {
              label: `En preparación (${stats.enPrep})`,
              valor: "En preparación",
            },
            { label: `Listo (${stats.listos})`, valor: "Listo" },
            { label: "Todos", valor: "Todas" },
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
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "# Pedido",
                  "Modalidad",
                  "Antigüedad",
                  "Productos",
                  "Estado",
                  "Ingreso",
                  "Acción",
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
                    colSpan={7}
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
                      {p.antiguedad}
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
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.ingreso}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setPedidoSeleccionado(p)}
                        className="px-4 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded hover:bg-slate-50 transition-colors"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Modal de detalle ---------- */}
      {pedidoSeleccionado && (
        <DetalleProduccion
          pedido={{
            id: pedidoSeleccionado.id,
            modalidad: pedidoSeleccionado.modalidad,
            estado: pedidoSeleccionado.estado,
            ingreso: pedidoSeleccionado.ingreso,
            tiempoEnCocina: pedidoSeleccionado.tiempoEnCocina,
            tiempoEstimado: pedidoSeleccionado.tiempoEstimado,
            prioridad: pedidoSeleccionado.prioridad,
            observaciones: pedidoSeleccionado.observaciones,
            productos: pedidoSeleccionado.detalleProductos,
            seguimiento: [
              { label: "Ingreso a cocina", hora: pedidoSeleccionado.ingreso },
              { label: "Inicio de preparación", hora: "--:--" },
              { label: "Finalización", hora: "--:--" },
              {
                label: "Tiempo transcurrido",
                hora: pedidoSeleccionado.tiempoEnCocina,
              },
              {
                label: "Tiempo estimado",
                hora: pedidoSeleccionado.tiempoEstimado,
              },
            ],
            historial: pedidoSeleccionado.historial,
          }}
          onClose={() => setPedidoSeleccionado(null)}
          onVerPedido={() => {
            // Aquí podrías navegar con useNavigate
            alert(`Ver pedido completo: ${pedidoSeleccionado.id}`);
            setPedidoSeleccionado(null);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente StatCard
// ----------------------------------------------------------------------
function StatCard({ label, valor, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-1.5">
      <span className="text-xs text-slate-500 font-medium font-['Inter']">
        {label}
      </span>
      <span className="text-2xl font-bold text-slate-800 font-['Inter']">
        {valor}
      </span>
      <span className="text-xs text-orange-600 font-['Inter']">{sub}</span>
    </div>
  );
}
