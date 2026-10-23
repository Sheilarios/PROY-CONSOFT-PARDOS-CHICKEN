import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  "En cola": "bg-rose-50 text-rose-700",
  "En preparación": "bg-indigo-50 text-blue-800",
  Listo: "bg-green-100 text-green-700",
};

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
      const hora = (fecha) => fecha ? new Date(fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "--:--";
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

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
            Cola de cocina
          </h1>
          <p className="text-xs text-slate-500 font-['Inter']">
            Pedidos ordenados por modalidad y antigüedad.
          </p>
        </div>

        <div className="px-4 py-1.5 bg-orange-100 rounded-full">
          <span className="text-xs font-bold text-orange-600 font-['Inter'] uppercase">
            Cocinero
          </span>
        </div>
      </div>

      <button type="button" onClick={cargarPedidos} disabled={cargando || procesandoId !== null} className="self-start px-4 py-2 rounded-md bg-orange-600 text-white text-xs font-semibold">
        Actualizar cola
      </button>
      {cargando && <p className="text-xs text-slate-500">Cargando pedidos...</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

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
                  "Acción",
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
                    colSpan={9}
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
                        <button
                          type="button"
                          onClick={() => marcarListo(p.id)}
                          disabled={procesandoId !== null}
                          className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          Marcar listo
                        </button>
                      )}
                      {p.estado === "Listo" && (
                        <span className="text-xs text-green-700 font-semibold font-['Inter']">
                          ✓ Completado
                        </span>
                      )}
                    </td>
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
    </div>
  );
}
