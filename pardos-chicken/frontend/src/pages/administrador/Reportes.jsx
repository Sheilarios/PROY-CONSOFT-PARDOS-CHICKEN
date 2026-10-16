import React, { useMemo, useState } from "react";

// ----------------------------------------------------------------------
// Datos de ejemplo (luego vendrán del backend)
// ----------------------------------------------------------------------
const STATS_EJEMPLO = {
  ventasDelDia: 684.0,
  pedidosDelDia: 15,
  ticketPromedio: 45.6,
  tiempoCocina: 14,
  entregasCompletadas: 5,
  entregasProgramadas: 7,
};

const PRODUCTOS_MAS_VENDIDOS = [
  { nombre: "Pollo a la brasa", cantidad: 14 },
  { nombre: "Papas familiares", cantidad: 11 },
  { nombre: "Gaseosa 1.5 L", cantidad: 9 },
  { nombre: "Ensalada", cantidad: 5 },
];

const PEDIDOS_POR_MODALIDAD = [
  { modalidad: "Salón", cantidad: 6 },
  { modalidad: "Delivery", cantidad: 5 },
  { modalidad: "Recojo", cantidad: 4 },
];

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
const formatSoles = (n) =>
  `S/ ${n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function Reportes() {
  const [periodo, setPeriodo] = useState("hoy");

  // Cálculo del máximo para escalar las barras
  const maxProducto = useMemo(
    () => Math.max(...PRODUCTOS_MAS_VENDIDOS.map((p) => p.cantidad), 1),
    [],
  );

  const totalModalidad = useMemo(
    () => PEDIDOS_POR_MODALIDAD.reduce((acc, m) => acc + m.cantidad, 0),
    [],
  );

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
            Reportes
          </h1>
          <p className="text-xs text-slate-500 font-['Inter']">
            Ventas, preparación y entregas del día.
          </p>
        </div>

        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="h-10 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
        >
          <option value="hoy">Hoy</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
        </select>
      </div>

      {/* ---------- Tarjetas de stats ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Ventas del día"
          valor={formatSoles(STATS_EJEMPLO.ventasDelDia)}
          sub={`${STATS_EJEMPLO.pedidosDelDia} pedidos`}
        />
        <StatCard
          label="Ticket promedio"
          valor={formatSoles(STATS_EJEMPLO.ticketPromedio)}
          sub="Por pedido"
        />
        <StatCard
          label="Tiempo de cocina"
          valor={`${STATS_EJEMPLO.tiempoCocina} min`}
          sub="Promedio"
        />
        <StatCard
          label="Entregas completadas"
          valor={STATS_EJEMPLO.entregasCompletadas}
          sub={`De ${STATS_EJEMPLO.entregasProgramadas} programadas`}
        />
      </div>

      {/* ---------- Paneles ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== Productos más vendidos ===== */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-800 font-['Inter']">
            Productos más vendidos
          </h2>

          <div className="flex flex-col gap-3">
            {PRODUCTOS_MAS_VENDIDOS.map((p) => {
              const porcentaje = (p.cantidad / maxProducto) * 100;
              return (
                <div key={p.nombre} className="flex items-center gap-3">
                  <span className="w-40 text-xs text-slate-800 font-['Inter'] shrink-0">
                    {p.nombre}
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-orange-600 rounded-full transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-slate-800 font-['Inter']">
                    {p.cantidad}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== Pedidos por modalidad ===== */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-800 font-['Inter']">
            Pedidos por modalidad
          </h2>

          <div className="flex flex-col gap-3">
            {PEDIDOS_POR_MODALIDAD.map((m) => {
              const porcentaje =
                totalModalidad > 0 ? (m.cantidad / totalModalidad) * 100 : 0;
              return (
                <div
                  key={m.modalidad}
                  className="bg-slate-50 rounded-md p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800 font-['Inter']">
                      {m.modalidad}
                    </span>
                    <span className="text-xs font-semibold text-orange-600 font-['Inter']">
                      {m.cantidad} pedidos
                    </span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-orange-600 rounded-full transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-['Inter']">Total</span>
            <span className="text-sm font-bold text-slate-800 font-['Inter']">
              {totalModalidad} pedidos
            </span>
          </div>
        </div>
      </div>

      {/* ---------- Banner inferior ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          Cifras de ejemplo para revisar la composición antes de conectar datos
          reales.
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter'] capitalize">
          Período: {periodo}
        </span>
      </div>
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
