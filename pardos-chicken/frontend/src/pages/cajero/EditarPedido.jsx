import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

const ESTADOS_EDITABLES = ["REGISTRADO", "EN_COLA"];
const MODALIDADES = { SALON: "Salón", RECOJO: "Recojo", DELIVERY: "Delivery" };
const SOLES = (valor) => `S/ ${Number(valor).toFixed(2)}`;

function cantidadesPorProducto(detalles) {
  return detalles.reduce((cantidades, detalle) => {
    cantidades[detalle.producto] = (cantidades[detalle.producto] || 0) + detalle.cantidad;
    return cantidades;
  }, {});
}

function mensajeError(error) {
  const datos = error.response?.data;
  const mensaje = datos?.detalles || datos?.estado || datos?.observaciones || datos?.detail;
  if (Array.isArray(mensaje)) return mensaje.join(" ");
  return typeof mensaje === "string" ? mensaje : "No se pudieron guardar los cambios.";
}

export default function EditarPedido() {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const id = parametros.get("id");
  const [pedido, setPedido] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [observaciones, setObservaciones] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Selecciona un pedido en la lista.");
      setCargando(false);
      return;
    }
    let vigente = true;
    Promise.all([pedidosService.obtenerPedido(id), pedidosService.listarProductos()])
      .then(([pedidoActual, productos]) => {
        if (!vigente) return;
        setPedido(pedidoActual);
        setCatalogo(productos);
        setCantidades(cantidadesPorProducto(pedidoActual.detalles));
        setObservaciones(pedidoActual.observaciones || "");
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar el pedido o el catálogo de productos.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [id]);

  const detallesOriginales = useMemo(() => {
    const detalles = new Map();
    (pedido?.detalles || []).forEach((detalle) => {
      const productoId = Number(detalle.producto);
      const anterior = detalles.get(productoId);
      detalles.set(productoId, {
        ...detalle,
        cantidad: (anterior?.cantidad || 0) + detalle.cantidad,
      });
    });
    return detalles;
  }, [pedido]);
  const productosPorId = useMemo(() => new Map(
    catalogo.map((producto) => [Number(producto.id), producto]),
  ), [catalogo]);

  const lineas = useMemo(() => Object.entries(cantidades)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([idProducto, cantidad]) => {
      const productoId = Number(idProducto);
      const anterior = detallesOriginales.get(productoId);
      const producto = productosPorId.get(productoId);
      const precio = Number(anterior?.precio_unitario_congelado ?? producto?.precio_unitario ?? 0);
      return {
        id: productoId,
        nombre: anterior?.producto_nombre || producto?.nombre || `Producto ${productoId}`,
        imagen: producto?.imagen,
        cantidad,
        precio,
        subtotal: precio * cantidad,
        cantidadOriginal: anterior?.cantidad || 0,
        stockAdicional: Number(producto?.stock_disponible || 0),
      };
    }), [cantidades, detallesOriginales, productosPorId]);

  const disponibles = useMemo(() => catalogo.filter((producto) =>
    !cantidades[producto.id]
    && producto.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
  ), [catalogo, cantidades, busqueda]);

  const nuevoTotal = lineas.reduce((total, linea) => total + linea.subtotal, 0);
  const puedeEditar = pedido && ESTADOS_EDITABLES.includes(pedido.estado);
  const cambioEnProductos = pedido && (
    lineas.length !== detallesOriginales.size
    || lineas.some((linea) => detallesOriginales.get(linea.id)?.cantidad !== linea.cantidad)
  );
  const hayCambios = cambioEnProductos || observaciones.trim() !== (pedido?.observaciones || "");

  const cambiarCantidad = (linea, diferencia) => {
    const siguiente = linea.cantidad + diferencia;
    if (siguiente < 1 || siguiente > linea.cantidadOriginal + linea.stockAdicional) return;
    setCantidades((actuales) => ({ ...actuales, [linea.id]: siguiente }));
    setError("");
    setExito("");
  };

  const quitarProducto = (productoId) => {
    setCantidades((actuales) => {
      const siguientes = { ...actuales };
      delete siguientes[productoId];
      return siguientes;
    });
    setError("");
    setExito("");
  };

  const agregarProducto = (productoId) => {
    setCantidades((actuales) => ({
      ...actuales,
      [productoId]: (actuales[productoId] || 0) + 1,
    }));
    setError("");
    setExito("");
  };

  const guardar = async () => {
    if (!puedeEditar || !hayCambios || lineas.length === 0) return;
    setGuardando(true);
    setError("");
    setExito("");
    try {
      const actualizado = await pedidosService.editarPedido(pedido.id, {
        detalles: lineas.map((linea) => ({
          producto_id: linea.id, cantidad: linea.cantidad,
        })),
        observaciones: observaciones.trim(),
      });
      setPedido(actualizado);
      setCantidades(cantidadesPorProducto(actualizado.detalles));
      setObservaciones(actualizado.observaciones || "");
      setExito("Cambios guardados. El pedido conserva su estado y la edición aparece en Historial.");
      try {
        setCatalogo(await pedidosService.listarProductos());
      } catch {
        // La edición ya quedó guardada; la próxima visita actualizará el catálogo.
      }
    } catch (fallo) {
      setError(mensajeError(fallo));
      if (fallo.response?.data?.estado) {
        try {
          setPedido(await pedidosService.obtenerPedido(pedido.id));
        } catch {
          // Se conserva el mensaje de error original.
        }
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <button type="button" onClick={() => navigate("/cajero/pedidos")} className="self-start text-xs font-semibold text-orange-600">
        ← Volver a pedidos
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Editar pedido {pedido?.codigo || ""}</h1>
        <p className="text-xs text-slate-500 mt-1">Modifica productos y observaciones antes de que comience la preparación.</p>
      </div>

      {cargando && <p className="text-sm text-slate-500">Cargando pedido...</p>}
      {error && <p role="alert" className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</p>}
      {exito && <p role="status" className="p-3 rounded-md bg-green-50 text-green-700 text-sm">{exito}</p>}

      {pedido && !puedeEditar && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 text-sm text-slate-700">
          Este pedido ya no se puede editar porque comenzó su preparación o fue cancelado.
        </div>
      )}

      {pedido && puedeEditar && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-5 text-sm text-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <p><span className="text-slate-500">Cliente:</span> {pedido.cliente_nombre || "—"}</p>
            <p><span className="text-slate-500">Teléfono:</span> {pedido.cliente_telefono || "—"}</p>
            <p><span className="text-slate-500">Modalidad:</span> {MODALIDADES[pedido.modalidad_entrega] || pedido.modalidad_entrega}</p>
            <p><span className="text-slate-500">Estado:</span> {pedido.estado === "EN_COLA" ? "En cola" : "Registrado"}</p>
            {pedido.direccion_delivery && <p><span className="text-slate-500">Dirección:</span> {pedido.direccion_delivery}</p>}
          </div>

          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-800 mb-3">Productos actuales</h2>
            {lineas.length === 0 && <p className="text-sm text-red-700">Agrega al menos un producto para guardar.</p>}
            <div className="flex flex-col divide-y divide-slate-100">
              {lineas.map((linea) => (
                <div key={linea.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  {linea.imagen && <img src={linea.imagen} alt="" className="w-10 h-10 object-cover rounded-md" />}
                  <div className="min-w-[180px] flex-1">
                    <p className="font-semibold text-slate-800">{linea.nombre}</p>
                    <p className="text-slate-500">{SOLES(linea.precio)} c/u · {linea.stockAdicional} disponibles para agregar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => cambiarCantidad(linea, -1)} disabled={linea.cantidad <= 1} aria-label={`Disminuir ${linea.nombre}`} className="w-8 h-8 border border-slate-200 rounded disabled:opacity-40">−</button>
                    <span className="w-8 text-center font-semibold">{linea.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(linea, 1)} disabled={linea.cantidad >= linea.cantidadOriginal + linea.stockAdicional} aria-label={`Aumentar ${linea.nombre}`} className="w-8 h-8 border border-slate-200 rounded disabled:opacity-40">+</button>
                  </div>
                  <span className="min-w-[80px] text-right font-semibold text-slate-800">{SOLES(linea.subtotal)}</span>
                  <button type="button" onClick={() => quitarProducto(linea.id)} className="text-red-700 text-xs font-semibold hover:underline">Quitar</button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-800">Productos y complementos disponibles</h2>
            <p className="text-xs text-slate-500 mt-1">Los complementos se agregan desde el catálogo de productos.</p>
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar producto o complemento..."
              className="mt-3 w-full sm:max-w-md h-10 px-3 border border-slate-200 rounded-md text-sm outline-none focus:border-orange-500"
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {disponibles.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-md p-3 text-sm">
                  {producto.imagen && <img src={producto.imagen} alt="" className="w-10 h-10 object-cover rounded-md" />}
                  <div>
                    <p className="font-semibold text-slate-800">{producto.nombre}</p>
                    <p className="text-slate-500">{SOLES(producto.precio_unitario)} · Stock: {producto.stock_disponible}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => agregarProducto(producto.id)}
                    disabled={producto.stock_disponible < 1}
                    className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </div>
              ))}
              {disponibles.length === 0 && <p className="text-sm text-slate-500">No hay más productos para mostrar.</p>}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <label htmlFor="observaciones-edicion" className="font-bold text-slate-800">Observaciones</label>
            <textarea
              id="observaciones-edicion"
              rows={3}
              maxLength={500}
              value={observaciones}
              onChange={(evento) => { setObservaciones(evento.target.value); setExito(""); }}
              placeholder="Ej. Sin salsas, extra papas..."
              className="mt-2 w-full p-3 border border-slate-200 rounded-md text-sm outline-none focus:border-orange-500 resize-y"
            />
          </section>

          <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <p className="text-slate-500">Total anterior: <span className="font-semibold text-slate-800">{SOLES(pedido.total)}</span></p>
              <p className="text-slate-800 font-bold mt-1">Nuevo total: {SOLES(nuevoTotal)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate("/cajero/pedidos")} className="px-4 h-10 bg-white border border-slate-200 text-slate-800 text-sm font-semibold rounded-md">Volver sin guardar</button>
              <button type="button" onClick={guardar} disabled={guardando || !hayCambios || lineas.length === 0} className="px-4 h-10 bg-orange-600 text-white text-sm font-semibold rounded-md disabled:opacity-40">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
