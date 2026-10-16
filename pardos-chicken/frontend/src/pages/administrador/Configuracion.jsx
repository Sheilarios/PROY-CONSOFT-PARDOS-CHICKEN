import React, { useState } from "react";

export default function Configuracion() {
  const [form, setForm] = useState({
    nombreNegocio: "Pardos Chicken",
    sucursal: "Sucursal principal",
    tiempoCocina: "20",
    stockBajo: "5",
  });

  const [mensaje, setMensaje] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    // Aquí harías: await configuracionService.guardar(form);
    setMensaje({ tipo: "ok", texto: "Cambios guardados correctamente." });
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleCancelar = () => {
    setForm({
      nombreNegocio: "Pardos Chicken",
      sucursal: "Sucursal principal",
      tiempoCocina: "20",
      stockBajo: "5",
    });
    setMensaje(null);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 font-['Inter']">
          Configuración
        </h1>
        <p className="text-xs text-slate-500 font-['Inter']">
          Parámetros de operación y accesos por rol.
        </p>
      </div>

      {/* ---------- Mensaje de feedback ---------- */}
      {mensaje && (
        <div
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            mensaje.tipo === "ok"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* ---------- Grid de tarjetas ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== Datos de la operación ===== */}
        <form
          onSubmit={handleGuardar}
          className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col gap-4"
        >
          <h2 className="text-lg font-bold text-slate-800 font-['Inter']">
            Datos de la operación
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-800 font-['Inter']">
              Nombre del negocio
            </label>
            <input
              type="text"
              name="nombreNegocio"
              value={form.nombreNegocio}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm text-slate-800 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-800 font-['Inter']">
              Sucursal
            </label>
            <input
              type="text"
              name="sucursal"
              value={form.sucursal}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm text-slate-800 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-800 font-['Inter']">
              Tiempo objetivo de cocina (min)
            </label>
            <input
              type="number"
              name="tiempoCocina"
              value={form.tiempoCocina}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm text-slate-800 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-800 font-['Inter']">
              Umbral de stock bajo (unidades)
            </label>
            <input
              type="number"
              name="stockBajo"
              value={form.stockBajo}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm text-slate-800 outline-none focus:border-orange-500"
            />
          </div>
        </form>

        {/* ===== Roles y permisos ===== */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-800 font-['Inter']">
            Roles y permisos
          </h2>
          <p className="text-xs text-slate-500 font-['Inter']">
            Accesos por área de trabajo
          </p>

          {[
            { nombre: "Caja", desc: "Registro y consulta de pedidos" },
            { nombre: "Cocina", desc: "Cola y preparación de pedidos" },
            { nombre: "Despacho", desc: "Entrega y seguimiento" },
            {
              nombre: "Administración",
              desc: "Supervisión, reportes y ajustes",
            },
          ].map((rol) => (
            <div
              key={rol.nombre}
              className="bg-slate-50 rounded-md p-3 flex flex-col gap-1"
            >
              <span className="text-xs font-semibold text-slate-800 font-['Inter']">
                {rol.nombre}
              </span>
              <span className="text-xs text-slate-500 font-['Inter']">
                {rol.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Botones ---------- */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGuardar}
          className="px-6 py-2 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={handleCancelar}
          className="px-6 py-2 bg-white text-slate-800 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
