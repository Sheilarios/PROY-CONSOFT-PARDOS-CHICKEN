# Sistema de Control de Producción y Despacho — Pardos Chicken

Scaffold funcional del **Incremento 1: Registro y Consulta de Pedidos**, construido
con la pila tecnológica definida por el equipo (Django + DRF + MySQL en el
backend, React + Vite + Axios en el frontend).

## Estructura del proyecto

```
pardos-chicken/
├── backend/                     # Django + DRF
│   ├── config/                  # settings, urls, wsgi/asgi
│   └── apps/
│       ├── usuarios/            # Usuario con roles (cajero, cocinero, despacho, admin)
│       └── pedidos/             # Módulo 1: Control de pedidos
│           ├── models.py        # Producto, Pedido, DetallePedido, Incidencia
│           ├── validators.py    # Programación defensiva (RN-01, RN-04)
│           ├── serializers.py   # Registro (RF-01/02) y consulta (RF-03)
│           ├── views.py         # ViewSets + acción enviar-a-produccion
│           ├── admin.py
│           ├── fixtures/        # Datos de ejemplo (productos_demo.json)
│           └── tests/           # Pruebas unitarias (pytest)
└── frontend/                    # React + Vite
    └── src/
        ├── api/                 # axiosClient + pedidosService
        ├── components/          # SelectorProductos
        ├── pages/                # RegistrarPedido, ConsultarPedidos
        └── styles/
```

## Cómo se conecta con la Evaluación Continua 1 (Semana 5)

| Criterio de la ficha | Dónde está cubierto |
|---|---|
| **Aplicación de modelos y planificación** | `models.py` implementa el modelo de datos del Capítulo 4.4 (Pedido, DetallePedido, Producto); la app `pedidos` corresponde al Incremento 1 del cronograma (Capítulo 1.7). |
| **Diseño para la construcción y calidad** | Separación en capas (modelos / validators / serializers / views), alta cohesión y bajo acoplamiento (Capítulo 4.2–4.3), patrón de responsabilidad única por archivo. |
| **Calidad de la codificación y documentación técnica** | Docstrings citando cada RF/RN del documento, `flake8`/`black` configurados, pruebas unitarias en `tests/` (cálculo de total, validación de stock, transición de estados). |

## Requisitos funcionales implementados (Incremento 1)

- **RF-01 / RF-02**: `PedidoRegistroSerializer` + `PedidoViewSet.create` — registra
  productos, cantidades y modalidad; valida stock (RN-01) y genera código único.
- **RF-03**: `PedidoViewSet.list/retrieve` + acción `enviar-a-produccion` — consulta
  pedidos y los envía a la cola de producción respetando la transición de estados (RN-03/RN-04).

## Puesta en marcha — Backend

### Requisitos previos

- Python 3.12
- MySQL Server 8.0
- MySQL Workbench

Crear la base de datos y el usuario desde MySQL Workbench:

```sql
CREATE DATABASE IF NOT EXISTS pardos_chicken_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'pardos_app'@'localhost'
IDENTIFIED BY 'TU_CONTRASENA';

GRANT ALL PRIVILEGES ON pardos_chicken_db.*
TO 'pardos_app'@'localhost';

GRANT ALL PRIVILEGES ON test_pardos_chicken_db.*
TO 'pardos_app'@'localhost';

FLUSH PRIVILEGES;
```

Preparar el backend en PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt

Copy-Item .env.example .env
```

Editar `.env` y reemplazar `TU_CONTRASENA` por la contraseña local de MySQL.

Crear las tablas y cargar los productos iniciales:

```powershell
python manage.py migrate
python manage.py loaddata apps/pedidos/fixtures/productos_demo.json
python manage.py createsuperuser
```

Ejecutar el backend:

```powershell
python manage.py runserver
```

API disponible en `http://127.0.0.1:8000/api/` y documentación Swagger en
`http://127.0.0.1:8000/api/docs/`.

### Ejecutar las pruebas unitarias

```bash
pytest
```

## Puesta en marcha — Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Disponible en `http://localhost:5173`. Antes de usarlo, genera un token en
`POST /api/token/` (usuario/contraseña del superusuario o de un usuario con rol
`CAJERO`) y guárdalo en `localStorage` como `access_token` (o agrega una pantalla
de login más adelante, no incluida aún porque no forma parte del Incremento 1).

## Próximos incrementos (no incluidos en este scaffold)

- **Incremento 2**: cola de producción, actualización de estados por cocina.
- **Incremento 3**: verificación y despacho (patrón Strategy por modalidad).
- **Incremento 4**: incidencias, historial y reportes.
