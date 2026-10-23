import axiosClient from "./axiosClient";

export const authService = {
  iniciarSesion: (username, password) =>
    axiosClient.post("/token/", { username, password }).then((r) => r.data),
  usuarioActual: () =>
    axiosClient.get("/usuarios/me/").then((r) => r.data),
};
