import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import RegistrarPedido from "./pages/RegistrarPedido.jsx";
import ConsultarPedidos from "./pages/ConsultarPedidos.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <h1>Pardos Chicken — Control de Producción y Despacho</h1>
        <nav>
          <NavLink to="/" end>
            Registrar pedido
          </NavLink>
          <NavLink to="/pedidos">Consultar pedidos</NavLink>
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<RegistrarPedido />} />
          <Route path="/pedidos" element={<ConsultarPedidos />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
