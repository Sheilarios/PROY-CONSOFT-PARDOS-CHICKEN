# Sistema de Control de Producción y Despacho — Pardos Chicken

Proyecto con Django, Django REST Framework y MySQL en el backend, y React,
Vite y Axios en el frontend. El diseño por roles de la rama `main` se integró
con las funciones y pruebas implementadas hasta el Capítulo 6.5.

## Estructura del proyecto

```text
pardos-chicken/
├── backend/
│   ├── config/                 # Configuración y rutas de Django
│   ├── apps/
│   │   ├── usuarios/           # Usuarios y roles
│   │   └── pedidos/            # Modelos, validaciones, API, fixtures y pruebas
│   ├── .env.example            # Variables de entorno de ejemplo
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/                # Cliente Axios y servicio de pedidos
    │   ├── components/         # Selector de productos y ruta protegida
    │   └── pages/              # Inicio de sesión, registro y consulta
    ├── .env.example
    └── package.json
```

## Cómo se conecta con la Evaluación Continua 1 (Semana 5)

| Criterio de la ficha | Dónde está cubierto |
| --- | --- |
| **Aplicación de modelos y planificación** | `models.py` implementa Pedido, DetallePedido y Producto (Capítulo 4.4); la app `pedidos` corresponde al Incremento 1 del cronograma (Capítulo 1.7). |
| **Diseño para la construcción y calidad** | Separación entre modelos, validadores, serializers y views; alta cohesión y bajo acoplamiento (Capítulos 4.2–4.3). |
| **Calidad de la codificación y documentación técnica** | Docstrings con referencias a RF/RN, `flake8` y `black` entre las dependencias, y pruebas de total, stock y transición de estados en `backend/apps/pedidos/tests/`. |

## Requisitos funcionales implementados (Incremento 1)

- **RF-01 / RF-02:** `PedidoRegistroSerializer` y `PedidoViewSet.create` registran
  productos, cantidades y modalidad; validan stock (RN-01) y generan un código único.
- **RF-03:** `PedidoViewSet.list/retrieve` consulta pedidos y la acción
  `enviar-a-produccion` los envía a la cola respetando los estados (RN-03/RN-04).
- **Acceso:** pantalla de inicio de sesión que obtiene el token JWT de la API.
- **Clientes:** caja puede buscar un cliente por nombre y vincularlo a un pedido.
  Si ingresa un nombre y teléfono nuevos, el cliente se registra al guardar el
  pedido con al menos un producto. El ingreso manual sigue disponible.

## Manejo de excepciones (Capítulo 5.5)

- Si un producto no tiene stock suficiente, `POST /api/pedidos/` responde con
  error `400` y el nombre del producto. No se crea el pedido ni se descuenta stock.
- `GET /api/pedidos/clientes/buscar-por-nombre/?nombre=...` devuelve hasta diez
  coincidencias con nombre y teléfono. Incluye clientes registrados y datos de
  pedidos anteriores, marcados como tales; elegir un pedido anterior reutiliza
  sus datos y, si tiene nombre y teléfono, registra al cliente al guardar un
  nuevo pedido válido. Si no hay coincidencias, responde `404` con
  `Cliente no encontrado.`. Caja puede continuar con los datos manuales del
  pedido.
- El formulario muestra estos mensajes en texto legible. Para vincular un
  cliente registrado al pedido, envía su `cliente_id`. Si el nombre y teléfono
  son nuevos, `POST /api/pedidos/` crea al cliente y al pedido juntos; si el
  pedido no tiene productos o stock suficiente, no crea ninguno.

## Refactorización temprana (Capítulo 5.6)

Se renombraron variables locales del flujo de caja para que indiquen qué dato
contienen: `datos` pasó a `datos_pedido`, `d` a `detalle`, `formulario` a
`datosPedido` y `coincidencias` a `clientesEncontrados`. También se aclararon
los nombres de los eventos y de los indicadores de registro. Los campos de la
API y la lógica de cálculo, stock y registro conservan su comportamiento.

## Incremento 2: priorización de la cola (Capítulo 6.1)

La cola incluye solo pedidos en estado `EN_COLA`. Se ordena por la regla RN-02:
primero Salón (prioridad 1), luego Delivery (2) y después Recojo (3). Entre
pedidos de la misma modalidad se atiende primero el que se registró antes;
si comparten fecha, se usa el ID para mantener un orden estable.

La API expone `GET /api/pedidos/cola-produccion/` y el frontend muestra el
resultado en **Cola de cocina** y **Producción**, con un botón para actualizar.

## Estados de preparación (Capítulo 6.2)

En **Producción**, cada pedido avanza de **En cola** a **En preparación** con
`POST /api/pedidos/{id}/iniciar-preparacion/`, y luego a **Listo** con
`POST /api/pedidos/{id}/marcar-listo/`. El sistema guarda las horas de inicio y
fin. La pantalla muestra los tres estados y el botón correspondiente a cada
paso. `GET /api/pedidos/seguimiento-produccion/` muestra los pedidos en
preparación y listos, mientras `cola-produccion` conserva el orden priorizado.

