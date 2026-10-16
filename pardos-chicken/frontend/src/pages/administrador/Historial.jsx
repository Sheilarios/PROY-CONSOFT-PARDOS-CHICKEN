import React, { useMemo, useState } from "react";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const REGISTROS = [
  {
    id: "#P0012",
    fecha: "10/04/24 · 11:25",
    area: "Caja",
    tipo: "Cambio de estado",
    usuario: "María Torres",
    descripcion: "Pedido registrado en mostrador.",
    estado: "Registrado",
  },
  {
    id: "#P0012",
    fecha: "10/04/24 · 11:28",
    area: "Cocina",
    tipo: "Cambio de estado",
    usuario: "Carlos Ruiz",
    descripcion: "Estado actualizado a en cola.",
    estado: "En cola",
  },
  {
    id: "#P0012",
    fecha: "10/04/24 · 11:32",
    area: "Cocina",
    tipo: "Observación",
    usuario: "Carlos Ruiz",
    descripcion: "Preparación iniciada.",
    estado: "En preparación",
  },
  {
    id: "#P0013",
    fecha: "10/04/24 · 11:36",
    area: "Cocina",
    tipo: "Incidencia",
    usuario: "Carlos Ruiz",
    descripcion: "Retraso por alta demanda.",
    estado: "En preparación",
    incidencia: {
      titulo: "Incidencia registrada",
      resumen: "Retraso por alta demanda.",
      descripcionCompleta:
        "Retraso por alta demanda. Se está priorizando la preparación y se informó al cliente sobre el tiempo estimado.",
      fechaHora: "10/04/2024 · 11:36",
    },
  },
  {
    id: "#P0014",
    fecha: "10/04/24 · 11:40",
    area: "Caja",
    tipo: "Observación",
    usuario: "Ana López",
    descripcion: "Cliente solicitó sin salsas.",
    estado: "Registrado",
  },
  {
    id: "#P0008",
    fecha: "10/04/24 · 11:45",
    area: "Despacho",
    tipo: "Cambio de estado",
    usuario: "Luis Ramírez",
    descripcion: "Listo para despacho.",
    estado: "Listo",
  },
  {
    id: "#P0014",
    fecha: "10/04/24 · 11:50",
    area: "Cocina",
    tipo: "Incidencia",
    usuario: "Ana López",
    descripcion: "Pedido incompleto detectado.",
    estado: "En preparación",
  },
  {
    id: "#P0011",
    fecha: "10/04/24 · 11:52",
    area: "Caja",
    tipo: "Corrección",
    usuario: "María Torres",
    descripcion: "Se corrigió dirección de entrega.",
    estado: "En cola",
  },
  {
    id: "#P0008",
    fecha: "10/04/24 · 11:56",
    area: "Despacho",
    tipo: "Observación",
    usuario: "Luis Ramírez",
    descripcion: "Entregado al cliente.",
    estado: "Despachado",
  },
  {
    id: "#P0010",
    fecha: "10/04/24 · 11:58",
    area: "Caja",
    tipo: "Incidencia",
    usuario: "Andrea Salazar",
    descripcion: "Cliente canceló el pedido.",
    estado: "Cancelado",
  },
  {
    id: "#P0011",
    fecha: "10/04/24 · 12:01",
    area: "Cocina",
    tipo: "Cambio de estado",
    usuario: "Pedro Díaz",
    descripcion: "En preparación de productos.",
    estado: "En preparación",
  },
  {
    id: "#P0013",
    fecha: "10/04/24 · 12:05",
    area: "Despacho",
    tipo: "Cambio de estado",
    usuario: "Luis Ramírez",
    descripcion: "Listo para despacho.",
    estado: "Listo",
  },
];

// ----------------------------------------------------------------------
// Estilos
// ----------------------------------------------------------------------
const AREA_STYLES = {
  Caja: "bg-indigo-50 text-sky-700",
  Cocina: "bg-rose-50 text-red-700",
  Despacho: "bg-orange-100 text-yellow-700",
};

const TIPO_STYLES = {
  "Cambio de estado": "bg-indigo-50 text-sky-700",
  Observación: "bg-orange-100 text-yellow-700",
  Incidencia: "bg-rose-50 text-red-700",
  Corrección: "bg-violet-100 text-purple-800",
};

