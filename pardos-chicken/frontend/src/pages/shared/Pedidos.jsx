import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";


// ----------------------------------------------------------------------
// Estilos
// ----------------------------------------------------------------------
const MODALIDAD_STYLES = {
  Delivery: "bg-rose-50 text-rose-700",
  Recojo: "bg-indigo-50 text-blue-800",
  Salón: "bg-yellow-50 text-yellow-800",
};

const ESTADO_STYLES = {
  Registrado: "bg-slate-100 text-slate-800",
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
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [error, setError] = useState("");

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await pedidosService.listar();
      const lista = respuesta.results || respuesta;
      const modalidades = { SALON: "Salón", DELIVERY: "Delivery", RECOJO: "Recojo" };
      const estados = { REGISTRADO: "Registrado", EN_COLA: "En cola", EN_PREPARACION: "En preparación", LISTO: "Listo", DESPACHADO: "Despachado", CANCELADO: "Cancelado" };
      setPedidos(lista.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        hora: new Date(p.fecha_creacion).toLocaleString("es-PE"),
        cliente: p.cliente_nombre || "—",
        modalidad: modalidades[p.modalidad_entrega] || p.modalidad_entrega,
        productos: p.detalles.map((d) => `${d.cantidad} × ${d.producto_nombre}`).join(", "),
        total: Number(p.total),
        estado: estados[p.estado] || p.estado,
        estadoCodigo: p.estado,
      })));
    } catch {
      setError("No se pudieron cargar los pedidos.");
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos, filtroEstado]);

  useEffect(() => {
    window.addEventListener("focus", cargarPedidos);
    return () => window.removeEventListener("focus", cargarPedidos);
  }, [cargarPedidos]);

  // ---------- Contadores ----------
  const stats = useMemo(() => {
    const total = pedidos.length;
    const registrados = pedidos.filter((p) => p.estado === "Registrado").length;
    const pendientes = pedidos.filter(
      (p) => p.estado === "En cola",
    ).length;
    const enPrep = pedidos.filter(
      (p) => p.estado === "En preparación",
    ).length;
    const listos = pedidos.filter((p) => p.estado === "Listo").length;
    const cancelados = pedidos.filter((p) => p.estado === "Cancelado").length;
    return { total, registrados, pendientes, enPrep, listos, cancelados };
  }, [pedidos]);

  // ---------- Filtrado ----------
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const okEstado =
        filtroEstado === "Todos" ? true : p.estado === filtroEstado;
      const okModalidad =
        filtroModalidad === "Todas" ? true : p.modalidad === filtroModalidad;
      const q = busqueda.trim().toLowerCase();
      const okBusqueda = !q
        ? true
        : p.codigo.toLowerCase().includes(q) ||
          p.cliente.toLowerCase().includes(q) ||
          p.productos.toLowerCase().includes(q);
      return okEstado && okModalidad && okBusqueda;
    });
  }, [pedidos, filtroEstado, filtroModalidad, busqueda]);

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

  const enviarAProduccion = async (id) => {
    setProcesandoId(id);
    setError("");
    try {
      const pedidoActual = await pedidosService.obtenerPedido(id);
      if (pedidoActual.estado !== "REGISTRADO") {
        await cargarPedidos();
        setError("Este pedido ya no está registrado. Se actualizó la lista.");
        return;
      }
      await pedidosService.enviarAProduccion(id);
      await cargarPedidos();
    } catch (err) {
      const estado = err.response?.data?.estado;
      await cargarPedidos();
      setError(Array.isArray(estado) ? estado[0] : "No se pudo enviar el pedido a cocina.");
    } finally {
      setProcesandoId(null);
    }
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

      {cargando && <p className="text-xs text-slate-500">Cargando pedidos...</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <button type="button" onClick={cargarPedidos} disabled={cargando || procesandoId !== null} className="self-start px-4 py-2 rounded-md bg-orange-600 text-white text-xs font-semibold">
        Actualizar pedidos
      </button>

      {/* ---------- Filtros de estado + modalidad ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: `Todos (${stats.total})`, valor: "Todos" },
            { label: `Registrados (${stats.registrados})`, valor: "Registrado" },
            { label: `En cola (${stats.pendientes})`, valor: "En cola" },
            {
              label: `En preparación (${stats.enPrep})`,
              valor: "En preparación",
            },
            { label: `Listos (${stats.listos})`, valor: "Listo" },
            { label: `Cancelados (${stats.cancelados})`, valor: "Cancelado" },
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
                      {p.codigo}
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
                      <div className="flex flex-wrap gap-2">
                        {p.estadoCodigo === "REGISTRADO" && (
                          <button type="button" onClick={() => enviarAProduccion(p.id)} disabled={cargando || procesandoId !== null} className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded disabled:opacity-50">
                            Enviar a cocina
                          </button>
                        )}
                        {rol === "cajero" && ["REGISTRADO", "EN_COLA"].includes(p.estadoCodigo) && (
                          <button
                            type="button"
                            onClick={() => navigate(`/cajero/pedidos/editar?id=${encodeURIComponent(p.id)}`)}
                            className="px-3 py-1.5 bg-white border border-orange-600 text-orange-600 text-xs font-semibold rounded hover:bg-orange-50"
                          >
                            Editar pedido
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => verDetalle(p.id)}
                          className="px-4 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded hover:bg-slate-50 transition-colors"
                        >
                          Ver detalle
                        </button>
                      </div>
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