## Validación de transiciones (Capítulo 6.3)

Las acciones de producción usan `validar_transicion_estado`: solo se puede
avanzar al siguiente estado. Repetir un paso, saltar de **En cola** a **Listo** o
retroceder de **Listo** a **En cola** devuelve error `400` sin modificar el
pedido. La API no acepta `PUT` ni `PATCH` de pedidos, para que el estado solo
cambie mediante las acciones previstas. En el administrador, el estado se
muestra como campo de solo lectura.

## Contratos de preparación e inventario de insumos (Capítulo 6.4)

El stock de **productos** se reserva al registrar el pedido en caja. El stock
de **insumos** se lleva por separado para no descontar el mismo producto dos
veces. En el administrador de Django se crean los insumos con su stock y, dentro
de cada producto, se indica la cantidad de cada insumo que requiere una unidad
del producto (receta).

**Precondiciones de `iniciar-preparacion`:** el pedido debe estar **En cola**,
tener productos, todos los productos deben tener una receta y debe haber stock
suficiente de cada insumo para todas las unidades del pedido. Cuando falta una
receta o un insumo, la API responde `400`, muestra el motivo en cocina y no
cambia el pedido ni el inventario.

**Poscondiciones si se inicia:** el pedido pasa a **En preparación**, se guarda
su hora de inicio y se descuenta automáticamente la cantidad total necesaria
de cada insumo. La operación es atómica: se guardan todos los cambios o
ninguno. Repetir el inicio se rechaza, por lo que no se consumen insumos dos
veces. El stock de productos no se vuelve a descontar en esta etapa.

Para probar los cuatro productos del catálogo de ejemplo se puede ejecutar
`python manage.py loaddata insumos_demo` después de migrar. Esta carga crea
recetas simples y **100 unidades de prueba** para cada insumo; no representan
existencias reales. En el administrador de Django se ajustan las cantidades
antes de usar datos reales. Cada producto nuevo necesita su receta antes de
entrar en preparación. No se debe repetir la carga de ejemplo después de
registrar movimientos, porque restablece esos valores de prueba.

## Pruebas de integración de producción (Capítulo 6.5)

`test_integracion_produccion.py` comprueba el recorrido entre caja y los datos
que usa la vista de cocina: al registrar un pedido se reserva el stock del
producto; al enviarlo aparece en la cola; al iniciar preparación desaparece de
la cola, aparece en seguimiento y se descuentan los insumos. Al marcarlo listo
permanece en seguimiento sin otro descuento. La prueba también verifica que,
si falta un insumo, el pedido sigue en cola y el inventario no cambia.

Para la entrega actual, estas pruebas cubren la integración técnica de cocina;
la experiencia completa de ese rol se continuará después de cajero y
administrador. La interrupción de un pedido que ya está en preparación
(Capítulo 6.6) queda pendiente para esa etapa.

## Incidencias y anulación temprana

El cajero puede registrar una incidencia en un pedido **Registrado** o **En
cola** desde la confirmación o el detalle. La API guarda el tipo, la descripción,
el usuario y la fecha; el administrador los consulta en **Historial**. Desde
**En preparación** en adelante se rechaza el registro de incidencias.

Los cuatro motivos disponibles para caja son: **el cliente ya no desea el
pedido**, **producto o cantidad incorrectos**, **modalidad de entrega
incorrecta** y **datos del cliente incorrectos**. En todos los casos, el pedido
pasa a **Cancelado**, sale de la cola y el stock reservado vuelve al catálogo.
El pedido original queda en el historial; para corregirlo se registra uno
nuevo. Una segunda incidencia se rechaza para evitar devolver el stock dos
veces. Los pedidos no se editan mediante `PUT` o `PATCH`.

Las rutas son `POST /api/pedidos/incidencias/` para caja y
`GET /api/pedidos/incidencias/` para administración. **Reportes** todavía usa
datos de ejemplo y no calcula ventas a partir de estas cancelaciones.

## Frontend integrado

- El inicio de sesión usa JWT y `GET /api/usuarios/me/` para mostrar el rol real.
- **Cajero → Registrar pedido** carga productos y stock reales, busca clientes
  por nombre y guarda el pedido con sus detalles en la API. **Clientes** muestra
  los registros reales y **Pedidos** permite consultar y enviar a cocina.
- **Cocinero → Cola de cocina** muestra la cola priorizada y permite avanzar
  pedidos a **En preparación** y **Listo**. **Administrador → Producción** usa
  la misma vista funcional.
- **Cajero → Registrar incidencia** y **Administrador → Historial** muestran
  registros reales de pedidos, observaciones e incidencias.
