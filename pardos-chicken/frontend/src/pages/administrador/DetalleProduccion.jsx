import React from "react";

// ----------------------------------------------------------------------
// Datos de ejemplo del pedido (luego vendrán por props o API)
// ----------------------------------------------------------------------
const PEDIDO_EJEMPLO = {
  id: "#P0012",
  modalidad: "Delivery",
  estado: "En cola",
  ingreso: "11:25",
  tiempoEnCocina: "18 min",
  tiempoEstimado: "15 min",
  prioridad: "Normal",
  observaciones: ["Sin ají", "Papas bien doradas"],
  productos: [
    { icono: "🍗", nombre: "1/2 Pollo a la brasa", cantidad: 1 },
    { icono: "🍟", nombre: "Papas familiares", cantidad: 1 },
    { icono: "🥤", nombre: "Gaseosa 1.5 L", cantidad: 1 },
  ],
  seguimiento: [
    { label: "Ingreso a cocina", hora: "11:25" },
    { label: "Inicio de preparación", hora: "--:--" },
    { label: "Finalización", hora: "--:--" },
    { label: "Tiempo transcurrido", hora: "18 min" },
    { label: "Tiempo estimado", hora: "15 min" },
  ],
  historial: [
    {
      hora: "11:25",
      estado: "En cola",
      descripcion: "Pedido enviado a cocina.",
      responsable: "Sistema (Caja)",
    },
    {
      hora: "11:40",
      estado: "En preparación",
      descripcion: "--",
      responsable: "--",
    },
    {
      hora: "11:55",
      estado: "Listo",
      descripcion: "--",
      responsable: "--",
    },
  ],
};

