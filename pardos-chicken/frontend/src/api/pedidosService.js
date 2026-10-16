// src/api/pedidosService.js
import axiosClient from "./axiosClient";

export const pedidosService = {
  listar: (params = {}) =>
    axiosClient.get("/pedidos/", { params }).then((r) => r.data),

  obtenerPedido: (id) => axiosClient.get(`/pedidos/${id}/`).then((r) => r.data),

  registrarPedido: (payload) =>
    axiosClient.post("/pedidos/", payload).then((r) => r.data),

  actualizarProducto: (id, payload) =>
    axiosClient.put(`/pedidos/productos/${id}/`, payload).then((r) => r.data),

  enviarAProduccion: (id) =>
    axiosClient.post(`/pedidos/${id}/enviar-a-produccion/`).then((r) => r.data),

  marcarComoPreparado: (id) =>
    axiosClient.post(`/pedidos/${id}/marcar-preparado/`).then((r) => r.data),

  asignarRepartidor: (idPedido, idRepartidor) =>
    axiosClient
      .post(`/pedidos/${idPedido}/asignar-repartidor/`, {
        repartidor: idRepartidor,
      })
      .then((r) => r.data),

  confirmarDespacho: (id) =>
    axiosClient.post(`/pedidos/${id}/confirmar-despacho/`).then((r) => r.data),

  obtenerEstadisticas: (params = {}) =>
    axiosClient.get("/pedidos/estadisticas/", { params }).then((r) => r.data),
};
