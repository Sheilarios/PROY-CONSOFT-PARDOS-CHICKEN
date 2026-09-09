import axiosClient from "./axiosClient";

/**
 * Capa de servicio: aísla los componentes de React de los detalles del
 * consumo de la API (bajo acoplamiento entre presentación y datos).
 */
export const pedidosService = {
  listarProductos: () => axiosClient.get("/pedidos/productos/").then((r) => r.data),

  // RF-03: consultar pedidos, con filtros opcionales por estado/modalidad.
  listarPedidos: (params = {}) =>
    axiosClient.get("/pedidos/", { params }).then((r) => r.data),

  obtenerPedido: (id) => axiosClient.get(`/pedidos/${id}/`).then((r) => r.data),

  // RF-01 / RF-02: registrar pedido validando stock y generando código.
  registrarPedido: (payload) => axiosClient.post("/pedidos/", payload).then((r) => r.data),

  enviarAProduccion: (id) =>
    axiosClient.post(`/pedidos/${id}/enviar-a-produccion/`).then((r) => r.data),
};
