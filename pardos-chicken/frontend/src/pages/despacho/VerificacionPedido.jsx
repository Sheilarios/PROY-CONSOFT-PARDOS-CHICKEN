import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import { fecha, mensajeError, MODALIDADES } from "./despachoUtils";

export default function VerificacionPedido() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  const [pedido, setPedido] = useState(null);
  const [confirmados, setConfirmados] = useState([]);
  const [empaque, setEmpaque] = useState(false);
  const [observaciones, setObservaciones] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) { setError("Selecciona un pedido del panel."); return; }
    pedidosService.obtenerPedido(id).then(setPedido).catch((err) => setError(mensajeError(err, "No se pudo cargar el pedido.")));
  }, [id]);

  const cambiarDetalle = (detalleId) => setConfirmados((actual) =>
    actual.includes(detalleId) ? actual.filter((valor) => valor !== detalleId) : [...actual, detalleId]
  );
  const puedeVerificar = pedido?.estado === "LISTO" && !pedido.fecha_verificacion
    && confirmados.length === pedido.detalles.length && empaque && observaciones;
  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      await pedidosService.verificarDespacho(id, {
        detalles_confirmados: confirmados,
        empaque_confirmado: empaque,
        observaciones_confirmadas: observaciones,
      });
      navigate("/despacho/panel", { state: { aviso: "Pedido verificado correctamente." } });
    } catch (err) {
      setError(mensajeError(err, "No se pudo verificar el pedido."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl">
      <button type="button" onClick={() => navigate("/despacho/panel")} className="self-start text-xs font-semibold text-orange-600">← Volver al panel</button>
      <h1 className="text-2xl font-bold text-slate-800">Verificar pedido {pedido?.codigo || ""}</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!pedido && !error && <p className="text-sm text-slate-500">Cargando pedido...</p>}
      {pedido && (
        <>
          <div className="bg-white rounded-lg border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Dato etiqueta="Cliente" valor={pedido.cliente_nombre || "—"} />
            <Dato etiqueta="Modalidad" valor={MODALIDADES[pedido.modalidad_entrega]} />
            <Dato etiqueta="Registrado" valor={fecha(pedido.fecha_creacion)} />
            <Dato etiqueta="Preparación terminada" valor={fecha(pedido.hora_fin_preparacion)} />
            <Dato etiqueta="Estado" valor={pedido.estado === "LISTO" ? "Listo" : pedido.estado} />
            {pedido.direccion_delivery && <Dato etiqueta="Dirección" valor={pedido.direccion_delivery} />}
          </div>
          {pedido.estado !== "LISTO" && <p className="text-sm text-orange-700">Solo se verifican pedidos marcados como Listo por Cocina.</p>}
          {pedido.fecha_verificacion && <p className="text-sm text-green-700">Este pedido ya fue verificado el {fecha(pedido.fecha_verificacion)}.</p>}
          <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-800">Productos y cantidades</h2>
            <p className="text-xs text-slate-500">Comprueba físicamente cada producto antes de marcarlo.</p>
            {pedido.detalles.map((detalle) => (
              <label key={detalle.id} className="flex items-center gap-3 border-t border-slate-100 py-3 text-sm text-slate-800">
                <input type="checkbox" checked={confirmados.includes(detalle.id)} onChange={() => cambiarDetalle(detalle.id)} disabled={pedido.estado !== "LISTO" || Boolean(pedido.fecha_verificacion)} />
                <span className="flex-1">{detalle.producto_nombre}</span>
                <strong>Cantidad: {detalle.cantidad}</strong>
              </label>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col gap-4 text-sm">
            <h2 className="text-base font-bold text-slate-800">Lista de verificación</h2>
            <p className="text-slate-600">Observaciones del pedido: <strong className="text-slate-800">{pedido.observaciones || "Sin observaciones"}</strong></p>
            <label className="flex items-center gap-3"><input type="checkbox" checked={empaque} onChange={(e) => setEmpaque(e.target.checked)} disabled={Boolean(pedido.fecha_verificacion)} /> Pedido completo y empaque correcto.</label>
            <label className="flex items-center gap-3"><input type="checkbox" checked={observaciones} onChange={(e) => setObservaciones(e.target.checked)} disabled={Boolean(pedido.fecha_verificacion)} /> Observaciones revisadas y atendidas.</label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate("/despacho/panel")} className="btn-secundario">Cancelar</button>
            <button type="button" onClick={guardar} disabled={!puedeVerificar || guardando} className="btn-accion">{guardando ? "Guardando..." : "Confirmar verificación"}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return <div><span className="block text-xs text-slate-500">{etiqueta}</span><strong className="text-slate-800">{valor}</strong></div>;
}
