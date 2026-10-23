import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function PedidoConfirmado() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const pedido = state?.pedido;

  if (!pedido) {
    return <p>No hay un pedido recién registrado. <button type="button" onClick={() => navigate("/cajero/registrar-pedido")}>Registrar pedido</button></p>;
  }

  return (
    <div className="flex flex-col w-full h-full items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-blue-100 shadow-sm px-6 lg:px-9 py-8 flex flex-col items-center gap-4">
        {/* ---------- Ícono de éxito ---------- */}
        <div className="w-32 h-32 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* ---------- Título y descripción ---------- */}
        <h1 className="text-slate-800 text-2xl font-bold font-['Inter'] text-center">
          ¡Pedido registrado con éxito!
        </h1>
        <p className="text-slate-500 text-sm font-['Inter'] text-center max-w-lg">
          El pedido{" "}
          <span className="font-semibold text-slate-800">{pedido.id}</span> fue
          registrado. Puedes enviarlo a cocina desde la sección Pedidos.
        </p>

        {/* ---------- Badge ID + hora ---------- */}
        <div className="px-4 py-1.5 bg-orange-50 rounded-full">
          <span className="text-orange-600 text-xs font-semibold font-['Inter']">
            {pedido.id} · {pedido.hora}
          </span>
        </div>

        {/* ---------- Separador ---------- */}
        <div className="w-full max-w-2xl h-px bg-blue-100 my-2" />

        {/* ---------- Resumen: modalidad / productos / total ---------- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
          <ResumenCard label="Modalidad" valor={pedido.modalidad} />
          <ResumenCard
            label="Productos"
            valor={`${pedido.cantidadArticulos} artículos`}
          />
          <ResumenCard label="Total" valor={`S/ ${pedido.total.toFixed(2)}`} />
        </div>

        {/* ---------- Checks ---------- */}
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-2xl">
          {pedido.checks.map((check) => (
            <div
              key={check}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-md"
            >
              <span className="text-green-600 font-bold text-sm">✓</span>
              <span className="text-green-600 text-xs font-medium font-['Inter']">
                {check}
              </span>
            </div>
          ))}
        </div>

        {/* ---------- Pregunta ---------- */}
        <p className="text-slate-800 text-lg font-semibold font-['Inter'] mt-2 text-center">
          ¿Vas a realizar otro pedido?
        </p>

        {/* ---------- Acciones ---------- */}
        <div className="flex flex-wrap justify-center gap-3 w-full max-w-2xl">
          <button
            type="button"
            onClick={() => navigate("/cajero/registrar-pedido")}
            className="px-6 h-12 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Realizar otro pedido
          </button>
          <button
            type="button"
            onClick={() => navigate("/cajero/pedidos")}
            className="px-6 h-12 bg-white text-slate-800 text-sm font-semibold rounded-lg border border-blue-100 hover:bg-slate-50 transition-colors"
          >
            Ver pedidos
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente
// ----------------------------------------------------------------------
function ResumenCard({ label, valor }) {
  return (
    <div className="bg-slate-50 rounded-lg border border-blue-100 px-4 py-3.5 flex flex-col gap-2">
      <span className="text-slate-500 text-xs font-normal font-['Inter']">
        {label}
      </span>
      <span className="text-slate-800 text-lg font-semibold font-['Inter']">
        {valor}
      </span>
    </div>
  );
}
