import { useEffect, useState } from "react";
import { pedidosService } from "../../api/pedidosService";

export default function Clientes() {
  const [nombre, setNombre] = useState("");
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarClientes = async (busqueda = "") => {
    setCargando(true);
    setError("");
    try {
      const lista = busqueda.trim()
        ? await pedidosService.buscarClientesPorNombre(busqueda.trim())
        : await pedidosService.listarClientes();
      setClientes(lista);
    } catch (err) {
      setClientes([]);
      const detalle = err.response?.data?.detail;
      setError(err.response?.status === 404 ? "Cliente no encontrado." : detalle || "No se pudieron cargar los clientes.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const buscar = (evento) => {
    evento.preventDefault();
    cargarClientes(nombre);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      <div>
        <span className="text-orange-600 text-xs font-bold uppercase">Directorio</span>
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <p className="text-xs text-slate-500">Clientes registrados al guardar pedidos.</p>
      </div>

      <form onSubmit={buscar} className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          className="w-full max-w-md h-10 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800"
        />
        <button type="submit" disabled={cargando} className="h-10 px-4 rounded-md bg-orange-600 text-white text-xs font-semibold">
          Buscar
        </button>
        <button type="button" onClick={() => { setNombre(""); cargarClientes(); }} disabled={cargando} className="h-10 px-4 rounded-md border border-slate-200 bg-white text-slate-800 text-xs font-semibold">
          Mostrar todos
        </button>
      </form>

      {cargando && <p className="text-xs text-slate-500">Cargando clientes...</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-slate-800">Cliente</th>
              <th className="px-3 py-2 text-left text-xs text-slate-800">Teléfono</th>
              <th className="px-3 py-2 text-left text-xs text-slate-800">Origen</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente, indice) => (
              <tr key={`${cliente.id || "historial"}-${indice}`} className="border-t border-slate-200">
                <td className="px-3 py-3 text-xs font-semibold text-slate-800">{cliente.nombre}</td>
                <td className="px-3 py-3 text-xs text-slate-800">{cliente.telefono || "—"}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{cliente.origen === "historial" ? "Pedido anterior" : "Registrado"}</td>
              </tr>
            ))}
            {clientes.length === 0 && !cargando && !error && (
              <tr><td colSpan="3" className="px-3 py-8 text-center text-xs text-slate-500">No hay clientes registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
