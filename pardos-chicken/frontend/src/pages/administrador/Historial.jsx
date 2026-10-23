import { useCallback, useEffect, useMemo, useState } from "react";
import { pedidosService } from "../../api/pedidosService";

const ESTADOS = {
  REGISTRADO: "Registrado",
  EN_COLA: "En cola",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  DESPACHADO: "Despachado",
  CANCELADO: "Cancelado",
};

const TIPOS_INCIDENCIA = {
  DEMORA: "Demora",
  CANCELACION: "Cancelación",
  ERROR: "Error en el pedido",
  DEVOLUCION: "Devolución",
  ERROR_PRODUCTOS: "Producto o cantidad incorrectos",
  ERROR_MODALIDAD: "Modalidad de entrega incorrecta",
  ERROR_CLIENTE: "Datos del cliente incorrectos",
};

const AREAS = {
  CAJERO: "Caja",
  COCINERO: "Cocina",
  DESPACHADOR: "Despacho",
  ADMINISTRADOR: "Administración",
};

const ESTILO_ESTADO = {
  Registrado: "bg-slate-100 text-slate-800",
  "En cola": "bg-rose-50 text-rose-700",
  "En preparación": "bg-indigo-50 text-blue-800",
  Listo: "bg-green-100 text-green-700",
  Despachado: "bg-violet-100 text-purple-800",
  Cancelado: "bg-red-100 text-red-700",
};

