import { useEffect, useState } from "react";
import { pedidosService } from "../api/pedidosService";
import SelectorProductos from "../components/SelectorProductos.jsx";

const MODALIDADES = [
  { value: "SALON", label: "Salón" },
  { value: "RECOJO", label: "Recojo en mostrador" },
  { value: "DELIVERY", label: "Delivery" },
];

const ESTADO_INICIAL_FORMULARIO = {
  cliente_nombre: "",
  cliente_telefono: "",
  direccion_delivery: "",
  modalidad_entrega: "SALON",
};

export default function RegistrarPedido() {
  const [productos, setProductos] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [formulario, setFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const [mensaje, setMensaje] = useState(null);
  const [errores, setErrores] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    pedidosService
      .listarProductos()
      .then((data) => setProductos(data.results || data))
      .catch(() => setErrores("No se pudo cargar el catálogo de productos."));
  }, []);

  const handleCambiarCantidad = (productoId, cantidad) => {
    setCantidades((prev) => ({ ...prev, [productoId]: cantidad }));
  };

  const handleCambiarCampo = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const construirDetalles = () =>
    Object.entries(cantidades)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([productoId, cantidad]) => ({
        producto_id: Number(productoId),
        cantidad,
      }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setErrores(null);

    const detalles = construirDetalles();
    if (detalles.length === 0) {
      setErrores("Selecciona al menos un producto con cantidad mayor a 0.");
      return;
    }

    setEnviando(true);
    try {
      const pedido = await pedidosService.registrarPedido({
        ...formulario,
        detalles,
      });
      setMensaje(`Pedido ${pedido.codigo} registrado correctamente. Total: S/ ${pedido.total}`);
      setFormulario(ESTADO_INICIAL_FORMULARIO);
      setCantidades({});
    } catch (error) {
      const detalle = error.response?.data;
      setErrores(detalle ? JSON.stringify(detalle) : "Ocurrió un error al registrar el pedido.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section>
      <h2>Registrar pedido</h2>

      <form onSubmit={handleSubmit} className="formulario-pedido">
        <div className="fila">
          <label>
            Cliente
            <input
              name="cliente_nombre"
              value={formulario.cliente_nombre}
              onChange={handleCambiarCampo}
              placeholder="Nombre del cliente (opcional)"
            />
          </label>

          <label>
            Teléfono
            <input
              name="cliente_telefono"
              value={formulario.cliente_telefono}
              onChange={handleCambiarCampo}
              placeholder="9XXXXXXXX"
            />
          </label>
        </div>

        <div className="fila">
          <label>
            Modalidad de entrega
            <select
              name="modalidad_entrega"
              value={formulario.modalidad_entrega}
              onChange={handleCambiarCampo}
            >
              {MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {formulario.modalidad_entrega === "DELIVERY" && (
            <label>
              Dirección de entrega
              <input
                name="direccion_delivery"
                value={formulario.direccion_delivery}
                onChange={handleCambiarCampo}
                placeholder="Dirección exacta"
              />
            </label>
          )}
        </div>

        <SelectorProductos
          productos={productos}
          cantidades={cantidades}
          onCambiarCantidad={handleCambiarCantidad}
        />

        {errores && <p className="mensaje mensaje-error">{errores}</p>}
        {mensaje && <p className="mensaje mensaje-ok">{mensaje}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? "Registrando..." : "Registrar pedido"}
        </button>
      </form>
    </section>
  );
}
