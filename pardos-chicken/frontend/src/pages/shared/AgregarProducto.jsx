import { useEffect, useState } from "react";

export default function AgregarProducto({ onClose, onGuardar }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("0");
  const [imagen, setImagen] = useState(null);
  const [vistaImagen, setVistaImagen] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imagen) {
      setVistaImagen("");
      return;
    }
    const url = URL.createObjectURL(imagen);
    setVistaImagen(url);
    return () => URL.revokeObjectURL(url);
  }, [imagen]);

  const elegirImagen = (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    if (!["image/jpeg", "image/png"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setError("Elige una imagen JPG o PNG de hasta 5 MB.");
      evento.target.value = "";
      return;
    }
    setImagen(archivo);
    setError("");
  };

  const guardar = async () => {
    const precioNumero = Number(precio);
    const stockNumero = Number(stock);
    if (!nombre.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }
    if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
      setError("El precio debe ser mayor a cero.");
      return;
    }
    if (!Number.isInteger(stockNumero) || stockNumero < 0) {
      setError("El stock debe ser un número entero igual o mayor a cero.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await onGuardar({
        nombre: nombre.trim(),
        precio_unitario: precioNumero,
        stock_disponible: stockNumero,
        imagen,
      });
    } catch (fallo) {
      const datos = fallo.response?.data;
      const mensaje = datos && typeof datos === "object" ? Object.values(datos)[0] : null;
      setError(Array.isArray(mensaje) ? mensaje.join(" ") : mensaje || "No se pudo agregar el producto.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 overflow-y-auto" onClick={() => { if (!guardando) onClose(); }}>
      <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl border border-slate-200 my-8" onClick={(evento) => evento.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Agregar producto</h2>
            <p className="text-xs text-slate-500">Aparecerá en el catálogo de caja después de guardarlo.</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar" className="text-2xl text-slate-500">×</button>
        </div>

        <div className="p-6 flex flex-col gap-4 text-sm">
          {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2">{error}</p>}
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-800">
            Nombre del producto
            <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} maxLength={120} disabled={guardando} className="h-10 px-3 border border-slate-200 rounded-md text-sm font-normal outline-none focus:border-orange-500" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-800">
              Precio (S/)
              <input type="number" min="0.01" step="0.01" value={precio} onChange={(evento) => setPrecio(evento.target.value)} disabled={guardando} className="h-10 px-3 border border-slate-200 rounded-md text-sm font-normal outline-none focus:border-orange-500" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-800">
              Stock inicial
              <input type="number" min="0" step="1" value={stock} onChange={(evento) => setStock(evento.target.value)} disabled={guardando} className="h-10 px-3 border border-slate-200 rounded-md text-sm font-normal outline-none focus:border-orange-500" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-800">
            Imagen del producto (opcional)
            <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={elegirImagen} disabled={guardando} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-normal" />
            <span className="font-normal text-slate-500">JPG o PNG, máximo 5 MB.</span>
          </label>
          {vistaImagen && <img src={vistaImagen} alt="Vista previa del producto" className="w-28 h-28 object-cover rounded-md border border-slate-200" />}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={guardando} className="px-4 h-10 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-md">Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando} className="px-5 h-10 bg-orange-600 text-white text-xs font-semibold rounded-md disabled:opacity-50">{guardando ? "Guardando..." : "Agregar producto"}</button>
        </div>
      </div>
    </div>
  );
}
