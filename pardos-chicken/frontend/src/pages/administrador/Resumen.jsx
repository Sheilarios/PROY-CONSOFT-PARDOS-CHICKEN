import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const STATS = {
  pedidosHoy: 15,
  enCocina: 10,
  enPreparacion: 3,
  listosParaDespacho: 3,
  ventasDelDia: 684.0,
  ticketPromedio: 45.6,
};

const PEDIDOS_RECIENTES = [
  {
    id: "#P0012",
    hora: "11:25",
    cliente: "Cliente mostrador",
    modalidad: "Delivery",
    productos: "1/2 Pollo, Papas familiares, Gaseosa 1.5 L",
    total: 54.0,
    estado: "En cola",
  },
  {
    id: "#P0010",
    hora: "11:30",
    cliente: "Cliente mostrador",
    modalidad: "Recojo",
    productos: "1 Pollo entero, Papas familiares",
    total: 54.0,
    estado: "En cola",
  },
  {
    id: "#P0008",
    hora: "11:32",
    cliente: "Cliente mostrador",
    modalidad: "Salón",
    productos: "1/4 Pollo, Ensalada, Gaseosa",
    total: 54.0,
    estado: "En cola",
  },
  {
    id: "#P0011",
    hora: "11:40",
    cliente: "Cliente mostrador",
    modalidad: "Delivery",
    productos: "1 Pollo entero, Papas, Ensalada",
    total: 54.0,
    estado: "En preparación",
  },
  {
    id: "#P0013",
    hora: "11:48",
    cliente: "Cliente mostrador",
    modalidad: "Salón",
    productos: "1/4 Pollo, Papas familiares",
    total: 54.0,
    estado: "En preparación",
  },
];

const HISTORIAL_RECIENTE = [
  {
    id: "#P0012",
    area: "Cocina",
    descripcion: "Marcado listo para despacho",
    hora: "11:45",
  },
  {
    id: "#P0012",
    area: "Despacho",
    descripcion: "Pedido entregado al cliente",
    hora: "11:50",
  },
  {
    id: "#P0014",
    area: "Administración",
    descripcion: "Estado corregido por error",
    hora: "11:56",
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
  Despachado: "bg-violet-100 text-purple-800",
  Cancelado: "bg-rose-50 text-red-700",
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function Resumen() {
  const navigate = useNavigate();

  const handleVerDetalle = (id) => {
    navigate(`/admin/pedidos/detalle?id=${id}`);
  };

  const handleVerHistorial = () => {
    navigate("/admin/historial");
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
            Resumen
          </h1>
          <p className="text-xs text-slate-500 font-['Inter']">
            Vista general de caja, cocina y despacho.
          </p>
        </div>

        <div className="px-4 py-1.5 bg-blue-100 rounded-full">
          <span className="text-xs font-bold text-blue-800 font-['Inter'] uppercase">
            Administrador
          </span>
        </div>
      </div>

      {/* ---------- Tarjetas de stats ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pedidos de hoy"
          valor={STATS.pedidosHoy}
          sub="+3 frente a ayer"
        />
        <StatCard
          label="En cocina"
          valor={STATS.enCocina}
          sub={`${STATS.enPreparacion} en preparación`}
        />
        <StatCard
          label="Listos para despacho"
          valor={STATS.listosParaDespacho}
          sub="Pendientes de entrega"
        />
        <StatCard
          label="Ventas del día"
          valor={`S/ ${STATS.ventasDelDia.toFixed(2)}`}
          sub={`Ticket promedio S/ ${STATS.ticketPromedio.toFixed(2)}`}
        />
      </div>

      {/* ---------- Tabla de pedidos recientes ---------- */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 font-['Inter']">
            Pedidos recientes
          </h2>
          <button
            type="button"
            onClick={() => navigate("/admin/pedidos")}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            Ver todos →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "# Pedido",
                  "Hora",
                  "Cliente",
                  "Modalidad",
                  "Productos",
                  "Total",
                  "Estado",
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
              {PEDIDOS_RECIENTES.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No hay pedidos registrados hoy.
                  </td>
                </tr>
              ) : (
                PEDIDOS_RECIENTES.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-3 py-3 text-xs font-semibold text-slate-800 font-['Inter']">
                      {p.id}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.hora}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.cliente}
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
                      {p.productos}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      S/ {p.total.toFixed(2)}
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
                        onClick={() => handleVerDetalle(p.id)}
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

      {/* ---------- Historial reciente ---------- */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
            Historial reciente
          </h2>
          <button
            type="button"
            onClick={handleVerHistorial}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            Ver historial →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {HISTORIAL_RECIENTE.map((h, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-200 rounded-md p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                  {h.id} · {h.area}
                </span>
                <span className="text-xs text-slate-500 font-['Inter']">
                  {h.hora}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-['Inter']">
                {h.descripcion}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Banner inferior ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          Vista general de caja, cocina y despacho para administración.
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          Actualizado 11:56
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente
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
