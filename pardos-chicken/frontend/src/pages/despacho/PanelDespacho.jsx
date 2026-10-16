import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const PEDIDOS_INICIALES = [
  // --- PENDIENTES DE VERIFICAR ---
  {
    id: "#P0013",
    modalidad: "Delivery",
    hora: "11:45",
    estado: "Por verificar",
    columna: "pendientes",
    productos: [
      { nombre: "Pollo a la brasa", cantidad: 1, verificado: false },
      { nombre: "Papas familiares", cantidad: 1, verificado: false },
      { nombre: "Gaseosa 1.5 L", cantidad: 1, verificado: false },
    ],
    observaciones: "Sin salsas, extra papas.",
  },
  // --- LISTOS PARA DESPACHAR ---
  {
    id: "#P0011",
    modalidad: "Delivery",
    hora: "11:40",
    estado: "Listo",
    columna: "listos",
    productos: [
      { nombre: "Pollo a la brasa", cantidad: 1, verificado: true },
      { nombre: "Papas familiares", cantidad: 1, verificado: true },
      { nombre: "Gaseosa 1.5 L", cantidad: 1, verificado: true },
    ],
  },
  {
    id: "#P0010",
    modalidad: "Recojo",
    hora: "11:30",
    estado: "Listo",
    columna: "listos",
    productos: [
      { nombre: "Pollo entero", cantidad: 1, verificado: true },
      { nombre: "Papas familiares", cantidad: 1, verificado: true },
    ],
  },
  // --- DESPACHADOS ---
  {
    id: "#P0008",
    modalidad: "Salón",
    hora: "11:20",
    estado: "Despachado",
    columna: "despachados",
    productos: [
      { nombre: "1/4 Pollo", cantidad: 1, verificado: true },
      { nombre: "Ensalada", cantidad: 1, verificado: true },
      { nombre: "Gaseosa 1.5 L", cantidad: 1, verificado: true },
    ],
    meta: {
      entregadoEn: "Mesa 5",
      horaDespacho: "11:28",
      atendidoPor: "Juan Pérez",
    },
  },
];

