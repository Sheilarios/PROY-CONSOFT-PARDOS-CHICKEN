# Sistema de Control de Producción y Despacho — Pardos Chicken

Scaffold funcional del **Incremento 1: Registro y Consulta de Pedidos**, con
Django, Django REST Framework y MySQL en el backend, y React, Vite y Axios en
el frontend.

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

- **Incremento 2:** cola de producción y actualización de estados por cocina.
- **Incremento 3:** verificación y despacho (patrón Strategy por modalidad).
- **Incremento 4:** incidencias, historial y reportes.
