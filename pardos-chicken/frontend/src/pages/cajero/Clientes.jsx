import React, { useMemo, useState } from "react";

// ----------------------------------------------------------------------
// Datos de ejemplo (luego vendrán del backend)
// ----------------------------------------------------------------------
const CLIENTES_INICIALES = [
  {
    id: 1,
    nombre: "María Fernanda López",
    telefono: "987 654 321",
    email: "maria.lopez@email.com",
    pedidos: 12,
    ultimoPedido: "10/04/2024",
    direccion: "Av. Primavera 123, Surco",
  },
  {
    id: 2,
    nombre: "Juan Pérez",
    telefono: "987 111 222",
    email: "juan.perez@email.com",
    pedidos: 8,
    ultimoPedido: "10/04/2024",
    direccion: "Av. Javier Prado 1234, San Isidro",
  },
  {
    id: 3,
    nombre: "Andrea Salazar",
    telefono: "987 333 444",
    email: "andrea.s@email.com",
    pedidos: 5,
    ultimoPedido: "09/04/2024",
    direccion: "Calle Los Álamos 456, Miraflores",
  },
  {
    id: 4,
    nombre: "Carlos Rojas",
    telefono: "987 555 666",
    email: "carlos.rojas@email.com",
    pedidos: 3,
    ultimoPedido: "08/04/2024",
    direccion: "Av. Brasil 789, Jesús María",
  },
  {
    id: 5,
    nombre: "Luis Mendoza",
    telefono: "987 777 888",
    email: "luis.m@email.com",
    pedidos: 1,
    ultimoPedido: "05/04/2024",
    direccion: "Av. Arequipa 2000, Lince",
  },
];

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
const getIniciales = (nombre) =>
  nombre
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function Clientes() {
  const [busqueda, setBusqueda] = useState("");

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return CLIENTES_INICIALES;
    return CLIENTES_INICIALES.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [busqueda]);

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <span className="text-orange-600 text-xs font-bold font-['Inter'] uppercase">
          Directorio
        </span>
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Clientes
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Clientes identificados en pedidos registrados
        </p>
      </div>

      {/* ---------- Buscador ---------- */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-lg">
            ⌕
          </span>
          <input
            type="text"
            placeholder="Buscar cliente, teléfono o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
          />
        </div>

        <span className="flex items-center text-xs text-slate-500 font-['Inter']">
          {clientesFiltrados.length} cliente
          {clientesFiltrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ---------- Tabla / Vacío ---------- */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 flex flex-col items-center gap-2">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-slate-500 font-['Inter'] text-center">
            {busqueda
              ? `No se encontraron clientes que coincidan con "${busqueda}".`
              : "Los clientes aparecerán aquí cuando registres pedidos con su nombre."}
          </p>
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Cliente",
                    "Teléfono",
                    "Email",
                    "Pedidos",
                    "Último pedido",
                    "Dirección",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-800 font-['Inter']"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    {/* Cliente con avatar */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold font-['Inter'] shrink-0">
                          {getIniciales(c.nombre)}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                          {c.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {c.telefono}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 font-['Inter']">
                      {c.email}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block px-3 py-1 rounded text-xs font-semibold bg-indigo-50 text-blue-800 font-['Inter']">
                        {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 font-['Inter']">
                      {c.ultimoPedido}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 font-['Inter']">
                      {c.direccion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
