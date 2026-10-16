import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const PEDIDO_EJEMPLO = {
  id: "#P0011",
  modalidad: "Delivery",
  hora: "11:40",
  estado: "Listo",
  productos: [
    { nombre: "Pollo a la brasa", cantidad: 1 },
    { nombre: "Papas familiares", cantidad: 1 },
    { nombre: "Gaseosa 1.5 L", cantidad: 1 },
  ],
  cliente: {
    nombre: "María Fernanda López",
    telefono: "987 654 321",
    direccion: "Av. Javier Prado Este 1234, San Isidro",
    referencia: "Edificio gris, portería. Tocar intercomunicador 501.",
    observaciones: "Sin salsas, extra papas.",
  },
};

const REPARTIDORES_INICIALES = [
  {
    id: 1,
    iniciales: "JP",
    nombre: "Juan Pérez",
    telefono: "987 111 222",
    estado: "Disponible",
    zonas: "San Isidro, Lince, Jesús María",
    carga: 1,
    color: "bg-indigo-50",
  },
  {
    id: 2,
    iniciales: "CA",
    nombre: "Carlos Álvarez",
    telefono: "987 333 444",
    estado: "En ruta",
    zonas: "Miraflores, Surco, Barranco",
    carga: 2,
    color: "bg-orange-100",
  },
  {
    id: 3,
    iniciales: "LM",
    nombre: "Luis Mendoza",
    telefono: "987 555 666",
    estado: "Disponible",
    zonas: "San Borja, Surquillo, La Victoria",
    carga: 0,
    color: "bg-green-100",
  },
  {
    id: 4,
    iniciales: "RT",
    nombre: "Rosa Torres",
    telefono: "987 777 888",
    estado: "Disponible",
    zonas: "Pueblo Libre, Magdalena, Breña",
    carga: 1,
    color: "bg-pink-100",
  },
];

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function AsignacionRepartidor({ pedido = PEDIDO_EJEMPLO }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState(null);
  const [soloDisponibles, setSoloDisponibles] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [error, setError] = useState(null);

  const repartidoresFiltrados = useMemo(() => {
    return REPARTIDORES_INICIALES.filter((r) =>
      soloDisponibles ? r.estado === "Disponible" : true,
    );
  }, [soloDisponibles]);

  const handleAsignar = async () => {
    if (!repartidorSeleccionado) {
      setError("Selecciona un repartidor primero.");
      return;
    }

    setError(null);
    setAsignando(true);

    try {
      // await pedidosService.asignarRepartidor(pedido.id, repartidorSeleccionado.id);

      // Simulación
      setTimeout(() => {
        setAsignando(false);
        navigate("/despacho/panel");
      }, 600);
    } catch (err) {
      setError("No se pudo asignar el repartidor.");
      setAsignando(false);
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
          Asignación de repartidor
        </h1>
        <p className="text-sm text-slate-500 font-['Inter']">
          Selecciona un repartidor disponible para el pedido y confirma la
          asignación.
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
        {/* ============ Panel izquierdo: Pedido ============ */}
        <div className="bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-orange-600 rounded" />
            <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
              Pedido seleccionado
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-2xl font-bold text-slate-800 font-['Inter']">
              {pedido.id}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded text-xs font-medium font-['Inter']">
                {pedido.modalidad}
              </span>
              <span className="text-xs text-slate-500 font-['Inter']">
                {pedido.hora}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium font-['Inter']">
                {pedido.estado}
              </span>
            </div>
          </div>

          {/* Productos */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-800 font-['Inter']">
              Productos ({pedido.productos.length})
            </h3>
            {pedido.productos.map((prod, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1 text-xs font-['Inter']"
              >
                <span className="text-slate-500">{prod.nombre}</span>
                <span className="text-slate-800 font-medium">
                  {prod.cantidad}
                </span>
              </div>
            ))}
          </div>

          <hr className="border-blue-100" />

          {/* Info de destino */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-slate-800 font-['Inter']">
              Información de destino
            </h3>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500 font-['Inter']">
                Cliente
              </span>
              <span className="text-xs font-medium text-slate-800 font-['Inter']">
                {pedido.cliente.nombre}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500 font-['Inter']">
                Teléfono
              </span>
              <span className="text-xs font-medium text-slate-800 font-['Inter']">
                {pedido.cliente.telefono}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500 font-['Inter']">
                Dirección
              </span>
              <span className="text-xs font-medium text-slate-800 font-['Inter']">
                {pedido.cliente.direccion}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500 font-['Inter']">
                Referencia
              </span>
              <span className="text-xs font-medium text-slate-800 font-['Inter']">
                {pedido.cliente.referencia}
              </span>
            </div>
          </div>

          <hr className="border-blue-100" />

          {/* Observaciones */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-800 font-['Inter']">
              Observaciones del cliente
            </span>
            <div className="bg-slate-50 border border-blue-100 rounded-md p-3 text-xs text-slate-500 font-['Inter']">
              {pedido.cliente.observaciones}
            </div>
          </div>
        </div>

        {/* ============ Panel derecho: Repartidores ============ */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-blue-100 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-orange-600 rounded" />
            <h2 className="text-base font-semibold text-slate-800 font-['Inter']">
              Repartidores disponibles
            </h2>
          </div>

          <p className="text-sm text-slate-500 font-['Inter']">
            Selecciona un repartidor para asignar este pedido.
          </p>

          {/* Filtro */}
          <div className="flex justify-end">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 font-['Inter'] cursor-pointer">
              <input
                type="checkbox"
                checked={soloDisponibles}
                onChange={(e) => setSoloDisponibles(e.target.checked)}
                className="accent-orange-600"
              />
              Solo disponibles
            </label>
          </div>

          {/* Lista */}
          <div className="flex flex-col gap-3">
            {repartidoresFiltrados.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500 font-['Inter']">
                No hay repartidores con este filtro.
              </div>
            ) : (
              repartidoresFiltrados.map((r) => {
                const disponible = r.estado === "Disponible";
                const seleccionado = repartidorSeleccionado?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => disponible && setRepartidorSeleccionado(r)}
                    className={`border rounded-md p-3 flex flex-wrap items-center gap-3 transition-colors ${
                      seleccionado
                        ? "border-orange-600 bg-orange-50"
                        : "border-blue-100"
                    } ${
                      disponible
                        ? "cursor-pointer hover:bg-slate-50"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-slate-800 font-['Inter'] ${r.color} shrink-0`}
                    >
                      {r.iniciales}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-1 min-w-[160px]">
                      <span className="text-sm font-semibold text-slate-800 font-['Inter']">
                        {r.nombre}
                      </span>
                      <span
                        className={`inline-block self-start px-2 py-0.5 rounded text-xs font-medium font-['Inter'] ${
                          disponible
                            ? "bg-green-100 text-green-700"
                            : "bg-indigo-50 text-blue-800"
                        }`}
                      >
                        {r.estado}
                      </span>
                      <span className="text-xs text-slate-500 font-['Inter']">
                        {r.telefono}
                      </span>
                    </div>

                    {/* Zonas */}
                    <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                      <span className="text-xs text-slate-500 font-['Inter']">
                        Zonas asignadas
                      </span>
                      <span className="text-xs text-slate-800 font-['Inter']">
                        {r.zonas}
                      </span>
                    </div>

                    {/* Carga */}
                    <div className="flex flex-col gap-1 min-w-[100px]">
                      <span className="text-xs text-slate-500 font-['Inter']">
                        Carga actual
                      </span>
                      <span className="text-xs font-medium text-slate-800 font-['Inter']">
                        {r.carga} {r.carga === 1 ? "pedido" : "pedidos"}
                      </span>
                    </div>

                    {/* Radio visual */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 ${
                        seleccionado
                          ? "border-orange-600 bg-orange-600"
                          : "border-slate-300"
                      }`}
                    >
                      {seleccionado && (
                        <svg
                          className="w-full h-full text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="4"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Aviso */}
          <div className="bg-indigo-50 rounded-md p-3 text-xs font-medium text-blue-800 font-['Inter']">
            Al asignar el repartidor, el pedido pasará al estado “En ruta”.
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/despacho/panel")}
              disabled={asignando}
              className="px-6 h-11 bg-white border border-blue-100 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAsignar}
              disabled={asignando || !repartidorSeleccionado}
              className="px-6 h-11 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {asignando ? "Asignando..." : "Asignar repartidor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
