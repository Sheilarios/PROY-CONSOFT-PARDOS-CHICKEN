import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const solicitudOriginal = error.config;
    const ruta = error.config?.url;
    const estado = error.response?.status;

    if (
      estado !== 401 ||
      ruta?.includes("/token/") ||
      !solicitudOriginal ||
      solicitudOriginal._retry
    ) {
      return Promise.reject(error);
    }
    solicitudOriginal._retry = true;
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) {
      localStorage.removeItem("access_token");
      window.location.assign("/login");
      return Promise.reject(error);
    }
    try {
      const respuesta = await axiosClient.post("/token/refresh/", { refresh });
      const nuevoAccess = respuesta.data.access;
      localStorage.setItem("access_token", nuevoAccess);
      return axiosClient(solicitudOriginal);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.assign("/login");
      return Promise.reject(error);
    }
  },
);

export default axiosClient;
