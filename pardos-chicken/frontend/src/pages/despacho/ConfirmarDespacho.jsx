import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import { fecha, mensajeError, MODALIDADES } from "./despachoUtils";

export default function ConfirmarDespacho() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!id) { setError("Selecciona un pedido del panel."); return; }
    pedidosService.obtenerPedido(id).then(setPedido).catch((err) => setError(mensajeError(err, "No se pudo cargar el pedido.")));
  }, [id]);

  const preparado = Boolean(pedido?.hora_fin_preparacion && pedido?.detalles.length);
  const verificado = Boolean(pedido?.fecha_verificacion);
  const asignado = pedido?.modalidad_entrega !== "DELIVERY" || Boolean(pedido?.repartidor);
  const puedeConfirmar = pedido?.estado === "LISTO" && preparado && verificado && asignado;

  const confirmar = async () => {
    setConfirmando(true);
    setError("");
    try {
      await pedidosService.confirmarDespacho(id);
      navigate("/despacho/panel", { state: { aviso: "Despacho confirmado correctamente." } });
    } catch (err) {
      setError(mensajeError(err, "No se pudo confirmar el despacho."));
      setConfirmando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl">
      <button type="button" onClick={() => navigate("/despacho/panel")} className="self-start text-xs font-semibold text-orange-600">← Volver al panel</button>
      <h1 className="text-2xl font-bold text-slate-800">Confirmar despacho {pedido?.codigo || ""}</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!pedido && !error && <p className="text-sm text-slate-500">Cargando pedido...</p>}
      {pedido && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Dato etiqueta="Cliente" valor={pedido.cliente_nombre || "—"} />
            <Dato etiqueta="Modalidad" valor={MODALIDADES[pedido.modalidad_entrega]} />
            <Dato etiqueta="Estado" valor={pedido.estado === "LISTO" ? "Listo" : pedido.estado} />
            <Dato etiqueta="Terminó Cocina" valor={fecha(pedido.hora_fin_preparacion)} />
            <Dato etiqueta="Verificado" valor={fecha(pedido.fecha_verificacion)} />
            <Dato etiqueta="Repartidor" valor={pedido.repartidor_nombre || (pedido.modalidad_entrega === "DELIVERY" ? "Sin asignar" : "No aplica")} />
            {pedido.direccion_delivery && <Dato etiqueta="Dirección" valor={pedido.direccion_delivery} />}
            {pedido.observaciones && <Dato etiqueta="Observaciones" valor={pedido.observaciones} />}
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-base font-bold text-slate-800 mb-3">Productos preparados</h2>
            {pedido.detalles.map((detalle) => <p key={detalle.id} className="text-sm text-slate-800 py-1">{detalle.cantidad} × {detalle.producto_nombre}</p>)}
          </div>
          {!puedeConfirmar && (
            <p className="text-sm text-orange-700">
              {pedido.estado !== "LISTO" ? "Solo se despachan pedidos listos." : !preparado ? "Cocina debe terminar la preparación." : !verificado ? "Primero verifica el pedido." : "Asigna un repartidor para Delivery."}
            </p>
          )}
          <p className="text-xs text-slate-500">
            {pedido.modalidad_entrega === "DELIVERY" ? "Confirma la entrega del pedido al repartidor." : "Confirma la entrega del pedido al cliente."}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate("/despacho/panel")} className="btn-secundario">Cancelar</button>
            <button type="button" onClick={confirmar} disabled={!puedeConfirmar || confirmando} className="btn-accion">{confirmando ? "Confirmando..." : "Confirmar despacho"}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return <div><span className="block text-xs text-slate-500">{etiqueta}</span><strong className="text-slate-800 whitespace-pre-wrap">{valor}</strong></div>;
}
