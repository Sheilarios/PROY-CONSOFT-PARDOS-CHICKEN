import { useEffect, useState, useCallback } from "react";
import { pedidosService } from "../api/pedidosService";

const ETIQUETAS_ESTADO = {
  REGISTRADO: "Registrado",
  EN_COLA: "En cola",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  DESPACHADO: "Despachado",
};

export default function ConsultarPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarPedidos = useCallback(() => {
    setCargando(true);
    const params = filtroEstado ? { estado: filtroEstado } : {};
    pedidosService
      .listarPedidos(params)
      .then((data) => setPedidos(data.results || data))
      .finally(() => setCargando(false));
  }, [filtroEstado]);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  const enviarAProduccion = async (id) => {
    await pedidosService.enviarAProduccion(id);
    cargarPedidos();
  };

  return (
    <section>
      <h2>Consultar pedidos</h2>

      <label>
        Filtrar por estado:
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>

      {cargando && <p>Cargando pedidos...</p>}

      <table className="tabla-pedidos">
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Modalidad</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>{pedido.codigo}</td>
              <td>{pedido.cliente_nombre || "—"}</td>
              <td>{pedido.modalidad_entrega}</td>
              <td>
                <span className={`badge badge-${pedido.estado.toLowerCase()}`}>
                  {ETIQUETAS_ESTADO[pedido.estado]}
                </span>
              </td>
              <td>S/ {pedido.total}</td>
              <td>
                {pedido.estado === "REGISTRADO" && (
                  <button onClick={() => enviarAProduccion(pedido.id)}>Enviar a cocina</button>
                )}
              </td>
            </tr>
          ))}
          {pedidos.length === 0 && !cargando && (
            <tr>
              <td colSpan="6">No hay pedidos para este filtro.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
