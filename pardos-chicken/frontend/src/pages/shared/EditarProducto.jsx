import { useEffect, useState } from "react";

export default function EditarProducto({ producto, onClose = () => {}, onGuardar = () => {} }) {
  const [nombre, setNombre] = useState(producto?.nombre || "");
  const [precio, setPrecio] = useState(String(producto?.precio ?? ""));
  const [tipoAjuste, setTipoAjuste] = useState("entrada");
  const [cantidadAjuste, setCantidadAjuste] = useState(0);
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

  if (!producto) {
    return <p className="p-6 text-sm text-slate-600">Selecciona un producto desde el catálogo.</p>;
  }

  const stockFinal = producto.stock + (tipoAjuste === "entrada" ? cantidadAjuste : -cantidadAjuste);

  const guardar = async () => {
    const nombreLimpio = nombre.trim();
    const precioNumero = Number(precio);
    if (!nombreLimpio) {
      setError("El nombre del producto no puede estar vacío.");
      return;
    }
    if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
      setError("El precio debe ser mayor a cero.");
      return;
    }
    if (stockFinal < 0) {
      setError("El ajuste dejaría el stock en negativo.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await onGuardar({ nombre: nombreLimpio, precio: precioNumero, stock: stockFinal, imagen });
    } catch (fallo) {
      const datos = fallo.response?.data;
      const mensaje = datos && typeof datos === "object" ? Object.values(datos)[0] : null;
      setError(Array.isArray(mensaje) ? mensaje.join(" ") : mensaje || "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 overflow-y-auto" onClick={() => { if (!guardando) onClose(); }}>
      <div className="relative w-full max-w-xl bg-white rounded-lg shadow-2xl border border-slate-200 my-8" onClick={(evento) => evento.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Editar producto</h2>
            <p className="text-xs text-slate-500">Actualiza el nombre, el precio o las existencias reales.</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar" className="text-2xl text-slate-500">×</button>
        </div>

        <div className="p-6 flex flex-col gap-5 text-sm">
          {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2">{error}</p>}
          <div>
            <label htmlFor="nombre-producto" className="block text-xs font-semibold text-slate-800 mb-1">Nombre del producto</label>
            <input id="nombre-producto" value={nombre} onChange={(evento) => setNombre(evento.target.value)} disabled={guardando} maxLength={120} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none focus:border-orange-500" />
          </div>
          <div>
            <label htmlFor="precio-producto" className="block text-xs font-semibold text-slate-800 mb-1">Precio (S/)</label>
            <input id="precio-producto" type="number" min="0.01" step="0.01" value={precio} onChange={(evento) => setPrecio(evento.target.value)} disabled={guardando} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none focus:border-orange-500" />
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-800">
            Imagen del producto
            <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={elegirImagen} disabled={guardando} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-normal" />
            <span className="font-normal text-slate-500">JPG o PNG, máximo 5 MB. Si no eliges otra, se conserva la actual.</span>
          </label>
          {(vistaImagen || producto.imagen) && <img src={vistaImagen || producto.imagen} alt="Vista previa del producto" className="w-28 h-28 object-cover rounded-md border border-slate-200" />}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="font-bold text-slate-800 mb-2">Ajuste de stock</h3>
            <p className="text-xs text-slate-500 mb-3">Stock actual: {producto.stock} unidades</p>
            <div className="flex flex-wrap items-center gap-3">
              <select value={tipoAjuste} onChange={(evento) => setTipoAjuste(evento.target.value)} disabled={guardando} className="h-10 px-3 border border-slate-200 rounded-md">
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
              <button type="button" onClick={() => setCantidadAjuste(Math.max(0, cantidadAjuste - 1))} disabled={guardando || cantidadAjuste === 0} aria-label="Disminuir ajuste" className="w-9 h-9 border border-slate-200 rounded disabled:opacity-40">−</button>
              <span className="min-w-8 text-center font-semibold">{cantidadAjuste}</span>
              <button type="button" onClick={() => setCantidadAjuste(cantidadAjuste + 1)} disabled={guardando} aria-label="Aumentar ajuste" className="w-9 h-9 border border-slate-200 rounded">+</button>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-800">Stock después del ajuste: {stockFinal} unidades</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={guardando} className="px-4 h-10 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-md">Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando} className="px-5 h-10 bg-orange-600 text-white text-xs font-semibold rounded-md disabled:opacity-50">{guardando ? "Guardando..." : "Guardar cambios"}</button>
        </div>
      </div>
    </div>
  );
}
