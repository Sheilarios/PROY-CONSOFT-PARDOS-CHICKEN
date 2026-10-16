import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// ----------------------------------------------------------------------
// Configuración de menús por rol
// ----------------------------------------------------------------------
const menuConfig = {
  cajero: [
    { name: "Registrar pedido", path: "/cajero/registrar-pedido" },
    { name: "Pedidos", path: "/cajero/pedidos" },
    { name: "Clientes", path: "/cajero/clientes" },
    { name: "Productos", path: "/cajero/productos" },
  ],
  cocinero: [
    { name: "Cola de cocina", path: "/cocinero/cola" },
    { name: "Pedidos", path: "/cocinero/pedidos" },
    { name: "Productos", path: "/cocinero/productos" },
  ],
  despacho: [
    { name: "Panel de despacho", path: "/despacho/panel" },
    { name: "Pedidos", path: "/despacho/pedidos" },
    { name: "Repartidores", path: "/despacho/repartidores" },
  ],
  administrador: [
    { name: "Resumen", path: "/admin/resumen" },
    { name: "Pedidos", path: "/admin/pedidos" },
    { name: "Producción", path: "/admin/produccion" },
    { name: "Despacho", path: "/admin/despacho" },
    { name: "Productos", path: "/admin/productos" },
    { name: "Historial", path: "/admin/historial" },
    { name: "Reportes", path: "/admin/reportes" },
    { name: "Configuración", path: "/admin/configuracion" },
  ],
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // ⚠️ En un entorno real, esto debería venir de un AuthContext o de localStorage.
  // Por ahora lo dejamos hardcodeado para que se vea el menú.
  const rolUsuario = localStorage.getItem("rol") || "administrador";

  const links = menuConfig[rolUsuario] || [];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("rol");
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Navegación */}
      <nav className="flex-1 pt-6 px-4">
        <ul className="flex flex-col gap-2">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);

            return (
              <li key={link.name}>
                <Link
                  to={link.path}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-orange-100 text-orange-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{link.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Cerrar sesión */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