const ESTADO_BADGE = {
  "En cola": "bg-rose-50 text-rose-700",
  "En preparación": "bg-indigo-50 text-blue-800",
  Listo: "bg-green-100 text-green-700",
  Despachado: "bg-violet-100 text-purple-800",
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function DetalleProduccion({
  pedido = PEDIDO_EJEMPLO,
  onClose = () => {},
  onVerPedido = () => {},
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- Header ---------- */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-['Inter']">
              Detalle de producción
            </h2>
            <p className="text-xs text-slate-500 font-['Inter']">
              Información de la preparación del pedido en cocina.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ---------- Body ---------- */}
        <div className="p-6 flex flex-col gap-5">
          {/* ===== Tarjetas superiores ===== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Pedido */}
            <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-800 font-['Inter']">
                  {pedido.id}
                </span>
                <span className="px-2 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 font-['Inter']">
                  🛵 {pedido.modalidad}
                </span>
              </div>
              <div className="border-t border-blue-100 pt-3 flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-['Inter']">
                  Ingreso a cocina
                </span>
                <span className="text-base font-bold text-slate-800 font-['Inter']">
                  {pedido.ingreso}
                </span>
                <span className="text-xs text-slate-500 font-['Inter']">
                  Hace {pedido.tiempoEnCocina}
                </span>
              </div>
            </div>

            {/* Estado */}
            <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
              <span className="text-xs text-slate-500 font-['Inter']">
                Estado en producción
              </span>
              <span
                className={`self-start px-3 py-1 rounded text-xs font-semibold font-['Inter'] ${
                  ESTADO_BADGE[pedido.estado] || "bg-slate-100 text-slate-800"
                }`}
              >
                {pedido.estado}
              </span>
              <span className="text-xs text-slate-500 font-['Inter']">
                Esperando preparación
              </span>
              <div className="border-t border-blue-100 pt-3 flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-['Inter']">
                  Tiempo en cocina
                </span>
                <span className="text-base font-bold text-slate-800 font-['Inter']">
                  {pedido.tiempoEnCocina}
                </span>
              </div>
            </div>

            {/* Tiempo estimado + prioridad */}
            <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-['Inter']">
                  Tiempo estimado
                </span>
                <span className="text-lg font-bold text-slate-800 font-['Inter']">
                  {pedido.tiempoEstimado}
                </span>
              </div>
              <div className="border-t border-blue-100 pt-3 flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-['Inter']">
                  ⚑ Prioridad
                </span>
                <span className="self-start px-3 py-1 rounded text-xs font-semibold bg-orange-50 text-yellow-800 font-['Inter']">
                  {pedido.prioridad}
                </span>
              </div>
            </div>
          </div>

          {/* ===== Productos + Observaciones ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Productos */}
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-slate-800 font-['Inter']">
                🛒 Productos del pedido
              </h3>
              <div className="border border-blue-100 rounded-md overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-800 font-['Inter']">
                  <span>Producto</span>
                  <span>Cantidad</span>
                </div>
                {pedido.productos.map((p, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 flex items-center justify-between border-t border-blue-100"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-800 font-['Inter']">
                      <span className="text-lg">{p.icono}</span>
                      {p.nombre}
                    </span>
                    <span className="text-xs text-slate-800 font-['Inter']">
                      {p.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-slate-800 font-['Inter']">
                📝 Observaciones de cocina
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <ul className="list-disc list-inside text-xs text-slate-800 font-['Inter'] space-y-1">
                  {pedido.observaciones.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ===== Seguimiento ===== */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-800 font-['Inter']">
              🔄 Seguimiento de producción
            </h3>

            {/* Barra de progreso */}
            <div className="relative h-1.5 bg-slate-200 rounded-full my-3">
              <div
                className="absolute top-0 left-0 h-1.5 bg-orange-600 rounded-full"
                style={{ width: "25%" }}
              />
              <div className="absolute -top-1.5 left-0 w-4 h-4 bg-white rounded-full border-4 border-orange-600" />
              <div className="absolute -top-1 left-[25%] w-3 h-3 bg-white rounded-full border-2 border-slate-400" />
              <div className="absolute -top-1 left-[50%] w-3 h-3 bg-white rounded-full border-2 border-slate-400" />
              <div className="absolute -top-1 left-[75%] w-3 h-3 bg-white rounded-full border-2 border-slate-400" />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {["Ingresado", "En preparación", "Listo", "Despachado"].map(
                (label, i) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <span
                      className={`text-xs font-semibold font-['Inter'] ${
                        i === 0 ? "text-orange-600" : "text-slate-800"
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`text-xs font-semibold font-['Inter'] ${
                        i === 0
                          ? "bg-rose-50 text-orange-600 px-2 py-0.5 rounded"
                          : "bg-indigo-50 text-slate-500 px-2 py-0.5 rounded"
                      }`}
                    >
                      {i === 0 ? pedido.ingreso : "--:--"}
                    </span>
                  </div>
                ),
              )}
            </div>

            {/* Detalle de tiempos */}
            <div className="mt-3 bg-slate-50 rounded-md border border-blue-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pedido.seguimiento.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between text-xs font-['Inter']"
                >
                  <span className="text-slate-500">{s.label}</span>
                  <span className="text-slate-800 font-semibold">{s.hora}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Historial ===== */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-800 font-['Inter']">
              📜 Historial de estados (producción)
            </h3>
            <div className="border border-blue-100 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Fecha y hora",
                        "Estado",
                        "Descripción",
                        "Responsable",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2 text-left text-xs font-semibold text-slate-800 font-['Inter']"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.historial.map((h, i) => (
                      <tr key={i} className="border-t border-blue-100">
                        <td className="px-4 py-2.5 text-xs text-slate-800 font-['Inter']">
                          {h.hora}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-3 py-1 rounded text-xs font-semibold font-['Inter'] ${
                              ESTADO_BADGE[h.estado] ||
                              "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {h.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-800 font-['Inter']">
                          {h.descripcion}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-800 font-['Inter']">
                          {h.responsable}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white text-slate-800 text-xs font-semibold rounded-md border border-blue-100 hover:bg-slate-50 transition-colors"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onVerPedido}
            className="px-5 py-2 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors"
          >
            Ver pedido completo
          </button>
        </div>
      </div>
    </div>
  );
}
