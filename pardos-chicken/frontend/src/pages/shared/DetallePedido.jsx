import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// ----------------------------------------------------------------------
// Datos de ejemplo (luego vendrán del backend vía useParams + fetch)
// ----------------------------------------------------------------------
const PEDIDO_EJEMPLO = {
  id: "#P0012",
  cliente: "Cliente mostrador",
  modalidad: "Delivery",
  hora: "11:25",
  estado: "En cola",
  total: 54.0,
  productos: [
    {
      id: 1,
      nombre: "1/2 Pollo a la brasa",
      cantidad: 1,
      precio: 32.0,
      subtotal: 32.0,
    },
    {
      id: 2,
      nombre: "Papas familiares",
      cantidad: 1,
      precio: 12.0,
      subtotal: 12.0,
    },
    {
      id: 3,
      nombre: "Gaseosa 1.5 L",
      cantidad: 1,
      precio: 10.0,
      subtotal: 10.0,
    },
  ],
  observaciones: "Sin ají. Cliente solicita entrega rápida.",
  incidencias: [], // o [{ motivo, area, usuario, fecha }]
  produccion: {
    ingresoCocina: "11:28",
    inicioPreparacion: "--:--",
    finPreparacion: "--:--",
    tiempoEstimado: "15 min",
    estadoProduccion: "En cola",
  },
  despacho: {
    estadoDespacho: "Aún no disponible",
    repartidor: "Sin asignar",
    destino: "Pendiente",
    horaDespacho: "--:--",
  },
  historial: [
    {
      hora: "11:25",
      area: "Caja",
      usuario: "María Torres",
      evento: "Pedido registrado en caja",
    },
    {
      hora: "11:28",
      area: "Cocina",
      usuario: "Carlos Ruiz",
      evento: "Pedido enviado a cocina",
    },
  ],
};

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

