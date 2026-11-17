import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import { mensajeError } from "./despachoUtils";

const TIPOS = [
  ["PEDIDO_INCOMPLETO", "Pedido incompleto"],
  ["PRODUCTO_INCORRECTO", "Producto incorrecto"],
  ["PRODUCTO_DANADO_DESPACHO", "Producto dañado"],
  ["REPARTIDOR_NO_DISPONIBLE", "Repartidor no disponible"],
  ["DEMORA_DESPACHO", "Demora en despacho"],
  ["PROBLEMA_ENTREGA", "Problema con la entrega"],
  ["OTRO_DESPACHO", "Otro motivo"],
];

export default function IncidenciaDespacho() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  const [pedido, setPedido] = useState(null);
  const [tipo, setTipo] = useState(TIPOS[0][0]);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) { setError("Selecciona un pedido del panel."); return; }
    pedidosService.obtenerPedido(id).then(setPedido).catch((err) => setError(mensajeError(err, "No se pudo cargar el pedido.")));
  }, [id]);
  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await pedidosService.registrarIncidenciaDespacho({ pedido_id: Number(id), tipo, descripcion: descripcion.trim() });
      navigate("/despacho/panel", { state: { aviso: "Incidencia registrada en el historial." } });
    } catch (err) {
      setError(mensajeError(err, "No se pudo registrar la incidencia."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl">
      <button type="button" onClick={() => navigate("/despacho/panel")} className="self-start text-xs font-semibold text-orange-600">← Volver al panel</button>
      <h1 className="text-2xl font-bold text-slate-800">Registrar incidencia de despacho</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {pedido && (pedido.estado !== "LISTO" || pedido.fecha_verificacion) && <p className="text-sm text-orange-700">Solo puedes registrar una incidencia antes de verificar un pedido listo.</p>}
      {pedido && pedido.estado === "LISTO" && !pedido.fecha_verificacion && <form onSubmit={guardar} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4">
        <p className="text-sm"><strong>Código:</strong> {pedido.codigo}</p>
        <p className="text-xs text-slate-500">La incidencia quedará en el historial. El pedido conservará su estado.</p>
        <label className="flex flex-col gap-1 text-sm font-semibold">Tipo de incidencia<select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-md font-normal">{TIPOS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Descripción<textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} maxLength={500} required className="p-3 border border-slate-200 rounded-md font-normal" placeholder="Describe el problema" /></label>
        <div className="flex gap-2"><button type="button" onClick={() => navigate("/despacho/panel")} className="btn-secundario">Cancelar</button><button type="submit" disabled={guardando || !descripcion.trim()} className="btn-accion">{guardando ? "Guardando..." : "Guardar incidencia"}</button></div>
      </form>}
    </div>
  );
}
