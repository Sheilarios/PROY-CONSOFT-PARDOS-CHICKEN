import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import RegistrarPedido from "./pages/RegistrarPedido.jsx";
import ConsultarPedidos from "./pages/ConsultarPedidos.jsx";
import Login from "./pages/login.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <h1>Pardos Chicken — Control de Producción y Despacho</h1>
        <nav>
          <NavLink to="/" end>
            Iniciar sesión
          </NavLink>
          <NavLink to="/registrar" end>Registrar pedido</NavLink>
          <NavLink to="/pedidos">Consultar pedidos</NavLink>
          <NavLink to="/login" onClick={() => localStorage.removeItem("access_token")}>
            Cerrar sesión
          </NavLink>
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/registrar" element={<RutaProtegida>
            <RegistrarPedido/>
            </RutaProtegida>}/>

          <Route path="/pedidos" element={<RutaProtegida>
            <ConsultarPedidos/>
            </RutaProtegida>}/>
          <Route path="/login" element={<Login/>}/>
        </Routes>
      </main>
    </BrowserRouter>
  );
}