function formatearFecha(valor) {
  return new Date(valor).toLocaleString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fechaLocal(valor) {
  const fecha = new Date(valor);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return anio + "-" + mes + "-" + dia;
}

function crearRegistros(pedidos, incidencias) {
  const registros = [];

  pedidos.forEach((pedido) => {
    const base = {
      pedidoId: pedido.id,
      codigo: pedido.codigo,
      fecha: pedido.fecha_creacion,
      area: "Caja",
      usuario: pedido.registrado_por_nombre || "Usuario de caja",
      estado: ESTADOS[pedido.estado] || pedido.estado,
      cliente: pedido.cliente_nombre || "Sin nombre",
    };
    registros.push({
      ...base,
      clave: "pedido-" + pedido.id,
      tipo: "Registro",
      descripcion: "Pedido registrado para " + base.cliente + ".",
    });
    if (pedido.observaciones) {
      registros.push({
        ...base,
        clave: "observacion-" + pedido.id,
        tipo: "Observación",
        descripcion: pedido.observaciones,
      });
    }
  });

  incidencias.forEach((incidencia) => {
    registros.push({
      clave: "incidencia-" + incidencia.id,
      pedidoId: incidencia.pedido_id,
      codigo: incidencia.pedido_codigo,
      fecha: incidencia.fecha_registro,
      area: AREAS[incidencia.rol_registrador] || "Caja",
      tipo: "Incidencia",
      usuario: incidencia.registrado_por_nombre,
      descripcion: incidencia.descripcion,
      estado: ESTADOS[incidencia.pedido_estado] || incidencia.pedido_estado,
      cliente: incidencia.pedido_cliente || "Sin nombre",
      tipoIncidencia: TIPOS_INCIDENCIA[incidencia.tipo] || incidencia.tipo,
    });
  });

  return registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export default function Historial() {
  const [pedidos, setPedidos] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({
    fecha: "", area: "Todas", estado: "Todos", tipo: "Todos", busqueda: "",
  });

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [respuestaPedidos, respuestaIncidencias] = await Promise.all([
        pedidosService.listar(), pedidosService.listarIncidencias(),
      ]);
      setPedidos(respuestaPedidos.results || respuestaPedidos);
      setIncidencias(respuestaIncidencias);
    } catch {
      setError("No se pudo cargar el historial.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const registros = useMemo(
    () => crearRegistros(pedidos, incidencias), [pedidos, incidencias],
  );

  const registrosFiltrados = useMemo(() => registros.filter((registro) => {
    if (filtros.fecha && fechaLocal(registro.fecha) !== filtros.fecha) return false;
    if (filtros.area !== "Todas" && registro.area !== filtros.area) return false;
    if (filtros.estado !== "Todos" && registro.estado !== filtros.estado) return false;
    if (filtros.tipo !== "Todos" && registro.tipo !== filtros.tipo) return false;
    const busqueda = filtros.busqueda.trim().toLowerCase();
    if (busqueda && ![
      registro.codigo, registro.cliente, registro.usuario, registro.descripcion,
    ].some((valor) => valor.toLowerCase().includes(busqueda))) return false;
    return true;
  }), [registros, filtros]);

  const hoy = fechaLocal(new Date());
  const registrosHoy = registros.filter((registro) => fechaLocal(registro.fecha) === hoy).length;

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historial</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pedidos, observaciones e incidencias guardadas en el sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarHistorial}
          disabled={cargando}
          className="px-4 h-9 bg-white border border-orange-600 text-orange-600 text-xs font-semibold rounded-md disabled:opacity-50"
        >
          {cargando ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Registros de hoy" valor={registrosHoy} />
        <StatCard label="Pedidos registrados" valor={pedidos.length} />
        <StatCard label="Incidencias registradas" valor={incidencias.length} />
        <StatCard
          label="Último registro"
          valor={registros.length ? formatearFecha(registros[0].fecha) : "—"}
          pequeno
        />
      </div>

      <div className="bg-white border border-blue-100 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Fecha
            <input
              type="date"
              value={filtros.fecha}
              onChange={(evento) => setFiltros({ ...filtros, fecha: evento.target.value })}
              className="h-9 px-3 rounded-md border border-blue-100 bg-white text-slate-800"
            />
          </label>
          <FiltroSelect
            label="Área"
            value={filtros.area}
            options={["Todas", "Caja", "Cocina", "Despacho", "Administración"]}
            onChange={(valor) => setFiltros({ ...filtros, area: valor })}
          />
          <FiltroSelect
            label="Estado actual"
            value={filtros.estado}
            options={["Todos", ...Object.values(ESTADOS)]}
            onChange={(valor) => setFiltros({ ...filtros, estado: valor })}
          />
          <FiltroSelect
            label="Tipo de registro"
            value={filtros.tipo}
            options={["Todos", "Registro", "Observación", "Incidencia"]}
            onChange={(valor) => setFiltros({ ...filtros, tipo: valor })}
          />
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Buscar pedido
            <input
              type="search"
              placeholder="Código, cliente o descripción"
              value={filtros.busqueda}
              onChange={(evento) => setFiltros({ ...filtros, busqueda: evento.target.value })}
              className="h-9 px-3 rounded-md border border-blue-100 text-slate-800 outline-none focus:border-orange-500"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setFiltros({
              fecha: "", area: "Todas", estado: "Todos", tipo: "Todos", busqueda: "",
            })}
            className="px-4 h-9 bg-white border border-orange-600 text-orange-600 text-xs font-medium rounded-md"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-blue-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-slate-50">
                <tr>
                  {["# Pedido", "Fecha / Hora", "Área", "Tipo", "Usuario", "Descripción", "Estado actual", "Acción"].map((titulo) => (
                    <th key={titulo} className="px-3 py-3 text-left text-xs font-bold text-slate-800">
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                      {cargando ? "Cargando registros..." : "No hay registros para los filtros seleccionados."}
                    </td>
                  </tr>
                ) : registrosFiltrados.map((registro) => (
                  <tr key={registro.clave} className="border-t border-blue-100 hover:bg-slate-50">
                    <td className="px-3 py-3 text-xs font-bold text-slate-800">{registro.codigo}</td>
                    <td className="px-3 py-3 text-xs text-slate-800">{formatearFecha(registro.fecha)}</td>
                    <td className="px-3 py-3 text-xs text-slate-800">{registro.area}</td>
                    <td className="px-3 py-3 text-xs">
                      <Badge className={registro.tipo === "Incidencia" ? "bg-rose-50 text-red-700" : "bg-indigo-50 text-sky-700"}>
                        {registro.tipo}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800">{registro.usuario}</td>
                    <td className="px-3 py-3 text-xs text-slate-800 max-w-[230px] break-words">{registro.descripcion}</td>
                    <td className="px-3 py-3 text-xs">
                      <Badge className={ESTILO_ESTADO[registro.estado] || "bg-slate-100 text-slate-800"}>
                        {registro.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {registro.tipo === "Incidencia" && (
                        <button
                          type="button"
                          onClick={() => setSeleccionado(registro)}
                          className="text-orange-600 font-semibold hover:underline"
                        >
                          Ver incidencia
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-blue-100 rounded-lg p-4">
          {seleccionado ? (
            <DetalleIncidencia
              registro={seleccionado}
              onClose={() => setSeleccionado(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center gap-2">
              <span className="text-3xl">📋</span>
              <p className="text-sm text-slate-500">
                Selecciona una incidencia de la tabla para ver su detalle.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-4 py-3">
        <p className="text-xs text-blue-800">
          Los estados anteriores del pedido todavía no se registran como eventos separados.
        </p>
        <span className="text-xs font-semibold text-slate-800">
          Mostrando {registrosFiltrados.length} de {registros.length} registros
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, valor, pequeno = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-1.5">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={pequeno ? "text-base font-bold text-slate-800" : "text-2xl font-bold text-slate-800"}>
        {valor}
      </span>
    </div>
  );
}

function Badge({ children, className = "" }) {
  return <span className={"inline-block px-3 py-1 rounded text-xs font-medium " + className}>{children}</span>;
}

function FiltroSelect({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <select
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        className="h-9 px-3 rounded-md border border-blue-100 bg-white text-slate-800"
      >
        {options.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
      </select>
    </label>
  );
}

function DetalleIncidencia({ registro, onClose }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex items-start justify-between">
        <h2 className="text-base font-bold text-slate-800">Detalle de incidencia</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="text-xl text-slate-500">×</button>
      </div>
      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
        <p className="font-bold text-red-700">{registro.tipoIncidencia}</p>
        <p className="text-slate-700 mt-1 break-words">{registro.descripcion}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <span className="text-slate-500">Pedido</span>
        <span className="text-right font-bold text-slate-800">{registro.codigo}</span>
        <span className="text-slate-500">Cliente</span>
        <span className="text-right text-slate-800">{registro.cliente}</span>
        <span className="text-slate-500">Área</span>
        <span className="text-right text-slate-800">{registro.area}</span>
        <span className="text-slate-500">Registrado por</span>
        <span className="text-right text-slate-800">{registro.usuario}</span>
        <span className="text-slate-500">Fecha / Hora</span>
        <span className="text-right text-slate-800">{formatearFecha(registro.fecha)}</span>
        <span className="text-slate-500">Estado actual del pedido</span>
        <span className="text-right text-slate-800">{registro.estado}</span>
      </div>
    </div>
  );
}
