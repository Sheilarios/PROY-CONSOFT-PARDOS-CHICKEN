import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const PEDIDO_EJEMPLO = {
  id: "#P0010",
  modalidad: "Recojo",
  fecha: "Hoy, 15 may 2024",
  hora: "11:30",
  estado: "Listo",
  sucursal: "Salón Principal",
  productos: [
    { nombre: "Pollo entero", cantidad: 1 },
    { nombre: "Papas familiares", cantidad: 1 },
  ],
  cliente: "Juan Pérez",
  horaSalida: "11:28",
  historial: [
    {
      titulo: "Pedido registrado",
      hora: "15 may 2024 · 11:30",
      descripcion: "El pedido fue registrado en el sistema.",
    },
    {
      titulo: "En cola",
      hora: "15 may 2024 · 11:32",
      descripcion: "El pedido está en cola de preparación.",
    },
    {
      titulo: "En preparación",
      hora: "15 may 2024 · 11:36",
      descripcion: "Se están preparando los productos.",
    },
    {
      titulo: "Listo",
      hora: "15 may 2024 · 11:40",
      descripcion: "El pedido está listo para ser despachado.",
    },
  ],
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function ConfirmarDespacho({ pedido = PEDIDO_EJEMPLO }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    cliente: pedido.cliente,
    modalidad:
      pedido.modalidad === "Recojo" ? "Recojo en mostrador" : pedido.modalidad,
    horaSalida: pedido.horaSalida,
    observaciones: "",
  });

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleConfirmar = async () => {
    setError(null);
    setConfirmando(true);

    try {
      // await pedidosService.confirmarDespacho(pedido.id);

      // Simulación
      setTimeout(() => {
        setConfirmando(false);
        navigate("/despacho/panel");
      }, 600);
    } catch (err) {
      setError("No se pudo confirmar el despacho. Inténtalo de nuevo.");
      setConfirmando(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => navigate("/despacho/panel")}
          className="self-start text-xs font-medium text-slate-800 hover:text-orange-600 font-['Inter']"
        >
          ← Volver al panel de despacho
        </button>
        <h1 className="text-3xl font-bold text-slate-800 font-['Inter']">
          Confirmar despacho
        </h1>
        <p className="text-sm text-slate-500 font-['Inter']">
          Revisa la información del pedido y confirma su despacho.
        </p>
      </div>

      {/* ---------- Error ---------- */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}

      {/* ---------- Grid principal ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ============ Panel izquierdo (2/3): Info + productos + datos entrega ============ */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* ---------- Información del pedido ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Información del pedido
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold text-slate-800 font-['Inter']">
                {pedido.id}
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-blue-800 rounded text-xs font-medium font-['Inter']">
                {pedido.modalidad}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium font-['Inter']">
                {pedido.estado}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Fecha del pedido" valor={pedido.fecha} />
              <InfoRow label="Hora del pedido" valor={pedido.hora} />
              <InfoRow
                label="Modalidad"
                valor={
                  pedido.modalidad === "Recojo"
                    ? "Recojo en mostrador"
                    : pedido.modalidad
                }
              />
              <InfoRow label="Estado actual" valor={pedido.estado} />
              <InfoRow label="Sucursal" valor={pedido.sucursal} />
            </div>
          </div>

          {/* ---------- Productos del pedido ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Productos del pedido ({pedido.productos.length})
              </h2>
            </div>

            <div className="overflow-hidden rounded border border-blue-100">
              <div className="grid grid-cols-3 bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-500 font-['Inter']">
                  Producto
                </span>
                <span className="text-xs font-semibold text-slate-500 font-['Inter'] text-center">
                  Cantidad
                </span>
                <span className="text-xs font-semibold text-slate-500 font-['Inter'] text-right">
                  Verificado
                </span>
              </div>
              {pedido.productos.map((prod, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 px-3 py-2.5 border-t border-blue-100 items-center"
                >
                  <span className="text-xs font-medium text-slate-800 font-['Inter']">
                    {prod.nombre}
                  </span>
                  <span className="text-xs text-slate-800 font-['Inter'] text-center">
                    {prod.cantidad}
                  </span>
                  <div className="flex justify-end">
                    <span className="w-5 h-5 bg-orange-600 rounded flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="3"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------- Datos de entrega ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Datos de entrega
              </h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cliente"
                className="text-xs font-medium text-slate-500 font-['Inter']"
              >
                Nombre del cliente
              </label>
              <input
                id="cliente"
                name="cliente"
                type="text"
                value={form.cliente}
                onChange={handleChange}
                className="h-11 px-3 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="modalidad"
                className="text-xs font-medium text-slate-500 font-['Inter']"
              >
                Modalidad de entrega
              </label>
              <input
                id="modalidad"
                name="modalidad"
                type="text"
                value={form.modalidad}
                onChange={handleChange}
                className="h-11 px-3 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="horaSalida"
                className="text-xs font-medium text-slate-500 font-['Inter']"
              >
                Hora de salida <span className="text-red-500">*</span>
              </label>
              <input
                id="horaSalida"
                name="horaSalida"
                type="time"
                value={form.horaSalida}
                onChange={handleChange}
                className="h-11 px-3 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="observaciones"
                className="text-xs font-medium text-slate-500 font-['Inter']"
              >
                Observaciones (opcional)
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                rows="3"
                placeholder="Ej. Entregado sin inconvenientes."
                value={form.observaciones}
                onChange={handleChange}
                className="px-3 py-2 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ============ Panel derecho (1/3): Historial + acciones ============ */}
        <div className="flex flex-col gap-4">
          {/* ---------- Historial del pedido ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Historial del pedido
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {pedido.historial.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-green-600 text-base font-bold leading-none mt-0.5">
                    ✓
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-800 font-['Inter']">
                      {h.titulo}
                    </span>
                    <span className="text-xs text-slate-500 font-['Inter']">
                      {h.hora}
                    </span>
                    <span className="text-xs text-slate-500 font-['Inter']">
                      {h.descripcion}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------- Confirmación + acciones ---------- */}
          <div className="flex flex-col gap-3">
            <div className="bg-green-100 rounded-lg p-4 flex flex-col gap-2">
              <span className="text-base font-semibold text-green-700 font-['Inter']">
                ✓ Confirmar despacho
              </span>
              <p className="text-xs text-slate-800 font-['Inter']">
                Al confirmar, se actualizará el inventario y el pedido pasará al
                estado Despachado.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirmar}
              disabled={confirmando}
              className="h-11 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmando ? "Confirmando..." : "Confirmar despacho"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/despacho/panel")}
              disabled={confirmando}
              className="h-11 bg-white border border-blue-100 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <p className="text-xs text-slate-500 font-['Inter'] text-center">
              Solo confirma cuando el pedido haya salido del área de despacho.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente
// ----------------------------------------------------------------------
function InfoRow({ label, valor }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500 font-['Inter']">{label}</span>
      <span className="text-xs font-medium text-slate-800 font-['Inter']">
        {valor}
      </span>
    </div>
  );
}
