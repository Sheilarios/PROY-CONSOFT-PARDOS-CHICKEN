import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ----------------------------------------------------------------------
// LAYOUT
// ----------------------------------------------------------------------
import DashboardLayout from "./layouts/DashboardLayout";
import RutaProtegida from "./components/RutaProtegida";

// ----------------------------------------------------------------------
// AUTENTICACIÓN
// ----------------------------------------------------------------------
import Login from "./pages/auth/Login";

// ----------------------------------------------------------------------
// CAJERO
// ----------------------------------------------------------------------
import RegistrarPedido from "./pages/cajero/RegistrarPedido";
import Clientes from "./pages/cajero/Clientes";
import PedidoConfirmado from "./pages/cajero/PedidoConfirmado";
import RegistrarIncidencia from "./pages/cajero/RegistrarIncidencia";
import EditarPedido from "./pages/cajero/EditarPedido";

// ----------------------------------------------------------------------
// COCINERO
// ----------------------------------------------------------------------
import ColaCocina from "./pages/cocinero/ColaCocina";

// ----------------------------------------------------------------------
// DESPACHO
// ----------------------------------------------------------------------
import PanelDespacho from "./pages/despacho/PanelDespacho";
import ConfirmarDespacho from "./pages/despacho/ConfirmarDespacho";
import AsignacionRepartidor from "./pages/despacho/AsignacionRepartidor";
import VerificacionPedido from "./pages/despacho/VerificacionPedido";
import Repartidores from "./pages/despacho/Repartidores";

// ----------------------------------------------------------------------
// ADMINISTRADOR
// ----------------------------------------------------------------------
import Resumen from "./pages/administrador/Resumen";
import DetalleProduccion from "./pages/administrador/DetalleProduccion";
import DespachoAdmin from "./pages/administrador/DespachoAdmin";
import Historial from "./pages/administrador/Historial";
import Reportes from "./pages/administrador/Reportes";
import Configuracion from "./pages/administrador/Configuracion";

// ----------------------------------------------------------------------
// COMPARTIDAS (SHARED)
// ----------------------------------------------------------------------
import Pedidos from "./pages/shared/Pedidos";
import DetallePedido from "./pages/shared/DetallePedido";
import Productos from "./pages/shared/Productos";
import EditarProducto from "./pages/shared/EditarProducto";

// ======================================================================
// APP
// ======================================================================
export default function App() {
  return (
    <Router>
      <Routes>
        {/* ================= RUTAS PÚBLICAS ================= */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* ================= RUTAS PROTEGIDAS (Layout) ================= */}
        <Route element={<RutaProtegida><DashboardLayout /></RutaProtegida>}>
          {/* ------------------------------------------------- */}
          {/* CAJERO                                            */}
          {/* ------------------------------------------------- */}
          <Route
            path="/cajero/registrar-pedido"
            element={<RegistrarPedido />}
          />
          <Route
            path="/cajero/pedido-confirmado"
            element={<PedidoConfirmado />}
          />
          <Route path="/cajero/incidencias/nueva" element={<RegistrarIncidencia />} />
          <Route path="/cajero/pedidos/editar" element={<EditarPedido />} />
          <Route path="/cajero/clientes" element={<Clientes />} />
          <Route path="/cajero/pedidos" element={<Pedidos />} />
          <Route path="/cajero/pedidos/detalle" element={<DetallePedido />} />
          <Route path="/cajero/productos" element={<Productos />} />
          <Route path="/cajero/productos/editar" element={<EditarProducto />} />

          {/* ------------------------------------------------- */}
          {/* COCINERO                                          */}
          {/* ------------------------------------------------- */}
          <Route path="/cocinero/cola" element={<ColaCocina />} />
          <Route path="/cocinero/pedidos" element={<Pedidos />} />
          <Route path="/cocinero/pedidos/detalle" element={<DetallePedido />} />
          <Route path="/cocinero/productos" element={<Productos />} />

          {/* ------------------------------------------------- */}
          {/* DESPACHO                                          */}
          {/* ------------------------------------------------- */}
          <Route path="/despacho/panel" element={<PanelDespacho />} />
          <Route
            path="/despacho/verificacion"
            element={<VerificacionPedido />}
          />
          <Route
            path="/despacho/asignar-repartidor"
            element={<AsignacionRepartidor />}
          />
          <Route path="/despacho/confirmar" element={<ConfirmarDespacho />} />
          <Route path="/despacho/repartidores" element={<Repartidores />} />
          <Route path="/despacho/pedidos" element={<Pedidos />} />
          <Route path="/despacho/pedidos/detalle" element={<DetallePedido />} />

          {/* ------------------------------------------------- */}
          {/* ADMINISTRADOR                                     */}
          {/* ------------------------------------------------- */}
          <Route path="/admin/resumen" element={<Resumen />} />
          <Route path="/admin/produccion" element={<ColaCocina />} />
          <Route
            path="/admin/produccion/detalle"
            element={<DetalleProduccion />}
          />
          <Route path="/admin/despacho" element={<DespachoAdmin />} />
          <Route path="/admin/historial" element={<Historial />} />
          <Route path="/admin/reportes" element={<Reportes />} />
          <Route path="/admin/configuracion" element={<Configuracion />} />
          <Route path="/admin/pedidos" element={<Pedidos />} />
          <Route path="/admin/pedidos/detalle" element={<DetallePedido />} />
          <Route path="/admin/productos" element={<Productos />} />
          <Route path="/admin/productos/editar" element={<EditarProducto />} />
        </Route>

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
