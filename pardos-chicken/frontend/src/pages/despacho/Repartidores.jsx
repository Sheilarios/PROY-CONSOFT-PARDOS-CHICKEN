import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import { mensajeError } from "./despachoUtils";

export default function Repartidores() {
  const navigate = useNavigate();
  const [repartidores, setRepartidores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("Todos");
  const [nuevo, setNuevo] = useState({ nombre: "", telefono: "", zona: "" });
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [lista, ordenes] = await Promise.all([pedidosService.listarRepartidores(), pedidosService.listarDespacho()]);
      setRepartidores(lista);
      setPedidos(ordenes);
    } catch (err) {
      setError(mensajeError(err, "No se pudieron cargar los repartidores."));
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const pendientes = pedidos.filter((p) => p.estado === "LISTO" && p.modalidad_entrega === "DELIVERY" && p.fecha_verificacion && !p.repartidor);
  const visibles = useMemo(() => repartidores.filter((r) =>
    filtro === "Todos" || (filtro === "Disponibles" ? r.disponible && r.activo : !r.disponible)
  ), [repartidores, filtro]);
  const crear = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await pedidosService.crearRepartidor(nuevo);
      setNuevo({ nombre: "", telefono: "", zona: "" });
      await cargar();
      setAviso("Repartidor registrado correctamente.");
    } catch (err) {
      setError(mensajeError(err, "No se pudo registrar el repartidor."));
    } finally {
      setGuardando(false);
    }
  };
  const liberar = async (id) => {
    setGuardando(true);
    setError("");
    try {
      await pedidosService.liberarRepartidor(id);
      await cargar();
      setAviso("Repartidor marcado como disponible.");
    } catch (err) {
      setError(mensajeError(err, "No se pudo liberar el repartidor."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-800">Repartidores</h1><p className="text-sm text-slate-500">Disponibilidad y asignación de entregas Delivery.</p></div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-md text-xs">
          <option>Todos</option><option>Disponibles</option><option>Ocupados</option>
        </select>
      </div>
      <button type="button" onClick={cargar} disabled={cargando} className="btn-accion self-start">Actualizar</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {aviso && <p role="status" className="text-sm text-green-700">{aviso}</p>}
      {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Resumen titulo="Disponibles" valor={repartidores.filter((r) => r.activo && r.disponible).length} />
        <Resumen titulo="Ocupados" valor={repartidores.filter((r) => !r.disponible).length} />
        <Resumen titulo="Delivery sin asignar" valor={pendientes.length} />
      </div>
      <form onSubmit={crear} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <h2 className="w-full text-base font-bold text-slate-800">Registrar repartidor</h2>
        <label className="flex flex-col gap-1 text-xs text-slate-500">Nombre<input required maxLength={120} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-md text-sm text-slate-800" /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">Teléfono<input required maxLength={9} pattern="9[0-9]{8}" value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-md text-sm text-slate-800" /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">Zona<input maxLength={120} value={nuevo.zona} onChange={(e) => setNuevo({ ...nuevo, zona: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-md text-sm text-slate-800" /></label>
        <button type="submit" disabled={guardando} className="btn-accion h-10">{guardando ? "Guardando..." : "Agregar repartidor"}</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visibles.map((r) => {
          const activos = r.disponible ? [] : pedidos.filter((p) => p.repartidor === r.id && (p.estado === "LISTO" || p.estado === "DESPACHADO"));
          const pendiente = activos.some((p) => p.estado === "LISTO");
          return (
            <article key={r.id} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-2 text-sm">
              <strong className="text-slate-800">{r.nombre}</strong>
              <span className={r.activo && r.disponible ? "text-green-700" : "text-orange-700"}>{!r.activo ? "Inactivo" : r.disponible ? "Disponible" : pendiente ? "Asignado" : "En ruta"}</span>
              <span className="text-slate-500">{r.telefono} · {r.zona || "Sin zona registrada"}</span>
              {!r.disponible && <span className="text-slate-500">Pedidos asignados: {activos.map((p) => p.codigo).join(", ") || "—"}</span>}
              {!r.disponible && <button type="button" onClick={() => liberar(r.id)} disabled={pendiente || guardando} className="btn-secundario self-start">Marcar disponible al regresar</button>}
              {r.activo && r.disponible && pendientes.length > 0 && <button type="button" onClick={() => navigate("/despacho/asignar-repartidor?id=" + encodeURIComponent(pendientes[0].id))} className="btn-accion self-start">Asignar pedido</button>}
            </article>
          );
        })}
        {!visibles.length && <p className="text-sm text-slate-500">No hay repartidores con este filtro.</p>}
      </div>
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="text-base font-bold text-slate-800 mb-3">Delivery pendientes de asignación</h2>
        {pendientes.map((p) => <div key={p.id} className="flex flex-wrap items-center gap-3 py-2 border-t border-slate-100 text-sm"><strong>{p.codigo}</strong><span className="flex-1">{p.cliente_nombre || "Sin nombre"} · {p.direccion_delivery}</span><button type="button" onClick={() => navigate("/despacho/asignar-repartidor?id=" + encodeURIComponent(p.id))} className="btn-accion">Asignar repartidor</button></div>)}
        {!pendientes.length && <p className="text-sm text-slate-500">No hay pedidos Delivery pendientes.</p>}
      </section>
    </div>
  );
}

function Resumen({ titulo, valor }) {
  return <div className="bg-white border border-slate-200 rounded-lg p-4"><span className="block text-xs text-slate-500">{titulo}</span><strong className="text-2xl text-slate-800">{valor}</strong></div>;
}
