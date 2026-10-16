import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

// ----------------------------------------------------------------------
// Datos de ejemplo (luego vendrán del backend)
// ----------------------------------------------------------------------
const PEDIDOS_INICIALES = [
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
    cliente: "Cliente frecuente",
    modalidad: "Recojo",
    productos: "1 Pollo entero, Papas familiares",
    total: 42.0,
    estado: "En cola",
  },
  {
    id: "#P0008",
    hora: "11:32",
    cliente: "Cliente mostrador",
    modalidad: "Salón",
    productos: "1/4 Pollo, Ensalada, Gaseosa",
    total: 54.0,
    estado: "En preparación",
  },
  {
    id: "#P0011",
    hora: "11:40",
    cliente: "Cliente frecuente",
    modalidad: "Delivery",
    productos: "1 Pollo entero, Papas, Ensalada",
    total: 42.0,
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
  {
    id: "#P0014",
    hora: "11:50",
    cliente: "Cliente frecuente",
    modalidad: "Delivery",
    productos: "1 Pollo entero, Gaseosa 1.5 L",
    total: 42.0,
    estado: "Listo",
  },
  {
    id: "#P0015",
    hora: "11:52",
    cliente: "Cliente mostrador",
    modalidad: "Recojo",
    productos: "1/2 Pollo, Ensalada, Papas",
    total: 54.0,
    estado: "Listo",
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
  Entregado: "bg-emerald-100 text-emerald-700",
  Cancelado: "bg-red-100 text-red-700",
};

// Configuración por rol (título, subtítulo, acción principal)
const ROL_CONFIG = {
  cajero: {
    titulo: "Pedidos",
    subtitulo: "Estado de los pedidos de todas las áreas.",
    home: "/cajero/registrar-pedido",
  },
  cocinero: {
    titulo: "Pedidos",
    subtitulo: "Pedidos en producción y su estado.",
    home: "/cocinero/cola",
  },
  despacho: {
    titulo: "Pedidos",
    subtitulo: "Pedidos listos y su estado de despacho.",
    home: "/despacho/panel",
  },
  administrador: {
    titulo: "Pedidos",
    subtitulo: "Estado de los pedidos de todas las áreas.",
    home: "/admin/resumen",
  },
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function Pedidos() {
  const navigate = useNavigate();
  const location = useLocation();

  // Detectamos el rol según la URL
  const rol = useMemo(() => {
    if (location.pathname.startsWith("/cajero")) return "cajero";
    if (location.pathname.startsWith("/cocinero")) return "cocinero";
    if (location.pathname.startsWith("/despacho")) return "despacho";
    return "administrador";
  }, [location.pathname]);

  const config = ROL_CONFIG[rol];

  // ---------- Estado ----------
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroModalidad, setFiltroModalidad] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");

  // ---------- Contadores ----------
  const stats = useMemo(() => {
    const total = PEDIDOS_INICIALES.length;
    const pendientes = PEDIDOS_INICIALES.filter(
      (p) => p.estado === "En cola",
    ).length;
    const enPrep = PEDIDOS_INICIALES.filter(
      (p) => p.estado === "En preparación",
    ).length;
    const listos = PEDIDOS_INICIALES.filter((p) => p.estado === "Listo").length;
    return { total, pendientes, enPrep, listos };
  }, []);

  // ---------- Filtrado ----------
  const pedidosFiltrados = useMemo(() => {
    return PEDIDOS_INICIALES.filter((p) => {
      const okEstado =
        filtroEstado === "Todos" ? true : p.estado === filtroEstado;
      const okModalidad =
        filtroModalidad === "Todas" ? true : p.modalidad === filtroModalidad;
      const q = busqueda.trim().toLowerCase();
      const okBusqueda = !q
        ? true
        : p.id.toLowerCase().includes(q) ||
          p.cliente.toLowerCase().includes(q) ||
          p.productos.toLowerCase().includes(q);
      return okEstado && okModalidad && okBusqueda;
    });
  }, [filtroEstado, filtroModalidad, busqueda]);

  // ---------- Acciones ----------
  const verDetalle = (id) => {
    const baseByRol = {
      cajero: "/cajero/pedidos/detalle",
      cocinero: "/cocinero/pedidos/detalle",
      despacho: "/despacho/pedidos/detalle",
      administrador: "/admin/pedidos/detalle",
    };
    navigate(`${baseByRol[rol]}?id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          {config.titulo}
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          {config.subtitulo}
        </p>
      </div>

      {/* ---------- Filtros de estado + modalidad ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: `Todos (${stats.total})`, valor: "Todos" },
            { label: `Pendientes (${stats.pendientes})`, valor: "En cola" },
            {
              label: `En preparación (${stats.enPrep})`,
              valor: "En preparación",
            },
            { label: `Listos (${stats.listos})`, valor: "Listo" },
          ].map((f) => {
            const active = filtroEstado === f.valor;
            return (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltroEstado(f.valor)}
                className={`px-4 h-10 rounded-md text-xs font-semibold transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-600 border border-orange-600"
                    : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
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

      {/* ---------- Buscador ---------- */}
      <div className="relative max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-lg">
          ⌕
        </span>
        <input
          type="text"
          placeholder="Buscar por # pedido, cliente o producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500"
        />
      </div>

      {/* ---------- Tabla ---------- */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
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
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No hay pedidos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((p) => (
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
                        onClick={() => verDetalle(p.id)}
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

      {/* ---------- Banner inferior ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          Vista consolidada para consultar el estado de cada pedido.
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          Mostrando {pedidosFiltrados.length} de {stats.total} pedidos
        </span>
      </div>
    </div>
  );
}
