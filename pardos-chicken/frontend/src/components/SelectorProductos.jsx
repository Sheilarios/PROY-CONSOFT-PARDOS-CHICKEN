/**
 * Muestra el catálogo de productos y permite indicar la cantidad de cada
 * uno. Componente controlado: el estado del carrito vive en el padre
 * (RegistrarPedido), este componente solo emite cambios.
 */
export default function SelectorProductos({ productos, cantidades, onCambiarCantidad }) {
  return (
    <table className="tabla-productos">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Cantidad</th>
        </tr>
      </thead>
      <tbody>
        {productos.map((producto) => (
          <tr key={producto.id}>
            <td>{producto.nombre}</td>
            <td>S/ {producto.precio_unitario}</td>
            <td>{producto.stock_disponible}</td>
            <td>
              <input
                type="number"
                min="0"
                max={producto.stock_disponible}
                value={cantidades[producto.id] || 0}
                onChange={(e) => onCambiarCantidad(producto.id, Number(e.target.value))}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
