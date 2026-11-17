import { useEffect, useState } from "react";
import { pedidosService } from "../../api/pedidosService";

const NOMBRES_MODALIDAD = {
  SALON: "Salón",
  RECOJO: "Recojo",
  DELIVERY: "Delivery",
};

export default function Reportes() {
  const [periodo, setPeriodo] = useState("hoy");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    pedidosService.obtenerEstadisticas({ periodo })
      .then((respuesta) => {
        if (vigente) {
          setDatos(respuesta);
          setError("");
        }
      })
      .catch(() => {
        if (vigente) {
          setDatos(null);
          setError("No se pudieron cargar los reportes. Intenta nuevamente.");
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [periodo]);

  const productos = datos?.productos_por_hora || [];
  const incidencias = datos?.incidencias_por_modalidad || [];
  const totalProductos = productos.reduce((total, fila) => total + fila.cantidad, 0);
  const totalIncidencias = incidencias.reduce((total, fila) => total + fila.cantidad, 0);
  const maxProducto = Math.max(1, ...productos.map((fila) => fila.cantidad));
  const maxIncidencia = Math.max(1, ...incidencias.map((fila) => fila.cantidad));

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">Reportes</h1>
          <p className="text-xs text-slate-500 font-['Inter']">
            Productos, preparación e incidencias del período.
          </p>
        </div>
        <select
          value={periodo}
          onChange={(evento) => { setCargando(true); setPeriodo(evento.target.value); }}
          className="h-10 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
          aria-label="Período de reportes"
        >
          <option value="hoy">Hoy</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
        </select>
      </div>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {cargando ? (
        <p className="text-sm text-slate-500">Cargando reportes...</p>
      ) : !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Productos vendidos" valor={totalProductos} sub="Unidades registradas" />
            <StatCard
              label="Tiempo promedio de preparación"
              valor={datos.tiempo_promedio_preparacion_minutos === null
                ? "Sin datos"
                : `${datos.tiempo_promedio_preparacion_minutos} min`}
              sub={`${datos.pedidos_preparados} pedidos preparados`}
            />
            <StatCard label="Incidencias registradas" valor={totalIncidencias} sub="Todas las modalidades" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 font-['Inter']">Productos más vendidos por hora</h2>
                <p className="text-xs text-slate-500">Según la hora de registro de pedidos no cancelados.</p>
              </div>
              {productos.length === 0 ? (
                <p className="text-sm text-slate-500">No hay productos vendidos en este período.</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                  {productos.map((fila) => (
                    <div key={`${fila.hora}-${fila.producto_id}`} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-slate-500 shrink-0">{fila.hora}</span>
                      <span className="w-36 text-xs text-slate-800 font-['Inter'] shrink-0">{fila.producto}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-3 bg-orange-600 rounded-full" style={{ width: `${(fila.cantidad / maxProducto) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold text-slate-800">{fila.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-800 font-['Inter']">Incidencias por modalidad de entrega</h2>
              {totalIncidencias === 0 ? (
                <p className="text-sm text-slate-500">No hay incidencias registradas en este período.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {incidencias.map((fila) => (
                    <div key={fila.modalidad} className="bg-slate-50 rounded-md p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-800 font-['Inter']">{NOMBRES_MODALIDAD[fila.modalidad] || fila.modalidad}</span>
                        <span className="text-xs font-semibold text-orange-600 font-['Inter']">{fila.cantidad} incidencias</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-2 bg-orange-600 rounded-full" style={{ width: `${(fila.cantidad / maxIncidencia) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-sm font-bold text-slate-800 font-['Inter']">{totalIncidencias} incidencias</span>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
            <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">i</div>
            <p className="flex-1 text-xs text-blue-800 font-['Inter']">
              Preparación: pedidos terminados en el período. Incidencias: fecha de registro.
            </p>
            <span className="text-xs font-semibold text-slate-800 font-['Inter'] capitalize">Período: {periodo}</span>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, valor, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-1.5">
      <span className="text-xs text-slate-500 font-medium font-['Inter']">{label}</span>
      <span className="text-2xl font-bold text-slate-800 font-['Inter']">{valor}</span>
      <span className="text-xs text-orange-600 font-['Inter']">{sub}</span>
    </div>
  );
}
