import React, { useMemo, useState } from "react";
import EditarProducto from "./EditarProducto";

// ----------------------------------------------------------------------
// Catálogo de ejemplo (luego vendrá del backend)
// ----------------------------------------------------------------------
const PRODUCTOS_INICIALES = [
  {
    id: 1,
    icono: "🍗",
    nombre: "1/2 Pollo a la brasa",
    precio: 32.0,
    stock: 18,
    categoria: "Pollos",
  },
  {
    id: 2,
    icono: "🍟",
    nombre: "Papas familiares",
    precio: 12.0,
    stock: 24,
    categoria: "Acompañamientos",
  },
  {
    id: 3,
    icono: "🥗",
    nombre: "Ensalada",
    precio: 8.0,
    stock: 4,
    categoria: "Acompañamientos",
  },
  {
    id: 4,
    icono: "🥤",
    nombre: "Gaseosa 1.5 L",
    precio: 10.0,
    stock: 16,
    categoria: "Bebidas",
  },
  {
    id: 5,
    icono: "🍗",
    nombre: "Pollo entero",
    precio: 42.0,
    stock: 8,
    categoria: "Pollos",
  },
  {
    id: 6,
    icono: "🧂",
    nombre: "Salsas extra",
    precio: 3.0,
    stock: 30,
    categoria: "Extras",
  },
];

const UMBRAL_STOCK_BAJO = 5;

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
const estadoDeStock = (stock) => {
  if (stock === 0)
    return {
      label: "Sin stock",
      clase: "bg-red-100 text-red-700",
      valor: "Sin stock",
    };
  if (stock <= UMBRAL_STOCK_BAJO)
    return {
      label: "Pocas unidades",
      clase: "bg-orange-100 text-orange-600",
      valor: "Bajo",
    };
  return {
    label: "Disponible",
    clase: "bg-green-100 text-green-800",
    valor: "Disponible",
  };
};

const formatSoles = (n) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function Productos() {
  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [editando, setEditando] = useState(null);

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = productos.length;
    const disponibles = productos.filter(
      (p) => p.stock > UMBRAL_STOCK_BAJO,
    ).length;
    const bajo = productos.filter(
      (p) => p.stock > 0 && p.stock <= UMBRAL_STOCK_BAJO,
    ).length;
    const agotados = productos.filter((p) => p.stock === 0).length;
    return { total, disponibles, bajo, agotados };
  }, [productos]);

  // ---------- Filtrado ----------
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const okBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q);
      const okEstado =
        filtroEstado === "Todos"
          ? true
          : estadoDeStock(p.stock).valor === filtroEstado;
      return okBusqueda && okEstado;
    });
  }, [productos, busqueda, filtroEstado]);

  // ---------- Handlers ----------
  const handleGuardar = (productoActualizado) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.id === productoActualizado.id ? productoActualizado : p,
      ),
    );
    setEditando(null);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <span className="text-orange-600 text-xs font-bold font-['Inter'] uppercase">
          Inventario
        </span>
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Productos
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Consulta precios y actualiza las existencias.
        </p>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total productos"
          valor={stats.total}
          sub="En catálogo"
        />
        <StatCard
          label="Disponibles"
          valor={stats.disponibles}
          sub="Con stock suficiente"
          subClase="text-green-600"
        />
        <StatCard
          label="Stock bajo"
          valor={stats.bajo}
          sub={`≤ ${UMBRAL_STOCK_BAJO} unidades`}
          subClase="text-orange-600"
        />
        <StatCard
          label="Agotados"
          valor={stats.agotados}
          sub="Sin stock"
          subClase="text-red-600"
        />
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-lg">
            ⌕
          </span>
          <input
            type="text"
            placeholder="Buscar producto o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
          />
        </div>

        {/* Filtro por estado */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="h-10 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-orange-500"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Disponible">Disponibles</option>
          <option value="Bajo">Stock bajo</option>
          <option value="Sin stock">Sin stock</option>
        </select>

        {/* Contador */}
        <span className="text-xs text-slate-500 font-['Inter'] ml-auto">
          {productosFiltrados.length} producto
          {productosFiltrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ---------- Tabla ---------- */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Producto",
                  "Categoría",
                  "Precio",
                  "Stock actual",
                  "Estado",
                  "Acción",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-800 font-['Inter']"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500 font-['Inter']"
                  >
                    {busqueda || filtroEstado !== "Todos"
                      ? "No se encontraron productos con esos filtros."
                      : "No hay productos en el catálogo."}
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => {
                  const badge = estadoDeStock(p.stock);
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      {/* Producto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-md flex items-center justify-center text-lg shrink-0">
                            {p.icono}
                          </div>
                          <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                            {p.nombre}
                          </span>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium font-['Inter']">
                          {p.categoria}
                        </span>
                      </td>

                      {/* Precio */}
                      <td className="px-4 py-3 text-xs text-slate-800 font-['Inter']">
                        {formatSoles(p.precio)}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-xs text-slate-800 font-['Inter']">
                        {p.stock} unidades
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold font-['Inter'] ${badge.clase}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setEditando(p)}
                          className="px-4 h-8 bg-white border border-slate-200 text-orange-600 text-xs font-semibold rounded-md hover:bg-orange-50 transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Banner inferior ---------- */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm">
          i
        </div>
        <p className="flex-1 text-xs text-blue-800 font-['Inter']">
          Los cambios de precio o stock quedan registrados en el historial del
          sistema.
        </p>
        <span className="text-xs font-semibold text-slate-800 font-['Inter']">
          Mostrando {productosFiltrados.length} de {productos.length}
        </span>
      </div>

      {/* ---------- Modal de edición ---------- */}
      {editando && (
        <EditarProducto
          producto={editando}
          onClose={() => setEditando(null)}
          onGuardar={handleGuardar}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponente
// ----------------------------------------------------------------------
function StatCard({ label, valor, sub, subClase = "text-orange-600" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-500 font-medium font-['Inter']">
        {label}
      </span>
      <span className="text-2xl font-bold text-slate-800 font-['Inter']">
        {valor}
      </span>
      <span className={`text-xs font-['Inter'] ${subClase}`}>{sub}</span>
    </div>
  );
}
