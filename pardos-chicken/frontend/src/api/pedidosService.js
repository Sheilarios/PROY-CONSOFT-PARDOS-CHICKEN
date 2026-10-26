// API de pedidos, producción e incidencias.
import axiosClient from "./axiosClient";

export const pedidosService = {
  listarProductos: () =>
    axiosClient.get("/pedidos/productos/").then((r) => r.data.results || r.data),

  crearProducto: (payload) =>
    axiosClient.post("/pedidos/productos/", payload).then((r) => r.data),

  buscarClientesPorNombre: (nombre) =>
    axiosClient.get("/pedidos/clientes/buscar-por-nombre/", { params: { nombre } }).then((r) => r.data),

  listarClientes: () =>
    axiosClient.get("/pedidos/clientes/").then((r) => r.data.results || r.data),

  listar: (params = {}) =>
    axiosClient.get("/pedidos/", { params }).then((r) => r.data),

  listarColaProduccion: () =>
    axiosClient.get("/pedidos/cola-produccion/").then((r) => r.data),

  listarSeguimientoProduccion: () =>
    axiosClient.get("/pedidos/seguimiento-produccion/").then((r) => r.data),

  obtenerPedido: (id) => axiosClient.get(`/pedidos/${id}/`).then((r) => r.data),

  registrarPedido: (payload) =>
    axiosClient.post("/pedidos/", payload).then((r) => r.data),

  editarPedido: (id, payload) =>
    axiosClient.post(`/pedidos/${id}/editar/`, payload).then((r) => r.data),

  registrarIncidencia: (payload) =>
    axiosClient.post("/pedidos/incidencias/", payload).then((r) => r.data),

  listarIncidencias: () =>
    axiosClient.get("/pedidos/incidencias/").then((r) => r.data.results || r.data),

  listarEdiciones: () =>
    axiosClient.get("/pedidos/ediciones/").then((r) => r.data.results || r.data),

  actualizarProducto: (id, payload) =>
    axiosClient.put(`/pedidos/productos/${id}/`, payload).then((r) => r.data),

  enviarAProduccion: (id) =>
    axiosClient.post(`/pedidos/${id}/enviar-a-produccion/`).then((r) => r.data),

  iniciarPreparacion: (id) =>
    axiosClient.post(`/pedidos/${id}/iniciar-preparacion/`).then((r) => r.data),

  marcarListo: (id) =>
    axiosClient.post(`/pedidos/${id}/marcar-listo/`).then((r) => r.data),

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
