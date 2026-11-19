import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import { fecha, mensajeError, MODALIDADES, productos } from "./despachoUtils";

export default function PanelDespacho() {
  const navigate = useNavigate();
  const location = useLocation();
  const esDespacho = localStorage.getItem("rol") === "despacho";
  const [pedidos, setPedidos] = useState([]);
  const [modalidad, setModalidad] = useState("Todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setPedidos(await pedidosService.listarDespacho());
    } catch (err) {
      setError(mensajeError(err, "No se pudo cargar el panel de despacho."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    window.addEventListener("focus", cargar);
    return () => window.removeEventListener("focus", cargar);
  }, [cargar]);

  const visibles = useMemo(() => pedidos.filter(
    (pedido) => modalidad === "Todas" || pedido.modalidad_entrega === modalidad
  ), [pedidos, modalidad]);
  const pendientes = visibles.filter((p) => p.estado === "LISTO" && !p.fecha_verificacion);
  const listos = visibles.filter((p) => p.estado === "LISTO" && p.fecha_verificacion);
  const despachados = visibles.filter((p) => p.estado === "DESPACHADO");
  const ir = (ruta, pedido) => navigate(ruta + "?id=" + encodeURIComponent(pedido.id));
  const detalle = (pedido) => ir(esDespacho ? "/despacho/pedidos/detalle" : "/admin/pedidos/detalle", pedido);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de despacho</h1>
          <p className="text-sm text-slate-500">Pedidos preparados por Cocina y seguimiento de las entregas.</p>
        </div>
        <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="h-10 px-3 rounded-md border border-slate-200 bg-white text-xs">
          <option value="Todas">Todas las modalidades</option>
          {Object.entries(MODALIDADES).map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
        </select>
      </div>
      <button type="button" onClick={cargar} disabled={cargando} className="self-start px-4 py-2 rounded-md bg-orange-600 text-white text-xs font-semibold disabled:opacity-50">Actualizar panel</button>
      {cargando && <p className="text-xs text-slate-500">Cargando pedidos...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {location.state?.aviso && <p role="status" className="text-sm text-green-700">{location.state.aviso}</p>}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Columna titulo="Pendientes de verificación" pedidos={pendientes} vacio="No hay pedidos por verificar.">
          {(pedido) => (
            <Tarjeta pedido={pedido} detalle={() => detalle(pedido)}>
              {esDespacho && <button type="button" onClick={() => ir("/despacho/verificacion", pedido)} className="btn-accion">Verificar pedido</button>}
              {esDespacho && <button type="button" onClick={() => ir("/despacho/incidencias/nueva", pedido)} className="btn-secundario">Registrar incidencia</button>}
            </Tarjeta>
          )}
        </Columna>
        <Columna titulo="Listos para despachar" pedidos={listos} vacio="No hay pedidos verificados pendientes.">
          {(pedido) => (
            <Tarjeta pedido={pedido} detalle={() => detalle(pedido)}>
              {esDespacho && pedido.modalidad_entrega === "DELIVERY" && !pedido.repartidor && (
                <button type="button" onClick={() => ir("/despacho/asignar-repartidor", pedido)} className="btn-accion">Asignar repartidor</button>
              )}
              {esDespacho && (pedido.modalidad_entrega !== "DELIVERY" || pedido.repartidor) && (
                <button type="button" onClick={() => ir("/despacho/confirmar", pedido)} className="btn-accion">Confirmar despacho</button>
              )}
            </Tarjeta>
          )}
        </Columna>
        <Columna titulo="Despachados" pedidos={despachados} vacio="Aún no hay pedidos despachados.">
          {(pedido) => (
            <Tarjeta pedido={pedido} detalle={() => detalle(pedido)} />
          )}
        </Columna>
      </div>
    </div>
  );
}

function Columna({ titulo, pedidos, vacio, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <h2 className="text-base font-bold text-slate-800 mb-3">{titulo} <span className="text-orange-600">({pedidos.length})</span></h2>
      <div className="flex flex-col gap-3">
        {pedidos.length ? pedidos.map((pedido) => <div key={pedido.id}>{children(pedido)}</div>) : <p className="text-sm text-slate-500 py-6 text-center">{vacio}</p>}
      </div>
    </section>
  );
}

function Tarjeta({ pedido, detalle, children }) {
  return (
    <article className="border border-slate-200 rounded-md p-3 flex flex-col gap-2">
      <div className="flex justify-between gap-2">
        <strong className="text-sm text-slate-800">{pedido.codigo}</strong>
        <span className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-700">{MODALIDADES[pedido.modalidad_entrega]}</span>
      </div>
      <p className="text-xs text-slate-500">{fecha(pedido.fecha_creacion)} · {pedido.cliente_nombre || "Sin nombre"}</p>
      <p className="text-xs text-slate-800">{productos(pedido)}</p>
      {pedido.direccion_delivery && <p className="text-xs text-slate-500">Dirección: {pedido.direccion_delivery}</p>}
      {pedido.repartidor_nombre && <p className="text-xs text-slate-500">Repartidor: {pedido.repartidor_nombre}</p>}
      <p className="text-xs text-slate-500">Estado: {pedido.estado === "DESPACHADO" ? "Despachado" : pedido.fecha_verificacion ? "Verificado" : "Por verificar"}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={detalle} className="btn-secundario">Ver detalle</button>
        {children}
      </div>
    </article>
  );
}
