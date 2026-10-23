import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "../../api/pedidosService";

const TIPOS = [
  { valor: "CANCELACION", texto: "El cliente ya no desea el pedido" },
  { valor: "ERROR_PRODUCTOS", texto: "Producto o cantidad incorrectos" },
  { valor: "ERROR_MODALIDAD", texto: "Modalidad de entrega incorrecta" },
  { valor: "ERROR_CLIENTE", texto: "Datos del cliente incorrectos" },
];

function mensajeError(error) {
  const datos = error.response?.data;
  const primerError = datos && typeof datos === "object" ? Object.values(datos)[0] : null;
  return Array.isArray(primerError)
    ? primerError.join(" ")
    : primerError || "No se pudo registrar la incidencia.";
}

export default function RegistrarIncidencia() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pedidoId = params.get("pedido");
  const [pedido, setPedido] = useState(null);
  const [tipo, setTipo] = useState("CANCELACION");
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [registrada, setRegistrada] = useState(false);
  const [error, setError] = useState("");
  const puedeRegistrar = pedido && ["REGISTRADO", "EN_COLA"].includes(pedido.estado);

  useEffect(() => {
    if (!pedidoId) {
      setError("Selecciona un pedido antes de registrar la incidencia.");
      setCargando(false);
      return;
    }
    pedidosService.obtenerPedido(pedidoId)
      .then(setPedido)
      .catch(() => setError("No se pudo encontrar el pedido."))
      .finally(() => setCargando(false));
  }, [pedidoId]);

  const registrar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (!descripcion.trim()) {
      setError("Describe lo que ocurrió.");
      return;
    }
    setGuardando(true);
    try {
      await pedidosService.registrarIncidencia({
        pedido_id: pedido.id,
        tipo,
        descripcion: descripcion.trim(),
      });
      setRegistrada(true);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(pedido ? `/cajero/pedidos/detalle?id=${pedido.id}` : "/cajero/pedidos")}
        className="self-start text-xs font-semibold text-orange-600"
      >
        ← Volver al pedido
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Registrar incidencia</h1>
        <p className="text-sm text-slate-500 mt-1">
          Selecciona el motivo y explica qué ocurrió. Al registrar la incidencia se anulará el pedido y el administrador podrá consultarlo en Historial.
        </p>
      </div>

      {cargando && <p className="text-sm text-slate-500">Cargando pedido...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {registrada ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <p className="text-green-700 font-semibold">
            Pedido {pedido.codigo} cancelado y stock devuelto.
          </p>
          <p className="text-sm text-slate-600 mt-1">Ya aparece en el Historial del administrador.</p>
          <button
            type="button"
            onClick={() => navigate("/cajero/registrar-pedido")}
            className="mt-4 px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-semibold"
          >
            Registrar nuevo pedido
          </button>
        </div>
      ) : pedido && !puedeRegistrar ? (
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Este pedido ya no admite incidencias. Solo se pueden registrar mientras esté Registrado o En cola.
        </p>
      ) : puedeRegistrar && (
        <form onSubmit={registrar} className="bg-white border border-blue-100 rounded-lg p-5 flex flex-col gap-4">
          <div className="text-sm text-slate-700">
            <span className="font-semibold">Pedido:</span> {pedido.codigo}
            {pedido.cliente_nombre && <span> · {pedido.cliente_nombre}</span>}
          </div>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
            Motivo de la incidencia
            <select
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              className="h-10 px-3 rounded-md border border-blue-100 bg-white font-normal"
            >
              {TIPOS.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
            ¿Qué ocurrió?
            <textarea
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              maxLength={500}
              rows={5}
              required
              placeholder="Ej. El cliente informó que falta una bebida en su pedido."
              className="p-3 rounded-md border border-blue-100 font-normal resize-y"
            />
          </label>
          <p className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
            Al guardar, este pedido quedará Cancelado, saldrá de la cola y se devolverá su stock. Para corregirlo, registra un pedido nuevo.
          </p>
          <button
            type="submit"
            disabled={guardando}
            className="self-start px-5 py-2.5 rounded-md bg-orange-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {guardando ? "Registrando..." : "Registrar incidencia y anular"}
          </button>
          <p className="text-xs text-slate-500">
            La anulación y su motivo quedarán registrados en Historial.
          </p>
        </form>
      )}
    </div>
  );
}
