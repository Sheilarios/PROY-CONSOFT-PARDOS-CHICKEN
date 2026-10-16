import React, { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const PEDIDO_EJEMPLO = {
  id: "#P0013",
  modalidad: "Delivery",
  hora: "11:45",
  estado: "Por verificar",
  cliente: {
    nombre: "María Fernanda López",
    telefono: "987 654 321",
    direccion: "Av. Primavera 123, Santiago de Surco",
  },
  productos: [
    {
      id: 1,
      nombre: "Pollo a la brasa",
      cantidad: 1,
      verificado: true,
      condicion: "En buen estado",
    },
    {
      id: 2,
      nombre: "Papas familiares",
      cantidad: 1,
      verificado: true,
      condicion: "En buen estado",
    },
    {
      id: 3,
      nombre: "Gaseosa 1.5 L",
      cantidad: 1,
      verificado: true,
      condicion: "En buen estado",
    },
  ],
  checklist: [
    {
      id: "empaque",
      label: "Todo el pedido se encuentra en el empaque correspondiente.",
    },
    { id: "bolsas", label: "Bolsas / cajas en buen estado." },
    {
      id: "extras",
      label: "Incluye salsas, cubiertos y extras según el pedido.",
    },
    { id: "etiqueta", label: "Etiqueta del pedido colocada correctamente." },
  ],
};

const CONDICIONES = ["En buen estado", "Dañado", "Faltante"];

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function VerificacionPedido({ pedido = PEDIDO_EJEMPLO }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Estado local: productos con su verificación
  const [productos, setProductos] = useState(pedido.productos);

  // Estado del checklist de empaque
  const [checklist, setChecklist] = useState(
    pedido.checklist.reduce((acc, item) => ({ ...acc, [item.id]: true }), {}),
  );

  // Observaciones
  const [observaciones, setObservaciones] = useState("");

  // Estado de envío
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  // ---------- Handlers ----------
  const toggleChecklist = (id) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProductoVerificado = (id) => {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, verificado: !p.verificado } : p)),
    );
  };

  const cambiarCondicion = (id, condicion) => {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, condicion } : p)),
    );
  };

  const todoVerificado = productos.every((p) => p.verificado);
  const checklistCompleto = Object.values(checklist).every(Boolean);

  const handleConfirmar = async () => {
    setError(null);

    if (!todoVerificado) {
      setError(
        "Marca todos los productos como verificados antes de continuar.",
      );
      return;
    }
    if (!checklistCompleto) {
      setError("Completa todas las verificaciones de empaque.");
      return;
    }

    setEnviando(true);
    try {
      // await pedidosService.verificarPedido(pedido.id, {
      //   productos,
      //   checklist,
      //   observaciones,
      // });
      setTimeout(() => {
        setEnviando(false);
        navigate("/despacho/panel");
      }, 600);
    } catch (err) {
      setError("No se pudo confirmar la verificación.");
      setEnviando(false);
    }
  };

  const handleCorregir = () => {
    // Simula devolver el pedido a cocina
    setTimeout(() => navigate("/despacho/panel"), 300);
  };

  const handleRegistrarIncidencia = () => {
    navigate(
      `/despacho/registrar-incidencia?id=${encodeURIComponent(pedido.id)}`,
    );
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
          Verificación de pedido
        </h1>
        <p className="text-sm text-slate-500 font-['Inter']">
          Revisa y confirma que el pedido esté completo, en buen estado y
          correctamente empaquetado.
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
        {/* ============ Panel izquierdo (2/3): Info + productos + checklist ============ */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* ---------- Información del pedido ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Información del pedido
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-slate-800 font-['Inter']">
                {pedido.id}
              </span>
              <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded text-xs font-medium font-['Inter']">
                {pedido.modalidad}
              </span>
              <span className="px-3 py-1 bg-orange-100 text-yellow-800 rounded text-xs font-medium font-['Inter']">
                {pedido.estado}
              </span>
              <span className="text-xs text-slate-500 font-['Inter']">
                {pedido.hora}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Cliente" valor={pedido.cliente.nombre} />
              <InfoRow label="Teléfono" valor={pedido.cliente.telefono} />
              <InfoRow
                label="Dirección de entrega"
                valor={pedido.cliente.direccion}
              />
              <InfoRow label="Modalidad" valor={pedido.modalidad} />
            </div>
          </div>

          {/* ---------- Productos del pedido ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Productos del pedido ({productos.length})
              </h2>
            </div>

            <div className="overflow-hidden rounded border border-blue-100">
              {/* Cabecera */}
              <div className="hidden sm:grid grid-cols-12 bg-slate-50 px-3 py-2 gap-2">
                <span className="col-span-1" />
                <span className="col-span-4 text-xs font-semibold text-slate-500 font-['Inter']">
                  Producto
                </span>
                <span className="col-span-2 text-xs font-semibold text-slate-500 font-['Inter'] text-center">
                  Cantidad
                </span>
                <span className="col-span-2 text-xs font-semibold text-slate-500 font-['Inter'] text-center">
                  Estado
                </span>
                <span className="col-span-3 text-xs font-semibold text-slate-500 font-['Inter']">
                  Condición
                </span>
              </div>

              {/* Filas */}
              {productos.map((prod) => (
                <div
                  key={prod.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2 px-3 py-3 border-t border-blue-100 items-center"
                >
                  {/* Checkbox */}
                  <div className="sm:col-span-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleProductoVerificado(prod.id)}
                      aria-label={
                        prod.verificado ? "Desmarcar" : "Marcar verificado"
                      }
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        prod.verificado
                          ? "bg-orange-600 border-orange-600"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      {prod.verificado && (
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
                      )}
                    </button>
                  </div>

                  {/* Nombre */}
                  <div className="sm:col-span-4 text-xs font-medium text-slate-800 font-['Inter']">
                    {prod.nombre}
                  </div>

                  {/* Cantidad */}
                  <div className="sm:col-span-2 text-xs text-slate-800 font-['Inter'] sm:text-center">
                    <span className="sm:hidden text-slate-500">Cantidad: </span>
                    {prod.cantidad}
                  </div>

                  {/* Estado */}
                  <div className="sm:col-span-2 flex sm:justify-center">
                    <span
                      className={`inline-block px-3 py-1 rounded text-xs font-medium font-['Inter'] ${
                        prod.verificado
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-yellow-700"
                      }`}
                    >
                      {prod.verificado ? "Completo" : "Pendiente"}
                    </span>
                  </div>

                  {/* Condición */}
                  <div className="sm:col-span-3">
                    <select
                      value={prod.condicion}
                      onChange={(e) =>
                        cambiarCondicion(prod.id, e.target.value)
                      }
                      className="w-full h-9 px-2 rounded border border-blue-100 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
                    >
                      {CONDICIONES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------- Checklist de empaque ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Verificación de empaque
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {pedido.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.id]}
                    onChange={() => toggleChecklist(item.id)}
                    className="mt-0.5 w-4 h-4 accent-orange-600 shrink-0"
                  />
                  <span className="text-xs text-slate-800 font-['Inter'] leading-relaxed">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            <hr className="border-blue-100" />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="observaciones"
                className="text-xs font-semibold text-slate-800 font-['Inter']"
              >
                Observaciones (opcional)
              </label>
              <textarea
                id="observaciones"
                rows="3"
                placeholder="Agrega alguna observación sobre el estado del pedido..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="px-3 py-2 rounded border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ============ Panel derecho (1/3): Resultado + estado ============ */}
        <div className="flex flex-col gap-4">
          {/* ---------- Resultado ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Resultado de la verificación
              </h2>
            </div>

            {/* Banner según estado */}
            {todoVerificado && checklistCompleto ? (
              <div className="bg-green-100 rounded-lg p-4 flex flex-col gap-2">
                <span className="text-base font-semibold text-slate-800 font-['Inter']">
                  ✓ ¿El pedido está completo y correcto?
                </span>
                <span className="text-xs text-slate-500 font-['Inter']">
                  Todos los productos están marcados y el empaque está
                  verificado. Puedes confirmar.
                </span>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex flex-col gap-2">
                <span className="text-base font-semibold text-orange-700 font-['Inter']">
                  ⚠ Verificación pendiente
                </span>
                <span className="text-xs text-slate-500 font-['Inter']">
                  Marca todos los productos y completa el checklist antes de
                  confirmar.
                </span>
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={enviando || !todoVerificado || !checklistCompleto}
                className="h-11 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? "Verificando..." : "Confirmar verificación"}
              </button>
              <button
                type="button"
                onClick={handleCorregir}
                disabled={enviando}
                className="h-11 bg-white border border-blue-100 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Corregir en cocina
              </button>
              <button
                type="button"
                onClick={handleRegistrarIncidencia}
                disabled={enviando}
                className="h-11 bg-white border border-orange-600 text-orange-600 text-xs font-semibold rounded-md hover:bg-orange-50 transition-colors disabled:opacity-50"
              >
                Registrar incidencia
              </button>
            </div>

            <p className="text-xs text-slate-500 font-['Inter']">
              El pedido quedará listo para despacho o volverá a cocina para
              corrección.
            </p>

            <div className="bg-indigo-50 rounded-md p-3">
              <p className="text-xs font-medium text-blue-800 font-['Inter']">
                Solo los pedidos verificados pueden continuar al despacho.
              </p>
            </div>
          </div>

          {/* ---------- Estado actual ---------- */}
          <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded" />
              <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
                Estado actual del pedido
              </h2>
            </div>

            <EstadoStep
              activo
              label="Por verificar"
              descripcion="El equipo de despacho revisa el pedido."
            />
            <EstadoStep
              label="Listo para despachar"
              descripcion="En espera de un repartidor."
            />
            <EstadoStep
              label="Despachado"
              descripcion="En camino al cliente."
            />
            <EstadoStep label="Entregado" descripcion="Pedido completado." />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponentes
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

function EstadoStep({ activo = false, label, descripcion }) {
  return (
    <div className="flex items-start gap-3">
      {activo ? (
        <span className="text-orange-600 text-xl leading-none">●</span>
      ) : (
        <span className="text-slate-300 text-xl leading-none">○</span>
      )}
      <div className="flex flex-col gap-0.5">
        <span
          className={`text-sm font-semibold font-['Inter'] ${
            activo ? "text-orange-600" : "text-slate-800"
          }`}
        >
          {label}
        </span>
        <span className="text-xs text-slate-500 font-['Inter']">
          {descripcion}
        </span>
      </div>
    </div>
  );
}
