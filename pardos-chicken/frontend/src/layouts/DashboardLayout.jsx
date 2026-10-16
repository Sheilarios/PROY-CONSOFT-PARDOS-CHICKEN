import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout() {
  return (
    <div className="flex w-full min-h-screen bg-slate-50 overflow-hidden">
      {/* Menú lateral fijo */}
      <Sidebar />

      {/* Contenedor derecho */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior */}
        <Topbar />

        {/* Contenido dinámico */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