const ESTADO_STYLES = {
  Registrado: "bg-indigo-50 text-slate-800",
  "En cola": "bg-rose-50 text-red-700",
  "En preparación": "bg-indigo-50 text-sky-700",
  Listo: "bg-green-100 text-green-700",
  Despachado: "bg-violet-100 text-purple-800",
  Cancelado: "bg-rose-50 text-red-700",
};

// ----------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------
export default function Historial() {
  const [filtros, setFiltros] = useState({
    area: "Todas",
    estado: "Todos",
    tipo: "Todos",
    busqueda: "",
  });

  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);

  // Contadores para las tarjetas resumen
  const stats = useMemo(() => {
    const hoy = REGISTROS.length;
    const pedidosConHistorial = new Set(REGISTROS.map((r) => r.id)).size;
    const incidencias = REGISTROS.filter((r) => r.tipo === "Incidencia").length;
    return {
      cambiosHoy: hoy,
      pedidosConHistorial,
      incidencias,
      ultimaActualizacion: "11:58",
    };
  }, []);

  // Filtrado
  const registrosFiltrados = useMemo(() => {
    return REGISTROS.filter((r) => {
      if (filtros.area !== "Todas" && r.area !== filtros.area) return false;
      if (filtros.estado !== "Todos" && r.estado !== filtros.estado)
        return false;
      if (filtros.tipo !== "Todos" && r.tipo !== filtros.tipo) return false;
      if (filtros.busqueda) {
        const q = filtros.busqueda.toLowerCase();
        if (
          !r.id.toLowerCase().includes(q) &&
          !r.usuario.toLowerCase().includes(q) &&
          !r.descripcion.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [filtros]);

  const limpiarFiltros = () =>
    setFiltros({ area: "Todas", estado: "Todos", tipo: "Todos", busqueda: "" });

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Historial
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Seguimiento de cambios, observaciones e incidencias de pedidos.
        </p>
      </div>

      {/* ---------- Tarjetas de stats ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Cambios de hoy"
          valor={stats.cambiosHoy}
          sub="+12% que ayer"
        />
        <StatCard
          label="Pedidos con historial"
          valor={stats.pedidosConHistorial}
          sub="Con registros de actividad"
        />
        <StatCard
          label="Incidencias registradas"
          valor={stats.incidencias}
          sub="Correcciones o anulaciones"
        />
        <StatCard
          label="Última actualización"
          valor={stats.ultimaActualizacion}
          sub="Hace 2 minutos"
        />
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="bg-white border border-blue-100 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FiltroSelect
            label="Rango de fechas"
            value="10/04/2024 – 10/04/2024"
            disabled
          />
          <FiltroSelect
            label="Área"
            value={filtros.area}
            options={["Todas", "Caja", "Cocina", "Despacho"]}
            onChange={(v) => setFiltros({ ...filtros, area: v })}
          />
          <FiltroSelect
            label="Estado"
            value={filtros.estado}
            options={[
              "Todos",
              "Registrado",
              "En cola",
              "En preparación",
              "Listo",
              "Despachado",
              "Cancelado",
            ]}
            onChange={(v) => setFiltros({ ...filtros, estado: v })}
          />
          <FiltroSelect
            label="Tipo de registro"
            value={filtros.tipo}
            options={[
              "Todos",
              "Cambio de estado",
              "Observación",
              "Incidencia",
              "Corrección",
            ]}
            onChange={(v) => setFiltros({ ...filtros, tipo: v })}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-['Inter']">
              Buscar pedido
            </label>
            <input
              type="text"
              placeholder="Ej. #P0013, cliente..."
              value={filtros.busqueda}
              onChange={(e) =>
                setFiltros({ ...filtros, busqueda: e.target.value })
              }
              className="h-9 px-3 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={limpiarFiltros}
            className="px-4 h-9 bg-white border border-orange-600 text-orange-600 text-xs font-medium rounded-md hover:bg-orange-50 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* ---------- Layout principal ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabla */}
        <div className="lg:col-span-2 bg-white border border-blue-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "# Pedido",
                    "Fecha / Hora",
                    "Área",
                    "Tipo",
                    "Usuario",
                    "Descripción",
                    "Estado",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-3 text-left text-xs font-bold text-slate-800 font-['Inter']"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No hay registros para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((r, i) => {
                    const esIncidencia =
                      r.tipo === "Incidencia" && r.incidencia;
                    return (
                      <tr
                        key={i}
                        onClick={() =>
                          esIncidencia &&
                          setIncidenciaSeleccionada(r.incidencia)
                        }
                        className={`border-t border-blue-100 ${
                          esIncidencia
                            ? "bg-rose-50/50 cursor-pointer hover:bg-rose-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-3 text-xs font-bold text-slate-800 font-['Inter']">
                          {r.id}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                          {r.fecha}
                        </td>
                        <td className="px-3 py-3">
                          <Badge className={AREA_STYLES[r.area]}>
                            {r.area}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge className={TIPO_STYLES[r.tipo]}>
                            {r.tipo}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                          {r.usuario}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                          {r.descripcion}
                        </td>
                        <td className="px-3 py-3">
                          <Badge className={ESTADO_STYLES[r.estado]}>
                            {r.estado}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de detalle */}
        <div className="bg-white border border-blue-100 rounded-lg p-4">
          {incidenciaSeleccionada ? (
            <DetalleIncidencia
              data={incidenciaSeleccionada}
              onClose={() => setIncidenciaSeleccionada(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-2">
              <span className="text-3xl">📋</span>
              <p className="text-sm text-slate-500 font-['Inter']">
                Selecciona una incidencia de la tabla para ver su detalle.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Banner inferior ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          El historial incluye cambios de estado, observaciones, incidencias y
          correcciones realizadas en los pedidos por cada área del sistema.
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          Mostrando {registrosFiltrados.length} de {REGISTROS.length} registros
        </span>
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

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded text-xs font-medium font-['Inter'] ${className}`}
    >
      {children}
    </span>
  );
}

function FiltroSelect({ label, value, options, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 font-['Inter']">{label}</label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-9 px-3 rounded-md border border-blue-100 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <div
          className={`h-9 px-3 flex items-center rounded-md border text-xs font-['Inter'] ${
            disabled
              ? "bg-slate-50 border-blue-100 text-slate-800"
              : "bg-white border-blue-100 text-slate-800"
          }`}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function DetalleIncidencia({ data, onClose }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-bold text-slate-800 font-['Inter']">
          Detalle de incidencia
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Alerta */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3">
        <div className="w-6 h-6 bg-white rounded-full border border-red-700 flex items-center justify-center text-red-700 font-bold text-xs shrink-0">
          !
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-red-700 font-['Inter']">
            {data.titulo}
          </span>
          <span className="text-xs text-slate-500 font-['Inter']">
            {data.resumen}
          </span>
        </div>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-['Inter']">
        <span className="text-slate-500">Pedido</span>
        <span className="text-slate-800 font-bold text-right">#P0013</span>

        <span className="text-slate-500">Área</span>
        <div className="text-right">
          <Badge className="bg-rose-50 text-red-700">Cocina</Badge>
        </div>

        <span className="text-slate-500">Registrado por</span>
        <span className="text-slate-800 text-right">Carlos Ruiz</span>

        <span className="text-slate-500">Fecha / Hora</span>
        <span className="text-slate-800 text-right">{data.fechaHora}</span>

        <span className="text-slate-500">Tipo de registro</span>
        <div className="text-right">
          <Badge className="bg-rose-50 text-red-700">Incidencia</Badge>
        </div>
      </div>

      <hr className="border-blue-100" />

      {/* Descripción */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-800 font-['Inter']">
          Descripción
        </span>
        <div className="bg-slate-50 border border-blue-100 rounded-md p-3 text-xs text-slate-800 font-['Inter'] leading-relaxed">
          {data.descripcionCompleta}
        </div>
      </div>

      {/* Estado al momento */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-['Inter'] max-w-[140px]">
          Estado del pedido al momento del registro
        </span>
        <Badge className="bg-indigo-50 text-sky-700">En preparación</Badge>
      </div>

      {/* Info */}
      <div className="bg-slate-50 border border-blue-200 rounded-md p-3 flex gap-2">
        <div className="w-5 h-5 bg-white rounded-full border border-sky-700 flex items-center justify-center text-sky-700 font-bold text-xs shrink-0">
          i
        </div>
        <p className="text-[10px] text-sky-700 font-['Inter'] leading-tight">
          Esta incidencia forma parte del historial del pedido y puede ser
          consultada junto con el resto de cambios y observaciones.
        </p>
      </div>
    </div>
  );
}
