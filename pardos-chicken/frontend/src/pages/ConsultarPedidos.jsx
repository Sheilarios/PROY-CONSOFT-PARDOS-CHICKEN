import { useEffect, useState, useCallback } from "react";
import { pedidosService } from "../api/pedidosService";

const ETIQUETAS_ESTADO = {
  REGISTRADO: "Registrado",
  EN_COLA: "En cola",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  DESPACHADO: "Despachado",
};

const ETIQUETAS_MODALIDAD = {
  SALON: "Salón",
  RECOJO: "Recojo en mostrador",
  DELIVERY: "Delivery",
};

export default function ConsultarPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroModalidad, setFiltroModalidad] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarPedidos = useCallback(() => {
    setCargando(true);
    const params = {};
    if (filtroFecha){
      params.fecha=filtroFecha;
    }

    if (filtroEstado){
      params.estado=filtroEstado;
    }

    if (filtroModalidad){
      params.modalidad_entrega = filtroModalidad;
    }

    pedidosService
      .listarPedidos(params)
      .then((data) => setPedidos(data.results || data))
      .finally(() => setCargando(false));
  }, [filtroFecha, filtroEstado, filtroModalidad]);

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

      <div className="filtros-pedidos">
        <label>
          Fecha:
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </label>

        <label>
          Estado:
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo de entrega:
          <select
            value={filtroModalidad}
            onChange={(e) => setFiltroModalidad(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(ETIQUETAS_MODALIDAD).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando && <p>Cargando pedidos...</p>}

      <table className="tabla-pedidos">
        <thead>
          <tr>
            <th>Código</th>
            <th>Fecha</th>
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
              <td>{new Date(pedido.fecha_creacion).toLocaleString("es-PE")}</td>
              <td>{pedido.cliente_nombre || "—"}</td>
              <td>{ETIQUETAS_MODALIDAD[pedido.modalidad_entrega] || pedido.modalidad_entrega}</td>
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
              <td colSpan="7">No hay pedidos para este filtro.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