- Las demás pantallas del nuevo diseño corresponden a funcionalidades fuera de
  este alcance y todavía contienen datos de ejemplo.

## Instalación y ejecución local

### Requisitos previos

- Git, Python, MySQL Server, MySQL Workbench, Node.js y npm.
- Python 3.12 es la versión indicada en la guía original; el repositorio no
  impone una versión exacta de Python.

### Clonar el repositorio

```powershell
git clone https://github.com/Sheilarios/PROY-CONSOFT-PARDOS-CHICKEN.git
cd PROY-CONSOFT-PARDOS-CHICKEN\pardos-chicken
```

### Configurar MySQL

Con MySQL Server en ejecución, abre MySQL Workbench y crea la base de datos y
el usuario local. Sustituye `TU_CONTRASENA` por una contraseña propia:

```sql
CREATE DATABASE IF NOT EXISTS pardos_chicken_db
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'pardos_app'@'localhost'
IDENTIFIED BY 'TU_CONTRASENA';

GRANT ALL PRIVILEGES ON pardos_chicken_db.* TO 'pardos_app'@'localhost';
GRANT ALL PRIVILEGES ON test_pardos_chicken_db.* TO 'pardos_app'@'localhost';
FLUSH PRIVILEGES;
```

### Configurar el backend

Desde `pardos-chicken/`:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `backend/.env`: establece una `SECRET_KEY` propia y reemplaza
`TU_CONTRASENA` en `DATABASE_URL` por la contraseña del usuario MySQL. No
subas el archivo `.env` al repositorio.

### Ejecutar migraciones e importar datos iniciales

Cada integrante usa su propia base de datos local: el repositorio no incluye
un volcado SQL, pedidos anteriores ni contraseñas. Las migraciones crean las
tablas y las fixtures cargan los cuatro productos de ejemplo junto con sus
insumos y recetas de prueba:

```powershell
python manage.py migrate
python manage.py loaddata apps/pedidos/fixtures/productos_demo.json
python manage.py loaddata apps/pedidos/fixtures/insumos_demo.json
python manage.py createsuperuser
```

Estas cargas de ejemplo y `createsuperuser` están pensados para una base nueva.
En una base existente, ejecuta `migrate` y añade solo los datos que falten
desde el administrador; repetir las fixtures puede restablecer el stock de
prueba.

### Crear usuarios para cada rol

`createsuperuser` crea una cuenta de administración **en tu base local**. Con
el backend en ejecución, entra a `http://127.0.0.1:8000/admin/` con esa cuenta.
En **Usuarios → Añadir usuario**, asigna un nombre de usuario y una contraseña;
selecciona el **Rol del sistema** (por ejemplo, **Personal de caja** o
**Administrador / Gerente**) y guarda. Los cajeros no necesitan permisos de
*staff* ni de superusuario para usar su pantalla del frontend.

Cada compañero repite estos pasos en su propia computadora y elige sus propias
credenciales. El usuario MySQL `pardos_app` solo conecta Django a la base;
no sirve para iniciar sesión en la aplicación. No compartas contraseñas ni
subas archivos `.env` o bases de datos al repositorio.

### Ejecutar el backend

```powershell
python manage.py runserver
```

La API queda en `http://127.0.0.1:8000/api/` y su documentación en
`http://127.0.0.1:8000/api/docs/`.

### Ejecutar el frontend

En otra terminal, desde `pardos-chicken/`:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. El archivo `.env.example`
apunta a `http://127.0.0.1:8000/api` mediante `VITE_API_URL`.

### Inicio de sesión

En la pantalla inicial, ingresa con uno de los usuarios creados. El
superusuario entra como administrador; un usuario con rol **Personal de caja**
entra a las funciones del cajero. React solicita el token a `POST /api/token/`;
no hace falta generarlo ni guardarlo manualmente.

## Ejecutar las pruebas unitarias

Con el entorno virtual activo y desde `backend/`:

```powershell
python -m pytest
```

Las pruebas usan la configuración de base de datos del backend y requieren
los permisos de MySQL para la base de pruebas indicados arriba.

## Problemas frecuentes

- **Error de conexión a MySQL:** verifica que el servidor esté activo y que
  `DATABASE_URL` en `backend/.env` coincida con el usuario, contraseña y base.
- **Catálogo vacío:** carga `apps/pedidos/fixtures/productos_demo.json` después
  de ejecutar las migraciones.
- **El frontend no conecta con la API:** comprueba que Django esté ejecutándose
  y que `VITE_API_URL` en `frontend/.env` apunte a su dirección.
- **No se puede iniciar sesión:** verifica las credenciales del usuario creado
  con `createsuperuser`.

## Próximos incrementos

- **Incremento 2:** cola, preparación y validación de transiciones completadas.
- **Incremento 3:** verificación y despacho (patrón Strategy por modalidad).
- **Incremento 4:** ampliar el historial de cambios de estado y conectar reportes.
