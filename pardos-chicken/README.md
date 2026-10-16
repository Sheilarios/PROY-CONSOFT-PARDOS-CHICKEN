# Sistema de Control de Producción y Despacho — Pardos Chicken

Proyecto con Django, Django REST Framework y MySQL en el backend, y React,
Vite y Axios en el frontend. El diseño por roles de la rama `main` se integró
con las funciones implementadas hasta el Capítulo 6.3.

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

## Frontend integrado

- El inicio de sesión usa JWT y `GET /api/usuarios/me/` para mostrar el rol real.
- **Cajero → Registrar pedido** carga productos y stock reales, busca clientes
  por nombre y guarda el pedido con sus detalles en la API. **Clientes** muestra
  los registros reales y **Pedidos** permite consultar y enviar a cocina.
- **Cocinero → Cola de cocina** muestra la cola priorizada y permite avanzar
  pedidos a **En preparación** y **Listo**. **Administrador → Producción** usa
  la misma vista funcional.
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

El repositorio no incluye un volcado SQL. Las migraciones crean las tablas y
la fixture existente carga los cuatro productos de ejemplo:

```powershell
python manage.py migrate
python manage.py loaddata apps/pedidos/fixtures/productos_demo.json
python manage.py createsuperuser
```

Si ya tienes la base de datos con productos y usuarios, no vuelvas a cargar
la fixture ni a crear el superusuario.

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

En la pantalla inicial, ingresa con un usuario existente, por ejemplo el
superusuario creado antes. React solicita el token a `POST /api/token/` y
permite acceder a **Registrar pedido** y **Consultar pedidos**; no hace falta
generar ni guardar el token manualmente.

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
- **Incremento 4:** incidencias, historial y reportes.