const AREA_STYLES = {
  Caja: "bg-orange-50 text-orange-600",
  Cocina: "bg-indigo-50 text-cyan-700",
  Despacho: "bg-orange-100 text-yellow-700",
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function DetallePedido({ pedido = PEDIDO_EJEMPLO }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="self-start text-xs font-semibold text-cyan-700 hover:text-orange-600 font-['Inter']"
        >
          ← Volver a pedidos
        </button>
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Detalle del pedido
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Vista consolidada del pedido para supervisión administrativa.
        </p>
      </div>

      {/* ---------- Cabecera con datos clave ---------- */}
      <div className="bg-white border border-blue-100 rounded-md p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <InfoCell label="Código del pedido" valor={pedido.id} />
        <InfoCell label="Cliente" valor={pedido.cliente} />
        <InfoCell
          label="Modalidad"
          badge={{
            label: pedido.modalidad,
            clase:
              MODALIDAD_STYLES[pedido.modalidad] ||
              "bg-slate-100 text-slate-800",
          }}
        />
        <InfoCell label="Hora" valor={pedido.hora} />
        <InfoCell
          label="Estado actual"
          badge={{
            label: pedido.estado,
            clase:
              ESTADO_STYLES[pedido.estado] || "bg-slate-100 text-slate-800",
          }}
        />
        <InfoCell label="Total" valor={`S/ ${pedido.total.toFixed(2)}`} />
      </div>

      {/* ---------- Grid principal ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ============ Productos del pedido ============ */}
        <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
          <h2 className="text-base font-bold text-slate-800 font-['Inter']">
            Productos del pedido
          </h2>

          <div className="border border-blue-100 rounded-md overflow-hidden">
            {/* Cabecera */}
            <div className="grid grid-cols-12 bg-slate-50 px-3 py-2.5 gap-2">
              <span className="col-span-1 text-xs font-semibold text-slate-800 font-['Inter']">
                #
              </span>
              <span className="col-span-5 text-xs font-semibold text-slate-800 font-['Inter']">
                Producto
              </span>
              <span className="col-span-2 text-xs font-semibold text-slate-800 font-['Inter'] text-center">
                Cant.
              </span>
              <span className="col-span-2 text-xs font-semibold text-slate-800 font-['Inter'] text-right">
                Precio
              </span>
              <span className="col-span-2 text-xs font-semibold text-slate-800 font-['Inter'] text-right">
                Subtotal
              </span>
            </div>

            {/* Filas */}
            {pedido.productos.map((p, i) => (
              <div
                key={p.id}
                className="grid grid-cols-12 px-3 py-2.5 border-t border-blue-100 gap-2"
              >
                <span className="col-span-1 text-xs font-semibold text-slate-800 font-['Inter']">
                  {i + 1}
                </span>
                <span className="col-span-5 text-xs text-slate-800 font-['Inter']">
                  {p.nombre}
                </span>
                <span className="col-span-2 text-xs text-slate-800 font-['Inter'] text-center">
                  {p.cantidad}
                </span>
                <span className="col-span-2 text-xs text-slate-800 font-['Inter'] text-right">
                  S/ {p.precio.toFixed(2)}
                </span>
                <span className="col-span-2 text-xs text-slate-800 font-['Inter'] text-right">
                  S/ {p.subtotal.toFixed(2)}
                </span>
              </div>
            ))}

            {/* Total */}
            <div className="grid grid-cols-12 px-3 py-3 border-t-2 border-blue-100 bg-slate-50 gap-2">
              <span className="col-span-10 text-xs font-semibold text-slate-800 font-['Inter'] text-right">
                Total del pedido:
              </span>
              <span className="col-span-2 text-sm font-bold text-slate-800 font-['Inter'] text-right">
                S/ {pedido.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ============ Observaciones e incidencias ============ */}
        <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
          <h2 className="text-base font-bold text-slate-800 font-['Inter']">
            Observaciones e incidencias
          </h2>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-800 font-['Inter']">
              Observación
            </span>
            <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 text-xs text-slate-800 font-['Inter']">
              {pedido.observaciones}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-800 font-['Inter']">
              Incidencias
            </span>
            {pedido.incidencias.length === 0 ? (
              <div className="border border-blue-100 rounded-md p-3 text-center text-xs text-slate-500 font-['Inter']">
                Sin incidencias registradas
              </div>
            ) : (
              pedido.incidencias.map((inc, i) => (
                <div
                  key={i}
                  className="border border-red-100 bg-red-50 rounded-md p-3 flex flex-col gap-1"
                >
                  <span className="text-xs font-semibold text-red-700 font-['Inter']">
                    {inc.motivo}
                  </span>
                  <span className="text-xs text-slate-500 font-['Inter']">
                    {inc.area} · {inc.usuario} · {inc.fecha}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ============ Producción ============ */}
        <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
          <h2 className="text-base font-bold text-slate-800 font-['Inter']">
            Producción
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProdItem
              label="Ingreso a cocina"
              valor={pedido.produccion.ingresoCocina}
            />
            <ProdItem
              label="Inicio de preparación"
              valor={pedido.produccion.inicioPreparacion}
            />
            <ProdItem
              label="Fin de preparación"
              valor={pedido.produccion.finPreparacion}
            />
            <ProdItem
              label="Tiempo estimado"
              valor={pedido.produccion.tiempoEstimado}
            />
          </div>

          <div className="flex flex-col gap-1 pt-2 border-t border-blue-100">
            <span className="text-xs text-slate-500 font-['Inter']">
              Estado de producción
            </span>
            <span
              className={`self-start px-3 py-1 rounded text-xs font-semibold font-['Inter'] ${
                ESTADO_STYLES[pedido.produccion.estadoProduccion] ||
                "bg-slate-100 text-slate-800"
              }`}
            >
              {pedido.produccion.estadoProduccion}
            </span>
          </div>
        </div>

        {/* ============ Despacho ============ */}
        <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
          <h2 className="text-base font-bold text-slate-800 font-['Inter']">
            Despacho
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProdItem
              label="Estado de despacho"
              valor={pedido.despacho.estadoDespacho}
            />
            <ProdItem
              label="Repartidor asignado"
              valor={pedido.despacho.repartidor}
            />
            <ProdItem label="Destino" valor={pedido.despacho.destino} />
            <ProdItem
              label="Hora de despacho"
              valor={pedido.despacho.horaDespacho}
            />
          </div>

          <div className="bg-slate-50 border border-blue-100 rounded-md p-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm shrink-0">
              i
            </div>
            <p className="text-xs text-cyan-700 font-['Inter']">
              La información de despacho se habilita cuando el pedido esté
              listo.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Historial / trazabilidad ---------- */}
      <div className="bg-white rounded-md border border-blue-100 p-4 flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-800 font-['Inter']">
          Historial / trazabilidad
        </h2>

        <div className="border border-blue-100 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50">
                <tr>
                  {["Hora", "Área", "Usuario", "Evento"].map((col) => (
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
                {pedido.historial.map((h, i) => (
                  <tr key={i} className="border-t border-blue-100">
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {h.hora}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-semibold font-['Inter'] ${
                          AREA_STYLES[h.area] || "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {h.area}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {h.usuario}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {h.evento}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 h-9 bg-white border border-blue-100 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponentes
// ----------------------------------------------------------------------
function InfoCell({ label, valor, badge }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-slate-500 font-['Inter']">
        {label}
      </span>
      {badge ? (
        <span
          className={`self-start px-3 py-1 rounded text-xs font-semibold font-['Inter'] ${badge.clase}`}
        >
          {badge.label}
        </span>
      ) : (
        <span className="text-base font-bold text-slate-800 font-['Inter']">
          {valor}
        </span>
      )}
    </div>
  );
}

function ProdItem({ label, valor }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500 font-['Inter']">{label}</span>
      <span className="text-xs font-semibold text-slate-800 font-['Inter']">
        {valor}
      </span>
    </div>
  );
}
