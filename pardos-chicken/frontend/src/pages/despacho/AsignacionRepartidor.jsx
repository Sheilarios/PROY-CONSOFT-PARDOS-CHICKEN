import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import { mensajeError, productos } from "./despachoUtils";

export default function AsignacionRepartidor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  const [pedido, setPedido] = useState(null);
  const [repartidores, setRepartidores] = useState([]);
  const [seleccionado, setSeleccionado] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) { setError("Selecciona un pedido Delivery del panel."); return; }
    Promise.all([pedidosService.obtenerPedido(id), pedidosService.listarRepartidores()])
      .then(([orden, lista]) => { setPedido(orden); setRepartidores(lista); })
      .catch((err) => setError(mensajeError(err, "No se pudieron cargar los datos de asignación.")));
  }, [id]);

  const disponible = repartidores.filter((r) => r.activo && r.disponible);
  const asignable = pedido?.estado === "LISTO" && pedido.modalidad_entrega === "DELIVERY"
    && Boolean(pedido.fecha_verificacion) && !pedido.repartidor;
  const asignar = async () => {
    setGuardando(true);
    setError("");
    try {
      await pedidosService.asignarRepartidor(id, Number(seleccionado));
      navigate("/despacho/panel", { state: { aviso: "Repartidor asignado correctamente." } });
    } catch (err) {
      setError(mensajeError(err, "No se pudo asignar el repartidor."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl">
      <button type="button" onClick={() => navigate("/despacho/panel")} className="self-start text-xs font-semibold text-orange-600">← Volver al panel</button>
      <h1 className="text-2xl font-bold text-slate-800">Asignar repartidor {pedido?.codigo || ""}</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!pedido && !error && <p className="text-sm text-slate-500">Cargando...</p>}
      {pedido && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-5 text-sm flex flex-col gap-2">
            <p><strong>Cliente:</strong> {pedido.cliente_nombre || "—"}</p>
            <p><strong>Dirección:</strong> {pedido.direccion_delivery || "Sin dirección"}</p>
            <p><strong>Productos:</strong> {productos(pedido)}</p>
            <p><strong>Estado:</strong> {pedido.estado === "LISTO" ? "Listo" : pedido.estado}</p>
            {pedido.repartidor_nombre && <p><strong>Repartidor asignado:</strong> {pedido.repartidor_nombre}</p>}
          </div>
          {!asignable && <p className="text-sm text-orange-700">Solo se asigna un repartidor a un pedido Delivery listo, verificado y sin asignación previa.</p>}
          <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-800">Repartidores disponibles</h2>
            {disponible.length ? disponible.map((r) => (
              <label key={r.id} className="flex items-center gap-3 border-t border-slate-100 pt-3 text-sm cursor-pointer">
                <input type="radio" name="repartidor" value={r.id} checked={seleccionado === String(r.id)} onChange={(e) => setSeleccionado(e.target.value)} disabled={!asignable} />
                <span className="flex-1 font-semibold text-slate-800">{r.nombre}</span>
                <span className="text-slate-500">{r.zona || "Sin zona"} · {r.telefono}</span>
              </label>
            )) : <p className="text-sm text-slate-500">No hay repartidores disponibles. Registra uno o libera a uno que haya regresado.</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate("/despacho/panel")} className="btn-secundario">Cancelar</button>
            <button type="button" onClick={asignar} disabled={!asignable || !seleccionado || guardando} className="btn-accion">{guardando ? "Asignando..." : "Confirmar asignación"}</button>
          </div>
        </>
      )}
    </div>
  );
}
