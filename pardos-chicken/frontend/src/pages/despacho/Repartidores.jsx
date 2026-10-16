import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const REPARTIDORES_INICIALES = [
  {
    id: 1,
    iniciales: "PR",
    nombre: "Pepe Romero",
    zona: "Lima Norte",
    placa: "ABC-123",
    telefono: "987 111 222",
    estado: "Disponible",
  },
  {
    id: 2,
    iniciales: "LR",
    nombre: "Luis Ramos",
    zona: "Lima Centro",
    placa: "4567-XA",
    telefono: "987 333 444",
    estado: "En ruta",
    pedidoActual: "#P0011",
  },
  {
    id: 3,
    iniciales: "MT",
    nombre: "María Torres",
    zona: "Lima Sur",
    placa: "4567-XA",
    telefono: "987 555 666",
    estado: "Disponible",
  },
];

const PEDIDO_PENDIENTE = {
  id: "#P0011",
  modalidad: "Delivery",
  productos: "Pollo a la brasa, Papas familiares, Gaseosa 1.5 L",
  estado: "Listo",
};

// ----------------------------------------------------------------------
// Estilos
// ----------------------------------------------------------------------
const ESTADO_STYLES = {
  Disponible: "bg-green-100 text-green-800",
  "En ruta": "bg-indigo-50 text-blue-800",
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function Repartidores() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("Todos");

  // ---------- Stats calculadas ----------
  const stats = useMemo(() => {
    const disponibles = REPARTIDORES_INICIALES.filter(
      (r) => r.estado === "Disponible",
    ).length;
    const enRuta = REPARTIDORES_INICIALES.filter(
      (r) => r.estado === "En ruta",
    ).length;
    const sinAsignar = 1; // del pedido listo pendiente
    return { disponibles, enRuta, sinAsignar };
  }, []);

  // ---------- Filtrado ----------
  const repartidoresFiltrados = useMemo(() => {
    if (filtro === "Todos") return REPARTIDORES_INICIALES;
    return REPARTIDORES_INICIALES.filter((r) => r.estado === filtro);
  }, [filtro]);

  // ---------- Acciones ----------
  const asignarPedido = (idRepartidor) => {
    navigate(
      `/despacho/asignar-repartidor?id=${encodeURIComponent(
        PEDIDO_PENDIENTE.id,
      )}&repartidor=${idRepartidor}`,
    );
  };

  const verSeguimiento = (idRepartidor) => {
    // En producción: navigate(`/despacho/seguimiento/${idRepartidor}`)
    alert(`Ver seguimiento del repartidor #${idRepartidor}`);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-800 font-['Inter']">
            Repartidores
          </h1>
          <p className="text-sm text-slate-500 font-['Inter']">
            Disponibilidad y asignación de entregas a domicilio.
          </p>
        </div>

        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="h-10 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Disponible">Disponibles</option>
          <option value="En ruta">En ruta</option>
        </select>
      </div>

      {/* ---------- Tarjetas de stats ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Disponibles"
          valor={stats.disponibles}
          sub="Listos para recibir pedidos"
        />
        <StatCard label="En ruta" valor={stats.enRuta} sub="Entrega en curso" />
        <StatCard
          label="Sin asignar"
          valor={stats.sinAsignar}
          sub="Pedidos delivery listos"
        />
      </div>

      {/* ---------- Grid de repartidores ---------- */}
      {repartidoresFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-sm text-slate-500 font-['Inter']">
            No hay repartidores con este filtro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {repartidoresFiltrados.map((r) => {
            const disponible = r.estado === "Disponible";
            return (
              <div
                key={r.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold font-['Inter'] shrink-0">
                    {r.iniciales}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-base font-bold text-slate-800 font-['Inter'] truncate">
                      {r.nombre}
                    </span>
                    <span className="text-xs text-slate-500 font-['Inter']">
                      {r.zona}
                    </span>
                  </div>
                </div>

                {/* Estado */}
                <span
                  className={`self-start px-3 py-1 rounded text-xs font-semibold font-['Inter'] ${
                    ESTADO_STYLES[r.estado] || "bg-slate-100 text-slate-800"
                  }`}
                >
                  {r.estado}
                  {r.pedidoActual ? ` · ${r.pedidoActual}` : ""}
                </span>

                {/* Info */}
                <div className="flex flex-col gap-1 text-xs font-['Inter']">
                  <InfoRow label="Placa" valor={r.placa} />
                  <InfoRow label="Teléfono" valor={r.telefono} />
                </div>

                {/* Botones */}
                <div className="pt-1">
                  {disponible ? (
                    <button
                      type="button"
                      onClick={() => asignarPedido(r.id)}
                      className="w-full h-10 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors"
                    >
                      Asignar pedido
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => verSeguimiento(r.id)}
                      className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors"
                    >
                      Ver seguimiento
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Pedido listo para asignar ---------- */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800 font-['Inter']">
            Pedido listo para asignar
          </h2>
        </div>

        <div className="p-4 flex flex-wrap items-center gap-3">
          <span className="text-base font-bold text-slate-800 font-['Inter']">
            {PEDIDO_PENDIENTE.id}
          </span>
          <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded text-xs font-semibold font-['Inter']">
            {PEDIDO_PENDIENTE.modalidad}
          </span>
          <span className="flex-1 min-w-[200px] text-xs text-slate-800 font-['Inter']">
            {PEDIDO_PENDIENTE.productos}
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold font-['Inter']">
            {PEDIDO_PENDIENTE.estado}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/despacho/asignar-repartidor?id=${encodeURIComponent(
                  PEDIDO_PENDIENTE.id,
                )}`,
              )
            }
            className="px-5 h-9 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors whitespace-nowrap"
          >
            Asignar repartidor
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponentes
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

function InfoRow({ label, valor }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-800">{valor}</span>
    </div>
  );
}
