import React, { useEffect, useMemo, useState } from "react";
import { pedidosService } from "../../api/pedidosService";
import EditarProducto from "./EditarProducto";
import AgregarProducto from "./AgregarProducto";
import imagenCuartoPollo from "../../assets/productos/cuarto-pollo.png";
import imagenPolloEntero from "../../assets/productos/pollo-entero.png";
import imagenPapasFritas from "../../assets/productos/papas-fritas.png";
import imagenGaseosa from "../../assets/productos/gaseosa-1-5l.png";

const imagenDeProducto = (nombre) => {
  const nombreMinusculas = nombre.toLowerCase();
  if (nombreMinusculas.includes("1/4 pollo")) return imagenCuartoPollo;
  if (nombreMinusculas.includes("pollo entero")) return imagenPolloEntero;
  if (nombreMinusculas.includes("papas fritas")) return imagenPapasFritas;
  if (nombreMinusculas.includes("gaseosa 1.5")) return imagenGaseosa;
  return null;
};

const adaptarProducto = (producto) => ({
  id: producto.id,
  nombre: producto.nombre,
  imagen: producto.imagen,
  precio: Number(producto.precio_unitario),
  stock: producto.stock_disponible,
});

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
  const esAdministrador = localStorage.getItem("rol") === "administrador";
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [editando, setEditando] = useState(null);
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    pedidosService.listarProductos()
      .then((lista) => setProductos(lista.map(adaptarProducto)))
      .catch(() => setError("No se pudo cargar el catálogo de productos."))
      .finally(() => setCargando(false));
  }, []);

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
        p.nombre.toLowerCase().includes(q);
      const okEstado =
        filtroEstado === "Todos"
          ? true
          : estadoDeStock(p.stock).valor === filtroEstado;
      return okBusqueda && okEstado;
    });
  }, [productos, busqueda, filtroEstado]);

  // ---------- Handlers ----------
  const handleGuardar = async (cambios) => {
    const datos = new FormData();
    datos.append("nombre", cambios.nombre);
    datos.append("precio_unitario", String(cambios.precio));
    datos.append("stock_disponible", String(cambios.stock));
    datos.append("stock_anterior", String(editando.stock));
    if (cambios.imagen) datos.append("imagen", cambios.imagen);
    const actualizado = adaptarProducto(await pedidosService.actualizarProducto(editando.id, datos));
    setProductos((prev) =>
      prev.map((p) =>
        p.id === actualizado.id ? actualizado : p,
      ),
    );
    setEditando(null);
    setAviso("Producto actualizado. Caja verá el nuevo precio y stock al recargar.");
  };

  const handleAgregar = async (datos) => {
    const formulario = new FormData();
    formulario.append("nombre", datos.nombre);
    formulario.append("precio_unitario", String(datos.precio_unitario));
    formulario.append("stock_disponible", String(datos.stock_disponible));
    if (datos.imagen) formulario.append("imagen", datos.imagen);
    const creado = adaptarProducto(await pedidosService.crearProducto(formulario));
    setProductos((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
    setAgregando(false);
    setAviso("Producto agregado. Ya aparece en el catálogo de caja.");
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-orange-600 text-xs font-bold font-['Inter'] uppercase">Inventario</span>
          <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">Productos</h1>
          <p className="text-xs text-slate-500 font-['Inter']">
            Consulta los mismos productos y precios que aparecen al registrar pedidos.
          </p>
        </div>
        {esAdministrador && (
          <button type="button" onClick={() => { setAgregando(true); setAviso(""); }} className="px-4 h-10 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700">
            + Agregar producto
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {aviso && <p role="status" className="text-sm text-green-700 bg-green-50 rounded-md p-3">{aviso}</p>}

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
            placeholder="Buscar producto..."
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
          <table className="w-full min-w-[650px]">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Producto",
                  "Precio",
                  "Stock actual",
                  "Estado",
                  ...(esAdministrador ? ["Acción"] : []),
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
              {cargando ? (
                <tr><td colSpan={esAdministrador ? 5 : 4} className="px-4 py-10 text-center text-sm text-slate-500">Cargando productos...</td></tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={esAdministrador ? 5 : 4}
                    className="px-4 py-10 text-center text-sm text-slate-500 font-['Inter']"
                  >
                    {error
                      ? "No se pudo mostrar el catálogo."
                      : (busqueda || filtroEstado !== "Todos")
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
                            {(p.imagen || imagenDeProducto(p.nombre))
                              ? <img src={p.imagen || imagenDeProducto(p.nombre)} alt="" className="w-full h-full object-cover rounded-md" />
                              : "🍽️"}
                          </div>
                          <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                            {p.nombre}
                          </span>
                        </div>
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
                      {esAdministrador && <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setEditando(p)}
                          className="px-4 h-8 bg-white border border-slate-200 text-orange-600 text-xs font-semibold rounded-md hover:bg-orange-50 transition-colors"
                        >
                          Editar
                        </button>
                      </td>}
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
          Los precios y existencias se consultan del catálogo real.
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
      {agregando && (
        <AgregarProducto onClose={() => setAgregando(false)} onGuardar={handleAgregar} />
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
