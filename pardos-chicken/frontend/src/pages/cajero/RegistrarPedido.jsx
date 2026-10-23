import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";
import imagenCuartoPollo from "../../assets/productos/cuarto-pollo.png";
import imagenPolloEntero from "../../assets/productos/pollo-entero.png";
import imagenPapasFritas from "../../assets/productos/papas-fritas.png";
import imagenGaseosa from "../../assets/productos/gaseosa-1-5l.png";

const MODALIDADES = [
  { id: "salon", label: "Salón", icono: "🍽️" },
  { id: "recojo", label: "Recojo", icono: "🛍️" },
  { id: "delivery", label: "Delivery", icono: "🛵" },
];

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
const formatSoles = (n) => `S/ ${n.toFixed(2)}`;

const imagenDeProducto = (nombre) => {
  const nombreMinusculas = nombre.toLowerCase();
  if (nombreMinusculas.includes("1/4 pollo")) return imagenCuartoPollo;
  if (nombreMinusculas.includes("pollo entero")) return imagenPolloEntero;
  if (nombreMinusculas.includes("papas fritas")) return imagenPapasFritas;
  if (nombreMinusculas.includes("gaseosa 1.5")) return imagenGaseosa;
  return null;
};

const stockBadge = (stock) => {
  if (stock === 0)
    return { label: "Sin stock", clase: "bg-red-100 text-red-700" };
  if (stock <= 5)
    return { label: "Pocas unidades", clase: "bg-orange-100 text-orange-600" };
  return { label: "Disponible", clase: "bg-green-100 text-green-800" };
};

