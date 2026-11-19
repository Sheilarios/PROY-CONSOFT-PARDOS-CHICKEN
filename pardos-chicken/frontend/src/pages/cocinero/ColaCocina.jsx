import React, { useCallback, useEffect, useMemo, useState } from "react";
import { pedidosService } from "../../api/pedidosService";
import { formatearHora } from "../../utils/fechas";


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
};

const TIPOS_INCIDENCIA_COCINA = [
  { valor: "FALTA_INSUMOS", texto: "Falta inesperada de insumos" },
  { valor: "PRODUCTO_DANADO", texto: "Producto dañado o en mal estado" },
  { valor: "EQUIPO_AVERIADO", texto: "Avería de equipo de cocina" },
  { valor: "ERROR_PREPARACION", texto: "Error en la preparación" },
  { valor: "DEMORA_COCINA", texto: "Demora inesperada" },
  { valor: "OTRO_COCINA", texto: "Otro motivo" },
];

function mensajeErrorIncidencia(error) {
  const datos = error.response?.data;
  const mensaje = datos?.pedido_id || datos?.tipo || datos?.descripcion || datos?.detail;
  return Array.isArray(mensaje)
    ? mensaje.join(" ")
    : mensaje || "No se pudo guardar la incidencia. Intenta de nuevo.";
}

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function ColaCocina() {
  const [pedidos, setPedidos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("En cola");
  const [filtroModalidad, setFiltroModalidad] = useState("Todas");
  const [cargando, setCargando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [error, setError] = useState("");
  const [pedidoIncidencia, setPedidoIncidencia] = useState(null);
  const [tipoIncidencia, setTipoIncidencia] = useState(TIPOS_INCIDENCIA_COCINA[0].valor);
  const [descripcionIncidencia, setDescripcionIncidencia] = useState("");
  const [errorIncidencia, setErrorIncidencia] = useState("");
  const [guardandoIncidencia, setGuardandoIncidencia] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const esCocinero = localStorage.getItem("rol") === "cocinero";

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [cola, seguimiento] = await Promise.all([
        pedidosService.listarColaProduccion(),
        pedidosService.listarSeguimientoProduccion(),
      ]);
      const modalidades = { SALON: "Salón", DELIVERY: "Delivery", RECOJO: "Recojo" };
      const estados = { EN_COLA: "En cola", EN_PREPARACION: "En preparación", LISTO: "Listo" };
      const hora = (fecha) => fecha ? formatearHora(fecha) : "--:--";
      setPedidos([...cola, ...seguimiento].map((p) => ({
        id: p.id,
        codigo: p.codigo,
        modalidad: modalidades[p.modalidad_entrega],
        hora: hora(p.fecha_creacion),
        tiempoEnCola: p.estado === "EN_COLA"
          ? `${Math.max(0, Math.floor((Date.now() - new Date(p.fecha_creacion)) / 60000))} min`
          : "—",
        productos: p.detalles.map((d) => `${d.cantidad} × ${d.producto_nombre}`).join(", "),
        observaciones: p.observaciones,
        estado: estados[p.estado],
        inicio: hora(p.hora_inicio_preparacion),
        fin: hora(p.hora_fin_preparacion),
      })));
    } catch {
      setError("No se pudo cargar la producción.");
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const okEstado =
        filtroEstado === "Todos" ? true : p.estado === filtroEstado;
      const okModalidad =
        filtroModalidad === "Todas" ? true : p.modalidad === filtroModalidad;
      return okEstado && okModalidad;
    });
  }, [pedidos, filtroEstado, filtroModalidad]);

  const contar = (estado) => pedidos.filter((p) => p.estado === estado).length;

  // ---------- Acciones ----------
  const iniciarPreparacion = async (id) => {
    setProcesandoId(id);
    try {
      await pedidosService.iniciarPreparacion(id);
      await cargarPedidos();
    } catch (err) {
      const mensaje = err.response?.data?.insumos || err.response?.data?.detalles
        || err.response?.data?.estado;
      setError(Array.isArray(mensaje) ? mensaje[0] : mensaje || "No se pudo iniciar la preparación.");
    } finally {
      setProcesandoId(null);
    }
  };

  const marcarListo = async (id) => {
    setProcesandoId(id);
    try {
      await pedidosService.marcarListo(id);
      await cargarPedidos();
    } catch (err) {
      const estado = err.response?.data?.estado;
      setError(Array.isArray(estado) ? estado[0] : "No se pudo marcar el pedido como listo.");
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirIncidencia = (pedido) => {
    setPedidoIncidencia(pedido);
    setTipoIncidencia(TIPOS_INCIDENCIA_COCINA[0].valor);
    setDescripcionIncidencia("");
    setErrorIncidencia("");
    setMensajeExito("");
  };

  const guardarIncidencia = async (evento) => {
    evento.preventDefault();
    if (!pedidoIncidencia || guardandoIncidencia) return;
    const descripcion = descripcionIncidencia.trim();
    if (!descripcion) {
      setErrorIncidencia("Describe lo que ocurrió.");
      return;
    }
    setGuardandoIncidencia(true);
    setErrorIncidencia("");
    try {
      await pedidosService.registrarIncidenciaCocina({
        pedido_id: pedidoIncidencia.id,
        tipo: tipoIncidencia,
        descripcion,
      });
      setMensajeExito(`Incidencia del pedido ${pedidoIncidencia.codigo} registrada. El pedido sigue en preparación.`);
      setPedidoIncidencia(null);
    } catch (err) {
      setErrorIncidencia(mensajeErrorIncidencia(err));
    } finally {
      setGuardandoIncidencia(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
            {esCocinero ? "Cola de cocina" : "Producción"}
          </h1>
          <p className="text-xs text-slate-500 font-['Inter']">
            {esCocinero
              ? "Pedidos ordenados por modalidad y antigüedad."
              : "Consulta el avance de los pedidos de cocina."}
          </p>
        </div>

        <div className="px-4 py-1.5 bg-orange-100 rounded-full">
          <span className="text-xs font-bold text-orange-600 font-['Inter'] uppercase">
            {esCocinero ? "Cocinero" : "Administrador"}
          </span>
        </div>
      </div>

      <button type="button" onClick={cargarPedidos} disabled={cargando || procesandoId !== null} className="self-start px-4 py-2 rounded-md bg-orange-600 text-white text-xs font-semibold">
        Actualizar cola
      </button>
      {cargando && <p className="text-xs text-slate-500">Cargando pedidos...</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {mensajeExito && <p role="status" className="text-xs text-green-700">{mensajeExito}</p>}

      {/* ---------- Filtros ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: `En cola (${contar("En cola")})`, valor: "En cola" },
            {
              label: `En preparación (${contar("En preparación")})`,
              valor: "En preparación",
            },
            { label: `Listo (${contar("Listo")})`, valor: "Listo" },
            { label: "Todos", valor: "Todos" },
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

      {/* ---------- Tabla ---------- */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "# Pedido",
                  "Modalidad",
                  "Hora",
                  "Tiempo en cola",
                  "Productos",
                  "Estado",
                  ...(esCocinero ? ["Acción"] : []),
                  "Inicio",
                  "Fin",
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
                    colSpan={esCocinero ? 9 : 8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No hay pedidos para los filtros seleccionados.
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
                      {p.hora}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.tiempoEnCola}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.productos}
                      {p.observaciones && (
                        <p className="mt-1 text-orange-700 whitespace-pre-wrap break-words">
                          Obs.: {p.observaciones}
                        </p>
                      )}
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
                    {esCocinero && (
                      <td className="px-3 py-3">
                      {p.estado === "En cola" && (
                        <button
                          type="button"
                          onClick={() => iniciarPreparacion(p.id)}
                          disabled={procesandoId !== null}
                          className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 transition-colors whitespace-nowrap"
                        >
                          Iniciar preparación
                        </button>
                      )}
                      {p.estado === "En preparación" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => marcarListo(p.id)}
                            disabled={procesandoId !== null}
                            className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                          >
                            Marcar listo
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirIncidencia(p)}
                            disabled={procesandoId !== null}
                            className="px-4 py-2 border border-orange-600 text-orange-600 text-xs font-semibold rounded hover:bg-orange-50 transition-colors whitespace-nowrap"
                          >
                            Registrar incidencia
                          </button>
                        </div>
                      )}
                      {p.estado === "Listo" && (
                        <span className="text-xs text-green-700 font-semibold font-['Inter']">
                          ✓ Completado
                        </span>
                      )}
                      </td>
                    )}
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.inicio}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {p.fin}
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
          La cola de cocina se ordena por modalidad y antigüedad (tiempo en
          cola).
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          Total en cola: {contar("En cola")} pedidos
        </span>
      </div>

      {esCocinero && pedidoIncidencia && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-incidencia-cocina" className="w-full max-w-lg bg-white rounded-lg border border-slate-200 p-6 shadow-xl">
            <h2 id="titulo-incidencia-cocina" className="text-xl font-bold text-slate-800">Registrar incidencia</h2>
            <p className="text-sm text-slate-500 mt-1">El pedido conservará su estado y su stock.</p>
            <form onSubmit={guardarIncidencia} className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-sm">
                <div><span className="block text-slate-500">Código del pedido</span><strong className="text-slate-800">{pedidoIncidencia.codigo}</strong></div>
                <div><span className="block text-slate-500">Estado actual</span><strong className="text-slate-800">{pedidoIncidencia.estado}</strong></div>
              </div>
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
                Tipo de incidencia
                <select value={tipoIncidencia} onChange={(evento) => setTipoIncidencia(evento.target.value)} disabled={guardandoIncidencia} className="h-10 px-3 rounded-md border border-slate-200 bg-white font-normal">
                  {TIPOS_INCIDENCIA_COCINA.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
                Descripción
                <textarea value={descripcionIncidencia} onChange={(evento) => setDescripcionIncidencia(evento.target.value)} disabled={guardandoIncidencia} maxLength={500} rows={4} required placeholder="Describe el problema durante la preparación" className="p-3 rounded-md border border-slate-200 font-normal resize-y" />
              </label>
              {errorIncidencia && <p role="alert" className="text-sm text-red-700">{errorIncidencia}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPedidoIncidencia(null)} disabled={guardandoIncidencia} className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold text-slate-800 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={guardandoIncidencia} className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-semibold disabled:opacity-50">{guardandoIncidencia ? "Guardando..." : "Guardar incidencia"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