const MODALIDAD_STYLES = {
  Delivery: "bg-rose-50 text-rose-700",
  Recojo: "bg-indigo-50 text-blue-800",
  Salón: "bg-yellow-50 text-yellow-800",
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function PanelDespacho() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState(PEDIDOS_INICIALES);
  const [filtroModalidad, setFiltroModalidad] = useState("Todas");

  // Filtrar por modalidad (aplica a las 3 columnas)
  const pedidosFiltrados = useMemo(() => {
    if (filtroModalidad === "Todas") return pedidos;
    return pedidos.filter((p) => p.modalidad === filtroModalidad);
  }, [pedidos, filtroModalidad]);

  const porColumna = (columna) =>
    pedidosFiltrados.filter((p) => p.columna === columna);

  // ---------- Acciones ----------
  const verificarPedido = (id) => {
    navigate(`/despacho/verificacion?id=${encodeURIComponent(id)}`);
  };

  const asignarRepartidor = (id) => {
    navigate(`/despacho/asignar-repartidor?id=${encodeURIComponent(id)}`);
  };

  const marcarDespachado = (id) => {
    // Simulación — cuando tengas backend:
    // await pedidosService.confirmarDespacho(id);
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, columna: "despachados", estado: "Despachado" }
          : p,
      ),
    );
  };

  const confirmarDespacho = (id) => {
    navigate(`/despacho/confirmar?id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
            Panel de despacho
          </h1>
          <p className="text-sm text-slate-500 font-['Inter']">
            Gestiona y controla los pedidos desde la cocina hasta su entrega
            final.
          </p>
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

      {/* ---------- Grid 3 columnas ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ============ Columna 1: Por verificar ============ */}
        <ColumnaDespacho
          titulo="Pendientes de verificar"
          pedidos={porColumna("pendientes")}
        >
          {(p) => (
            <TarjetaPedido
              pedido={p}
              estadoBadge="Por verificar"
              estadoClase="bg-orange-100 text-yellow-700"
              onAccion={() => verificarPedido(p.id)}
              accionLabel="Verificar pedido"
              onSecundario={() =>
                navigate(
                  `/despacho/pedidos/detalle?id=${encodeURIComponent(p.id)}`,
                )
              }
              secundarioLabel="Ver detalles"
            />
          )}
        </ColumnaDespacho>

        {/* ============ Columna 2: Listos para despachar ============ */}
        <ColumnaDespacho
          titulo="Listos para despachar"
          pedidos={porColumna("listos")}
        >
          {(p) => (
            <TarjetaPedido
              pedido={p}
              estadoBadge="Listo"
              estadoClase="bg-green-100 text-green-700"
              onAccion={
                p.modalidad === "Delivery"
                  ? () => asignarRepartidor(p.id)
                  : () => marcarDespachado(p.id)
              }
              accionLabel={
                p.modalidad === "Delivery"
                  ? "Asignar repartidor"
                  : "Marcar despachado"
              }
              onSecundario={
                p.modalidad === "Delivery"
                  ? () => confirmarDespacho(p.id)
                  : undefined
              }
              secundarioLabel="Confirmar despacho"
            />
          )}
        </ColumnaDespacho>

        {/* ============ Columna 3: Despachados ============ */}
        <ColumnaDespacho
          titulo="Despachados"
          pedidos={porColumna("despachados")}
        >
          {(p) => (
            <TarjetaPedido
              pedido={p}
              estadoBadge="Despachado"
              estadoClase="bg-violet-100 text-purple-800"
              meta={p.meta}
            />
          )}
        </ColumnaDespacho>
      </div>

      {/* ---------- Banner inferior ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          Despacha primero los pedidos listos según modalidad y hora de salida.
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          {pedidos.filter((p) => p.columna !== "despachados").length} pedidos
          activos
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente: Columna
// ----------------------------------------------------------------------
function ColumnaDespacho({ titulo, pedidos, children }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
        <div className="w-1 h-7 bg-orange-600 rounded" />
        <h2 className="text-base font-bold text-slate-800 font-['Inter']">
          {titulo} ({pedidos.length})
        </h2>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-xs text-slate-500 font-['Inter']">
              Sin pedidos en esta columna.
            </p>
          </div>
        ) : (
          pedidos.map((p) => (
            <React.Fragment key={p.id}>{children(p)}</React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente: Tarjeta de pedido
// ----------------------------------------------------------------------
function TarjetaPedido({
  pedido,
  estadoBadge,
  estadoClase,
  onAccion,
  accionLabel,
  onSecundario,
  secundarioLabel,
  meta,
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold text-slate-800 font-['Inter']">
          {pedido.id}
        </span>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold font-['Inter'] ${
            MODALIDAD_STYLES[pedido.modalidad] || "bg-slate-100 text-slate-800"
          }`}
        >
          {pedido.modalidad}
        </span>
        <span className="text-xs text-slate-500 font-['Inter']">
          {pedido.hora}
        </span>
        <span
          className={`ml-auto px-2 py-1 rounded text-xs font-semibold font-['Inter'] ${estadoClase}`}
        >
          {estadoBadge}
        </span>
      </div>

      {/* Productos */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-slate-800 font-['Inter']">
          Productos ({pedido.productos.length})
        </span>
        {pedido.productos.map((prod, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs font-['Inter']"
          >
            <span className="text-slate-500">
              {prod.verificado ? "✓ " : ""}
              {prod.nombre}
            </span>
            <span className="text-slate-800 font-medium">{prod.cantidad}</span>
          </div>
        ))}
      </div>

      {/* Observaciones (solo si existen) */}
      {pedido.observaciones && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-800 font-['Inter']">
            Observaciones
          </span>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 text-xs text-slate-500 font-['Inter']">
            {pedido.observaciones}
          </div>
        </div>
      )}

      {/* Meta (solo para despachados) */}
      {meta && (
        <div className="flex flex-col gap-1 pt-2 border-t border-slate-200">
          <MetaRow label="Entregado en" valor={meta.entregadoEn} />
          <MetaRow label="Hora de despacho" valor={meta.horaDespacho} />
          <MetaRow
            label="Atendido por"
            valor={meta.atiendePor || meta.atendidoPor}
          />
        </div>
      )}

      {/* Botones */}
      {(onAccion || onSecundario) && (
        <div className="flex flex-col gap-2 pt-1">
          {onAccion && (
            <button
              type="button"
              onClick={onAccion}
              className="h-10 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors"
            >
              {accionLabel}
            </button>
          )}
          {onSecundario && secundarioLabel && (
            <button
              type="button"
              onClick={onSecundario}
              className="h-10 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors"
            >
              {secundarioLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente: Fila de meta
// ----------------------------------------------------------------------
function MetaRow({ label, valor }) {
  return (
    <div className="flex items-center justify-between text-xs font-['Inter']">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-800 font-bold">{valor || "—"}</span>
    </div>
  );
}
