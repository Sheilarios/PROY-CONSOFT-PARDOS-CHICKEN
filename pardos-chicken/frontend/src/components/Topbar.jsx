import React from "react";

export default function Topbar() {
  // ⚠️ En un entorno real, esto vendría de un AuthContext o de localStorage.
  const user = {
    nombre: localStorage.getItem("user_nombre") || "Juan Pérez",
    rol: localStorage.getItem("rol") || "Cajero",
    iniciales:
      localStorage.getItem("user_iniciales") ||
      (localStorage.getItem("user_nombre") || "Juan Pérez")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
  };

  return (
    <header className="w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* ---------- Logo + Título ---------- */}
      <div className="flex items-center gap-3">
        <img
          className="w-10 h-10 object-contain"
          src="/logo-pardos.png"
          alt="Pardos Chicken"
          onError={(e) => {
            // Fallback si no existe el logo
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="flex flex-col">
          <span className="text-slate-800 text-sm font-bold font-['Inter']">
            PARDOS CHICKEN
          </span>
          <span className="text-orange-600 text-[10px] font-semibold font-['Inter']">
            Buen pollo, mejores momentos
          </span>
        </div>
      </div>

      {/* ---------- Perfil del usuario ---------- */}
      <div className="flex items-center gap-4">
        {/* Notificaciones */}
        <button
          type="button"
          className="text-gray-500 hover:text-orange-600 transition-colors"
          aria-label="Notificaciones"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* Datos del usuario */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user.iniciales}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">
              {user.nombre}
            </span>
            <span className="text-xs text-slate-500 capitalize">
              {user.rol}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