const mensajeDeError = (error) => {
  const datos = error.response?.data;
  const primero = datos && typeof datos === "object" ? Object.values(datos)[0] : null;
  return Array.isArray(primero) ? primero.join(" ") : primero || "No se pudo registrar el pedido.";
};

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function RegistrarPedido() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState(null);
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // Datos del cliente
  const [cliente, setCliente] = useState({
    nombre: "",
    telefono: "",
    modalidad: "salon",
    direccion: "",
  });
  const [observaciones, setObservaciones] = useState("");

  // Carrito: { [productoId]: cantidad }
  const [carrito, setCarrito] = useState({});

  // Búsqueda de productos
  const [busqueda, setBusqueda] = useState("");

  // Estado de envío
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    pedidosService.listarProductos()
      .then((lista) => setProductos(lista.map((p) => ({
        id: p.id,
        imagen: imagenDeProducto(p.nombre),
        nombre: p.nombre,
        precio: Number(p.precio_unitario),
        stock: p.stock_disponible,
      }))))
      .catch(() => setError("No se pudo cargar el catálogo de productos."));
  }, []);

  // ---------- Productos filtrados ----------
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [busqueda, productos]);

  // ---------- Carrito en formato array ----------
  const carritoItems = useMemo(() => {
    return Object.entries(carrito)
      .map(([id, cantidad]) => {
        const producto = productos.find((p) => p.id === Number(id));
        if (!producto) return null;
        return {
          ...producto,
          cantidad,
          subtotal: producto.precio * cantidad,
        };
      })
      .filter(Boolean);
  }, [carrito, productos]);

  const total = useMemo(
    () => carritoItems.reduce((acc, item) => acc + item.subtotal, 0),
    [carritoItems],
  );

  const totalArticulos = useMemo(
    () => carritoItems.reduce((acc, item) => acc + item.cantidad, 0),
    [carritoItems],
  );

  // ---------- Handlers ----------
  const handleChangeCliente = (e) => {
    setCliente({ ...cliente, [e.target.name]: e.target.value });
    if (e.target.name === "nombre" || e.target.name === "telefono") {
      setClienteId(null);
      setClientesEncontrados([]);
    }
    if (error) setError(null);
  };

  const buscarCliente = async () => {
    setError(null);
    setBuscandoCliente(true);
    setClientesEncontrados([]);
    try {
      const resultados = await pedidosService.buscarClientesPorNombre(cliente.nombre);
      setClientesEncontrados(resultados);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setBuscandoCliente(false);
    }
  };

  const seleccionarCliente = (encontrado) => {
    setCliente((actual) => ({
      ...actual,
      nombre: encontrado.nombre,
      telefono: encontrado.telefono || "",
    }));
    setClienteId(encontrado.id);
    setClientesEncontrados([]);
    setError(null);
  };

  const cambiarCantidad = (productoId, delta) => {
    setCarrito((prev) => {
      const actual = prev[productoId] || 0;
      const producto = productos.find((p) => p.id === productoId);
      if (!producto) return prev;
      const nueva = Math.max(0, Math.min(producto.stock, actual + delta));
      const copia = { ...prev };
      if (nueva === 0) {
        delete copia[productoId];
      } else {
        copia[productoId] = nueva;
      }
      return copia;
    });
  };

  const agregarAlCarrito = (productoId) => {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;
    if (producto.stock === 0) {
      setError(`"${producto.nombre}" no tiene stock disponible.`);
      return;
    }
    setCarrito((prev) => {
      const actual = prev[productoId] || 0;
      if (actual >= producto.stock) {
        setError(
          `Solo hay ${producto.stock} unidades de "${producto.nombre}".`,
        );
        return prev;
      }
      return { ...prev, [productoId]: actual + 1 };
    });
  };

  const quitarDelCarrito = (productoId) => {
    setCarrito((prev) => {
      const copia = { ...prev };
      delete copia[productoId];
      return copia;
    });
  };

  const limpiar = () => {
    setCliente({
      nombre: "",
      telefono: "",
      modalidad: "salon",
      direccion: "",
    });
    setCarrito({});
    setObservaciones("");
    setClienteId(null);
    setClientesEncontrados([]);
    setBusqueda("");
    setError(null);
  };

  const validar = () => {
    if (!cliente.nombre.trim()) return "Ingresa el nombre del cliente.";
    if (carritoItems.length === 0)
      return "Agrega al menos un producto al pedido.";
    if (cliente.modalidad === "delivery" && !cliente.direccion.trim())
      return "Para delivery, ingresa la dirección de entrega.";
    return null;
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setError(null);

    const validacion = validar();
    if (validacion) {
      setError(validacion);
      return;
    }

    setEnviando(true);

    try {
      const payload = {
        cliente_nombre: cliente.nombre.trim(),
        cliente_telefono: cliente.telefono.trim(),
        modalidad_entrega: cliente.modalidad.toUpperCase(),
        direccion_delivery: cliente.modalidad === "delivery" ? cliente.direccion.trim() : "",
        observaciones: observaciones.trim(),
        ...(clienteId ? { cliente_id: clienteId } : {}),
        detalles: carritoItems.map((item) => ({
          producto_id: item.id,
          cantidad: item.cantidad,
        })),
      };
      const respuesta = await pedidosService.registrarPedido(payload);
      const pedidoCreado = {
        id: respuesta.codigo,
        pedidoId: respuesta.id,
        hora: new Date(respuesta.fecha_creacion).toLocaleTimeString("es-PE", {
          hour: "2-digit", minute: "2-digit",
        }),
        modalidad: MODALIDADES.find((m) => m.id === cliente.modalidad)?.label,
        total: Number(respuesta.total),
        cantidadArticulos: totalArticulos,
        checks: ["Datos guardados", "Stock validado"],
      };

      navigate("/cajero/pedido-confirmado", {
        state: { pedido: pedidoCreado },
      });
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  // ---------- Render ----------
  return (
    <form onSubmit={handleRegistrar} className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <span className="text-orange-600 text-xs font-bold font-['Inter'] uppercase">
          Registro de pedidos
        </span>
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Nuevo pedido
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Completa los datos, valida el stock y registra la venta.
        </p>
      </div>

      {/* ---------- Error ---------- */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}

      {/* ---------- Grid principal ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ============ Columna 1: Datos del cliente ============ */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
            <span className="text-orange-600 text-xl font-bold">●</span>
            <h2 className="text-slate-800 text-lg font-bold font-['Inter']">
              Datos del cliente
            </h2>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Nombre + Teléfono */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                <label
                  htmlFor="nombre"
                  className="text-xs font-semibold text-slate-800 font-['Inter']"
                >
                  Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  placeholder="Nombre del cliente"
                  value={cliente.nombre}
                  onChange={handleChangeCliente}
                  disabled={enviando}
                  className="h-10 px-3 rounded-md border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                <label
                  htmlFor="telefono"
                  className="text-xs font-semibold text-slate-800 font-['Inter']"
                >
                  Teléfono
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="9XXXXXXXX"
                  maxLength={9}
                  inputMode="numeric"
                  value={cliente.telefono}
                  onChange={handleChangeCliente}
                  disabled={enviando}
                  className="h-10 px-3 rounded-md border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={buscarCliente}
              disabled={buscandoCliente || enviando}
              className="h-9 px-3 rounded-md bg-orange-50 border border-orange-600 text-orange-600 text-xs font-semibold"
            >
              {buscandoCliente ? "Buscando..." : "Buscar por nombre"}
            </button>
            <p className="text-xs text-slate-500">
              Si es nuevo, escribe nombre y teléfono. Se guardará junto con el pedido.
            </p>
            {clientesEncontrados.length > 0 && (
              <div className="flex flex-col gap-2">
                {clientesEncontrados.map((encontrado, indice) => (
                  <button
                    key={`${encontrado.id || "historial"}-${indice}`}
                    type="button"
                    onClick={() => seleccionarCliente(encontrado)}
                    className="text-left px-3 py-2 rounded-md border border-slate-200 text-xs text-slate-800 hover:bg-orange-50"
                  >
                    {encontrado.nombre} · {encontrado.telefono || "Sin teléfono"} · {encontrado.origen === "historial" ? "Pedido anterior" : "Registrado"}
                  </button>
                ))}
              </div>
            )}

            {/* Modalidad */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                Modalidad de entrega
              </span>
              <div className="grid grid-cols-3 gap-2">
                {MODALIDADES.map((m) => {
                  const active = cliente.modalidad === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setCliente({ ...cliente, modalidad: m.id })
                      }
                      className={`h-20 rounded-md flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                        active
                          ? "bg-orange-50 border border-orange-600 text-slate-800"
                          : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-lg">{m.icono}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dirección (solo delivery) */}
            {cliente.modalidad === "delivery" && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="direccion"
                  className="text-xs font-semibold text-slate-800 font-['Inter']"
                >
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  id="direccion"
                  name="direccion"
                  type="text"
                  placeholder="Dirección del cliente"
                  value={cliente.direccion}
                  onChange={handleChangeCliente}
                  disabled={enviando}
                  className="h-10 px-3 rounded-md border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="observaciones"
                className="text-xs font-semibold text-slate-800 font-['Inter']"
              >
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                rows={3}
                maxLength={500}
                placeholder="Ej. Sin salsas, extra papas, etc."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={enviando}
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50 resize-y"
              />
            </div>

          </div>
        </div>

        {/* ============ Columna 2: Productos ============ */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
            <span className="text-orange-600 text-xl font-bold">●</span>
            <h2 className="text-slate-800 text-lg font-bold font-['Inter']">
              Productos
            </h2>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* Buscador */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-lg">
                ⌕
              </span>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500"
              />
            </div>

            {/* Lista de productos */}
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {productosFiltrados.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  No se encontraron productos.
                </p>
              ) : (
                productosFiltrados.map((p) => {
                  const badge = stockBadge(p.stock);
                  const sinStock = p.stock === 0;
                  return (
                    <div
                      key={p.id}
                      className="border border-slate-200 rounded-md p-2.5 flex items-center gap-2"
                    >
                      {/* Imagen + nombre */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-slate-50 rounded-md flex items-center justify-center overflow-hidden shrink-0">
                          {p.imagen ? (
                            <img src={p.imagen} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-slate-500">{p.nombre.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-xs font-semibold text-slate-800 font-['Inter'] truncate">
                            {p.nombre}
                          </span>
                          <span
                            className={`inline-block self-start px-2 py-0.5 rounded text-[10px] font-medium ${badge.clase}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* Precio */}
                      <span className="text-xs text-slate-800 font-['Inter'] shrink-0">
                        {formatSoles(p.precio)}
                      </span>

                      {/* Agregar */}
                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(p.id)}
                        disabled={sinStock}
                        aria-label={`Agregar ${p.nombre}`}
                        className="w-9 h-9 bg-orange-600 text-white text-lg font-bold rounded-md flex items-center justify-center hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        +
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ============ Columna 3: Resumen ============ */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
            <span className="text-orange-600 text-xl font-bold">●</span>
            <h2 className="text-slate-800 text-lg font-bold font-['Inter']">
              Resumen del pedido
            </h2>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* Tabla de items */}
            {carritoItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <span className="text-3xl">🛒</span>
                <p className="text-xs text-slate-500 text-center font-['Inter']">
                  Aún no has agregado productos.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
                {carritoItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-md p-2 flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 font-['Inter'] truncate">
                        {item.nombre}
                      </p>
                      <p className="text-[10px] text-slate-500 font-['Inter']">
                        {formatSoles(item.precio)} c/u
                      </p>
                    </div>

                    {/* Controles cantidad */}
                    <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-800 hover:bg-slate-100 rounded"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-semibold text-slate-800">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.id, +1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-800 hover:bg-slate-100 rounded"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal */}
                    <span className="w-16 text-right text-xs font-semibold text-slate-800 font-['Inter'] shrink-0">
                      {formatSoles(item.subtotal)}
                    </span>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => quitarDelCarrito(item.id)}
                      aria-label={`Eliminar ${item.nombre}`}
                      className="w-6 h-6 text-orange-600 text-lg leading-none hover:text-orange-700 shrink-0"
                    >
                      ♲
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="bg-slate-50 rounded-md p-3 flex items-center justify-between mt-1">
              <span className="text-lg font-bold text-slate-800 font-['Inter']">
                Total
              </span>
              <span className="text-2xl font-bold text-slate-800 font-['Inter']">
                {formatSoles(total)}
              </span>
            </div>

            {/* Aviso */}
            <div className="bg-slate-50 border border-orange-200 rounded-md p-2.5 flex items-start gap-2">
              <span className="text-orange-600 text-base leading-none mt-0.5">
                ●
              </span>
              <p className="text-orange-600 text-[10px] font-['Inter'] leading-snug">
                Al validar stock se generará automáticamente un código de
                pedido.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={limpiar}
                disabled={enviando}
                className="flex-1 h-10 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={enviando || carritoItems.length === 0}
                className="flex-[2] h-10 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando
                  ? "Registrando..."
                  : `Registrar pedido · ${formatSoles(total)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
