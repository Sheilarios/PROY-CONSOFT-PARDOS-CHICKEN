import React, { useState } from "react";

// ----------------------------------------------------------------------
// Datos de ejemplo
// ----------------------------------------------------------------------
const PRODUCTO_EJEMPLO = {
  id: 1,
  icono: "🍗",
  nombre: "1/2 Pollo a la brasa",
  precio: 32.0,
  stock: 18,
  estado: "Disponible",
};

const ESTADOS_PRODUCTO = ["Disponible", "Pocas unidades", "Sin stock"];
const MOTIVOS_AJUSTE = [
  "Reposición de stock",
  "Merma",
  "Corrección de inventario",
  "Devolución",
  "Otro",
];

// ----------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------
export default function EditarProducto({
  producto = PRODUCTO_EJEMPLO,
  onClose = () => {},
  onGuardar = () => {},
}) {
  const [form, setForm] = useState({
    nombre: producto.nombre,
    precio: producto.precio,
    stock: producto.stock,
    estado: producto.estado,
    cantidadAjuste: 0,
    motivoAjuste: MOTIVOS_AJUSTE[0],
    observaciones: "",
  });

  const [tipoAjuste, setTipoAjuste] = useState("entrada"); // "entrada" | "salida"
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "number" ? Number(value) : value,
    });
    if (error) setError(null);
  };

  const incrementarAjuste = () => {
    setForm((prev) => ({ ...prev, cantidadAjuste: prev.cantidadAjuste + 1 }));
  };

  const decrementarAjuste = () => {
    setForm((prev) => ({
      ...prev,
      cantidadAjuste: Math.max(0, prev.cantidadAjuste - 1),
    }));
  };

  const stockFinal =
    tipoAjuste === "entrada"
      ? form.stock + form.cantidadAjuste
      : form.stock - form.cantidadAjuste;

  const handleGuardar = async () => {
    setError(null);

    if (!form.nombre.trim()) {
      setError("El nombre del producto no puede estar vacío.");
      return;
    }
    if (form.precio <= 0) {
      setError("El precio debe ser mayor a 0.");
      return;
    }
    if (tipoAjuste === "salida" && stockFinal < 0) {
      setError("El ajuste dejaría el stock en negativo.");
      return;
    }

    setGuardando(true);
    try {
      // await productosService.actualizar(producto.id, {
      //   nombre: form.nombre,
      //   precio: form.precio,
      //   stock: stockFinal,
      //   estado: form.estado,
      //   ajuste: {
      //     tipo: tipoAjuste,
      //     cantidad: form.cantidadAjuste,
      //     motivo: form.motivoAjuste,
      //     observaciones: form.observaciones,
      //   },
      // });

      setTimeout(() => {
        setGuardando(false);
        onGuardar({
          ...producto,
          nombre: form.nombre,
          precio: form.precio,
          stock: stockFinal,
          estado: form.estado,
        });
      }, 500);
    } catch (err) {
      setError("No se pudieron guardar los cambios.");
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl border border-slate-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- Header ---------- */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl font-bold text-slate-800 font-['Inter']">
              Editar producto
            </h2>
            <p className="text-xs text-slate-500 font-['Inter']">
              Actualiza la información y realiza ajustes de inventario del
              producto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* ---------- Body ---------- */}
        <div className="p-6 flex flex-col gap-5">
          {/* Error */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}

          {/* ---------- Cabecera del producto ---------- */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white border border-blue-100 rounded-md flex items-center justify-center text-5xl">
              {producto.icono}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-bold text-slate-800 font-['Inter']">
                {form.nombre || producto.nombre}
              </span>
              <span className="text-xs text-slate-500 font-['Inter']">
                ID: #{producto.id}
              </span>
            </div>
          </div>

          {/* ---------- Campos básicos ---------- */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nombre"
              className="text-xs font-semibold text-slate-800 font-['Inter']"
            >
              Nombre del producto
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              disabled={guardando}
              className="h-10 px-3 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="precio"
                className="text-xs font-semibold text-slate-800 font-['Inter']"
              >
                Precio (S/)
              </label>
              <input
                id="precio"
                name="precio"
                type="number"
                min="0"
                step="0.5"
                value={form.precio}
                onChange={handleChange}
                disabled={guardando}
                className="h-10 px-3 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                Stock actual
              </span>
              <div className="h-10 px-3 rounded-md border border-blue-100 bg-slate-50 text-xs text-slate-800 flex items-center">
                {form.stock} unidades
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="estado"
                className="text-xs font-semibold text-slate-800 font-['Inter']"
              >
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={form.estado}
                onChange={handleChange}
                disabled={guardando}
                className="h-10 px-3 rounded-md border border-blue-100 bg-white text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
              >
                {ESTADOS_PRODUCTO.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-blue-100" />

          {/* ---------- Ajuste de inventario ---------- */}
          <div className="flex items-center gap-2">
            <span className="text-base">📦</span>
            <h3 className="text-base font-bold text-slate-800 font-['Inter']">
              Ajuste de inventario
            </h3>
          </div>

          {/* Toggle Entrada / Salida */}
          <div className="grid grid-cols-2 gap-0 border border-blue-100 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setTipoAjuste("entrada")}
              className={`h-11 flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                tipoAjuste === "entrada"
                  ? "bg-red-50 text-orange-600 border-r border-orange-300"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="text-lg">⇄</span>
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setTipoAjuste("salida")}
              className={`h-11 flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                tipoAjuste === "salida"
                  ? "bg-red-50 text-orange-600"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Salida →
            </button>
          </div>

          {/* Cantidad y motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                Cantidad a ajustar
              </span>
              <div className="flex items-center border border-blue-100 rounded-md">
                <button
                  type="button"
                  onClick={decrementarAjuste}
                  disabled={form.cantidadAjuste === 0}
                  aria-label="Disminuir"
                  className="w-10 h-10 flex items-center justify-center text-slate-800 text-lg font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold text-slate-800">
                  {form.cantidadAjuste}
                </span>
                <button
                  type="button"
                  onClick={incrementarAjuste}
                  aria-label="Aumentar"
                  className="w-10 h-10 flex items-center justify-center text-slate-800 text-lg font-semibold hover:bg-slate-50"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="motivoAjuste"
                className="text-xs font-semibold text-slate-800 font-['Inter']"
              >
                Motivo del ajuste
              </label>
              <select
                id="motivoAjuste"
                name="motivoAjuste"
                value={form.motivoAjuste}
                onChange={handleChange}
                disabled={guardando}
                className="h-10 px-3 rounded-md border border-blue-100 bg-white text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50"
              >
                {MOTIVOS_AJUSTE.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview de stock final */}
          {form.cantidadAjuste > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between text-xs font-['Inter']">
              <span className="text-slate-500">Stock después del ajuste</span>
              <span className="font-bold text-slate-800">
                {form.stock} → {stockFinal} unidades
              </span>
            </div>
          )}

          {/* Observaciones */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="observaciones"
              className="text-xs font-semibold text-slate-800 font-['Inter']"
            >
              Observaciones
            </label>
            <textarea
              id="observaciones"
              name="observaciones"
              rows="3"
              placeholder="Ej. Ingreso de producto por reposición del proveedor."
              value={form.observaciones}
              onChange={handleChange}
              disabled={guardando}
              className="px-3 py-2 rounded-md border border-blue-100 text-xs text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-50 resize-none"
            />
          </div>

          {/* Aviso */}
          <div className="bg-indigo-50 rounded-md p-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-blue-800 font-bold text-sm shrink-0">
              i
            </div>
            <p className="text-xs text-blue-800 font-['Inter']">
              Los ajustes quedan registrados en el historial del sistema.
            </p>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-['Inter'] sm:max-w-md">
            Los cambios en el precio, estado o inventario serán registrados con
            tu usuario en el historial.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 h-10 bg-white border border-blue-100 text-slate-800 text-xs font-semibold rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 h-10 bg-red-50 border border-orange-300 text-orange-600 text-xs font-semibold rounded-md hover:bg-orange-50 transition-colors"
            >
              Ver historial
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              disabled={guardando}
              className="px-5 h-10 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
