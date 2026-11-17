import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import { ESTADOS, fecha, mensajeError, MODALIDADES } from "./despachoUtils";

export default function PedidosDespacho() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [estado, setEstado] = useState("Todos");
  const [modalidad, setModalidad] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try { setPedidos(await pedidosService.listarDespacho()); }
    catch (err) { setError(mensajeError(err, "No se pudieron cargar los pedidos.")); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    window.addEventListener("focus", cargar);
    return () => window.removeEventListener("focus", cargar);
  }, [cargar]);

  const visibles = useMemo(() => pedidos.filter((p) =>
    (estado === "Todos" || p.estado === estado)
    && (modalidad === "Todas" || p.modalidad_entrega === modalidad)
    && (!busqueda.trim() || p.codigo.toLowerCase().includes(busqueda.trim().toLowerCase()))
  ), [pedidos, estado, modalidad, busqueda]);
  const ir = (ruta, p) => navigate(ruta + "?id=" + encodeURIComponent(p.id));

  return (
    <div className="flex flex-col gap-4 w-full">
      <div><h1 className="text-2xl font-bold text-slate-800">Pedidos de despacho</h1><p className="text-sm text-slate-500">Pedidos listos y despachados.</p></div>
      <button type="button" onClick={cargar} disabled={cargando} className="btn-accion self-start">Actualizar pedidos</button>
      {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código..." className="h-10 px-3 border border-slate-200 rounded-md bg-white text-sm" />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-md bg-white text-sm"><option value="Todos">Todos los estados</option><option value="LISTO">Listo</option><option value="DESPACHADO">Despachado</option></select>
        <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-md bg-white text-sm"><option value="Todas">Todas las modalidades</option>{Object.entries(MODALIDADES).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}</select>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-800"><tr>{["Código", "Modalidad", "Cliente", "Hora", "Estado", "Verificación", "Acción"].map((col) => <th key={col} className="p-3">{col}</th>)}</tr></thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id} className="border-t border-slate-200 text-slate-800">
                <td className="p-3 font-semibold">{p.codigo}</td>
                <td className="p-3">{MODALIDADES[p.modalidad_entrega]}</td>
                <td className="p-3">{p.cliente_nombre || "—"}</td>
                <td className="p-3">{fecha(p.fecha_creacion)}</td>
                <td className="p-3">{ESTADOS[p.estado]}</td>
                <td className="p-3">{p.fecha_verificacion ? "Verificado" : "Pendiente"}</td>
                <td className="p-3"><div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => ir("/despacho/pedidos/detalle", p)} className="btn-secundario">Ver detalle</button>
                  {p.estado === "LISTO" && !p.fecha_verificacion && <button type="button" onClick={() => ir("/despacho/verificacion", p)} className="btn-accion">Verificar pedido</button>}
                  {p.estado === "LISTO" && p.fecha_verificacion && p.modalidad_entrega === "DELIVERY" && !p.repartidor && <button type="button" onClick={() => ir("/despacho/asignar-repartidor", p)} className="btn-accion">Asignar repartidor</button>}
                  {p.estado === "LISTO" && p.fecha_verificacion && (p.modalidad_entrega !== "DELIVERY" || p.repartidor) && <button type="button" onClick={() => ir("/despacho/confirmar", p)} className="btn-accion">Confirmar despacho</button>}
                  {p.estado === "LISTO" && !p.fecha_verificacion && <button type="button" onClick={() => ir("/despacho/incidencias/nueva", p)} className="btn-secundario">Registrar incidencia</button>}
                </div></td>
              </tr>
            ))}
            {!visibles.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No hay pedidos con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
