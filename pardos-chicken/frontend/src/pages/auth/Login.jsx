import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../api/authService";

const ROLES = {
  CAJERO: "cajero",
  COCINERO: "cocinero",
  DESPACHADOR: "despacho",
  ADMINISTRADOR: "administrador",
};

// ----------------------------------------------------------------------
// Mapeo de rol → ruta de inicio
// ----------------------------------------------------------------------
const HOME_BY_ROL = {
  cajero: "/cajero/registrar-pedido",
  cocinero: "/cocinero/cola",
  despacho: "/despacho/panel",
  administrador: "/admin/pedidos",
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validaciones básicas
    if (!form.email.trim() || !form.password.trim()) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const tokens = await authService.iniciarSesion(form.email.trim(), form.password);
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
      const usuario = await authService.usuarioActual();
      const rol = ROLES[usuario.rol] || "cajero";
      localStorage.setItem("rol", rol);
      localStorage.setItem("user_nombre", usuario.nombre);

      // Redirigir a la ruta de origen (si venía de una protegida) o al home del rol
      const from = location.state?.from?.pathname;
      navigate(from || HOME_BY_ROL[rol] || "/cajero/registrar-pedido", { replace: true });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setError("No se pudo iniciar sesión. Verifica tus credenciales y la conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* ================= Columna izquierda (branding) ================= */}
      <div className="w-full lg:w-[650px] min-h-[300px] lg:min-h-screen px-8 lg:px-16 py-10 lg:py-14 bg-orange-50 flex flex-col justify-between gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            className="w-9 h-9 object-contain"
            src="/logo-pardos.png"
            alt="Pardos Chicken"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="flex flex-col">
            <span className="text-slate-800 text-xs font-bold font-['Inter']">
              PARDOS CHICKEN
            </span>
            <span className="text-orange-600 text-[9px] font-semibold font-['Inter']">
              Buen pollo, mejores momentos
            </span>
          </div>
        </div>

        {/* Título grande */}
        <div className="flex flex-col gap-5">
          <h1 className="text-3xl lg:text-5xl font-bold text-slate-800 font-['Inter'] leading-tight">
            Cada pedido,
            <br />
            una gran experiencia.
          </h1>
        </div>

        {/* Pie */}
        <div className="flex flex-col gap-1">
          <span className="text-orange-600 text-xs font-semibold font-['Inter']">
            Buen pollo, mejores momentos
          </span>
          <span className="text-slate-500 text-xs font-normal font-['Inter']">
            Sistema de control de producción y despacho
          </span>
        </div>
      </div>

      {/* ================= Columna derecha (formulario) ================= */}
      <div className="flex-1 min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[500px] bg-white rounded-2xl border border-blue-100 px-8 lg:px-11 py-10 flex flex-col gap-5 shadow-sm"
        >
          {/* Badge */}
          <div className="w-fit px-4 py-1.5 bg-orange-50 rounded-2xl">
            <span className="text-orange-600 text-xs font-bold font-['Inter']">
              ACCESO AL SISTEMA
            </span>
          </div>

          {/* Título */}
          <div className="flex flex-col gap-2">
            <h2 className="text-slate-800 text-3xl font-bold font-['Inter']">
              Iniciar sesión
            </h2>
            <p className="text-slate-500 text-sm font-['Inter']">
              Ingresa tus credenciales para comenzar tu jornada.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-slate-800 font-['Inter']"
            >
              Usuario
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              placeholder="Tu usuario"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              className="h-11 px-3 rounded-md border border-slate-200 text-sm text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-slate-800 font-['Inter']"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                className="w-full h-11 px-3 pr-12 rounded-md border border-slate-200 text-sm text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="h-11 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

        </form>
      </div>
    </div>
  );
}
