import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

const MODALIDADES = { SALON: "Salón", DELIVERY: "Delivery", RECOJO: "Recojo" };
const ESTADOS = {
  REGISTRADO: "Registrado",
  EN_COLA: "En cola",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  DESPACHADO: "Despachado",
  CANCELADO: "Cancelado",
};

export default function DetallePedido() {
  const navigate = useNavigate();
  const location = useLocation();
  const rutaPedidos = location.pathname.replace(/\/detalle\/?$/, "");
  const [params] = useSearchParams();
  const id = params.get("id");
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const cargarPedido = useCallback(async () => {
    if (!id) {
      setError("Selecciona un pedido en la lista.");
      setCargando(false);
      return;
    }
    setCargando(true);
    setError("");
    try {
      setPedido(await pedidosService.obtenerPedido(id));
    } catch {
      setError("No se pudo cargar el pedido.");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargarPedido(); }, [cargarPedido]);

  useEffect(() => {
    window.addEventListener("focus", cargarPedido);
    return () => window.removeEventListener("focus", cargarPedido);
  }, [cargarPedido]);

  const enviarAProduccion = async () => {
    setEnviando(true);
    setError("");
    try {
      const pedidoActual = await pedidosService.obtenerPedido(pedido.id);
      setPedido(pedidoActual);
      if (pedidoActual.estado !== "REGISTRADO") {
        setError("Este pedido ya no está registrado. Se actualizó el detalle.");
        return;
      }
      await pedidosService.enviarAProduccion(pedido.id);
      await cargarPedido();
    } catch (err) {
      const estado = err.response?.data?.estado;
      await cargarPedido();
      setError(Array.isArray(estado) ? estado[0] : "No se pudo enviar el pedido a cocina.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-4">
      <button type="button" onClick={() => navigate(rutaPedidos)} className="self-start text-xs font-semibold text-orange-600">
        ← Volver a pedidos
      </button>
      <h1 className="text-2xl font-bold text-slate-800">Detalle del pedido</h1>
      {cargando && <p className="text-xs text-slate-500">Cargando pedido...</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      {pedido && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Dato label="Código" valor={pedido.codigo} />
            <Dato label="Cliente" valor={pedido.cliente_nombre || "—"} />
            <Dato label="Teléfono" valor={pedido.cliente_telefono || "—"} />
            <Dato label="Modalidad" valor={MODALIDADES[pedido.modalidad_entrega]} />
            <Dato label="Estado" valor={ESTADOS[pedido.estado]} />
            <Dato label="Total" valor={`S/ ${Number(pedido.total).toFixed(2)}`} />
            <Dato label="Registrado" valor={new Date(pedido.fecha_creacion).toLocaleString("es-PE")} />
            {pedido.direccion_delivery && <Dato label="Dirección" valor={pedido.direccion_delivery} />}
            {pedido.observaciones && <Dato label="Observaciones" valor={pedido.observaciones} />}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 mb-3">Productos</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-xs text-slate-800">
                <thead className="bg-slate-50">
                  <tr><th className="p-2 text-left">Producto</th><th className="p-2 text-right">Cantidad</th><th className="p-2 text-right">Precio</th><th className="p-2 text-right">Subtotal</th></tr>
                </thead>
                <tbody>
                  {pedido.detalles.map((detalle) => (
                    <tr key={detalle.id} className="border-t border-slate-200">
                      <td className="p-2">{detalle.producto_nombre}</td>
                      <td className="p-2 text-right">{detalle.cantidad}</td>
                      <td className="p-2 text-right">S/ {detalle.precio_unitario_congelado}</td>
                      <td className="p-2 text-right">S/ {detalle.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pedido.estado === "REGISTRADO" && (
            <button type="button" onClick={enviarAProduccion} disabled={enviando} className="self-start px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-md disabled:opacity-50">
              {enviando ? "Enviando..." : "Enviar a cocina"}
            </button>
          )}
          {location.pathname.startsWith("/cajero/") && ["REGISTRADO", "EN_COLA"].includes(pedido.estado) && (
            <button
              type="button"
              onClick={() => navigate(`/cajero/incidencias/nueva?pedido=${pedido.id}`)}
              className="self-start px-4 py-2 bg-white text-orange-600 text-xs font-semibold rounded-md border border-orange-600 hover:bg-orange-50"
            >
              Registrar incidencia y anular
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800 whitespace-pre-wrap break-words">{valor}</span>
    </div>
  );
}
