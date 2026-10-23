import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout() {
  return (
    <div className="flex w-full min-h-screen flex-col bg-slate-50">
      {/* Barra superior compartida por todas las páginas */}
      <Topbar />

      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
