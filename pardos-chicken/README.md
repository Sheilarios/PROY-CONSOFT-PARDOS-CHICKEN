# Sistema de Control de Producción y Despacho — Pardos Chicken

Proyecto con Django 5.1.2, Django REST Framework y MySQL en el backend, y
React 18.3.1, Vite y Axios en el frontend. Caja, Cocina, Despacho y
Administración comparten los pedidos y el catálogo mediante la misma API.

Para ejecutar el proyecto en otra computadora, empieza por
[Instalación y ejecución local](#instalación-y-ejecución-local) y consulta
[Problemas frecuentes](#problemas-frecuentes) si aparece algún error.

## Estructura del proyecto

```text
pardos-chicken/
├── backend/
│   ├── config/                 # Configuración y rutas de Django
│   ├── apps/
│   │   ├── usuarios/           # Usuarios y roles
│   │   └── pedidos/            # Caja, Cocina, Despacho, inventario y reportes
│   ├── .env.example            # Variables de entorno de ejemplo
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/                # Cliente Axios y servicio de pedidos
    │   ├── components/         # Selector de productos y ruta protegida
    │   ├── pages/              # Pantallas por rol y pantallas compartidas
    │   └── utils/              # Formato compartido de fechas
    ├── .env.example
    └── package.json
```

## Arquitectura e incrementos integrados

React consulta la API de Django REST Framework mediante `src/api/pedidosService.js`.
En el backend, `apps/usuarios` contiene las cuentas y sus roles, mientras
`apps/pedidos` reúne los modelos, validaciones y acciones de los cuatro
incrementos. No hay aplicaciones Django separadas para Producción, Despacho o
Reportes; todos operan sobre el mismo `Pedido` y sus detalles.

| Incremento | Rol principal | Flujo implementado |
| --- | --- | --- |
| **1. Caja** | Cajero | Registra y consulta pedidos, valida y reserva stock de productos, permite editar antes de la preparación, anula mediante una incidencia permitida y envía a producción. |
| **2. Cocina** | Cocinero | Consulta la cola priorizada, inicia y termina la preparación, consume insumos según las recetas y registra incidencias durante la preparación. |
| **3. Despacho** | Despachador | Verifica pedidos listos, asigna repartidor a Delivery y confirma la entrega para Salón, Recojo o Delivery. |
| **4. Administración** | Administrador | Consulta pedidos, producción, despacho, incidencias, ediciones, eventos y reportes calculados con datos reales. |

El estado principal avanza **Registrado → En cola → En preparación → Listo →
Despachado**. Una incidencia de Caja puede dejar un pedido **Cancelado** si
todavía está Registrado o En cola. Las acciones operativas de Cocina y Despacho
comprueban el rol en la API; Administración consulta esas áreas desde sus vistas.

## Cómo se conecta con la Evaluación Continua 1 (Semana 5)

| Criterio de la ficha | Dónde está cubierto |
| --- | --- |
| **Aplicación de modelos y planificación** | `models.py` implementa Pedido, DetallePedido y Producto (Capítulo 4.4); la app `pedidos` corresponde al Incremento 1 del cronograma (Capítulo 1.7). |
| **Diseño para la construcción y calidad** | Separación entre modelos, validadores, serializers y views; alta cohesión y bajo acoplamiento (Capítulos 4.2–4.3). |
| **Calidad de la codificación y documentación técnica** | Docstrings con referencias a RF/RN, `flake8` y `black` entre las dependencias, y pruebas de total, stock y transición de estados en `backend/apps/pedidos/tests/`. |

## Incremento 1: Caja y registro de pedidos

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

## Incremento 2: Cocina y priorización de la cola (Capítulo 6.1)

La cola incluye solo pedidos en estado `EN_COLA`. Se ordena por la regla RN-02:
primero Salón (prioridad 1), luego Delivery (2) y después Recojo (3). Entre
pedidos de la misma modalidad se atiende primero el que se registró antes;
si comparten fecha, se usa el ID para mantener un orden estable.

La API expone `GET /api/pedidos/cola-produccion/` y el frontend muestra el
resultado en **Cola de cocina** y **Producción**, con un botón para actualizar.

## Estados de preparación (Capítulo 6.2)

El personal de **Cocina** avanza cada pedido de **En cola** a **En preparación** con
`POST /api/pedidos/{id}/iniciar-preparacion/`, y luego a **Listo** con
`POST /api/pedidos/{id}/marcar-listo/`. El sistema guarda las horas de inicio y
fin. La vista de Cocina muestra los tres estados y el botón correspondiente a
cada paso. La vista de Producción del administrador permite consultar el avance,
sin acciones para iniciar o finalizar la preparación. La API también restringe
esas acciones al rol de Cocina. `GET /api/pedidos/seguimiento-produccion/`
muestra los pedidos en preparación y listos, mientras `cola-produccion`
conserva el orden priorizado.

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

Para probar los cuatro productos del catálogo de ejemplo, después de migrar y
cargar `productos_demo.json` se puede ejecutar
`python manage.py loaddata apps/pedidos/fixtures/insumos_demo.json`. Esta carga crea
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

Estas pruebas cubren la integración de la preparación con Caja; el flujo
continúa en el módulo de Despacho descrito más abajo.

## Incidencias durante la preparación (Capítulo 6.6)

El personal de cocina puede pulsar **Registrar incidencia** en un pedido **En
preparación** desde **Cola de cocina**. El formulario muestra el código y el
estado del pedido, y exige un motivo y una descripción. Admite falta de
insumos, producto dañado, avería de equipo, error de preparación, demora u
otro motivo. Solo un usuario con rol **COCINERO** puede usar
`POST /api/pedidos/incidencias/cocina/`.

La incidencia se guarda en la tabla existente junto con el pedido, el
usuario y la fecha. **No cambia el estado ni el stock** y aparece en
**Administrador → Historial** con el área Cocina. Un pedido inexistente, un
estado distinto de **En preparación**, un motivo inválido o una descripción
vacía se rechazan con un mensaje. Dos envíos iguales del mismo cocinero dentro
de 60 segundos devuelven el mismo registro sin crear una incidencia duplicada.
Si falla el guardado, la transacción se revierte.

La migración `0010_incidencias_cocina` amplía únicamente las opciones del
campo `tipo` de `Incidencia`; conserva las incidencias y los pedidos actuales.
Las pruebas específicas están en `test_incidencias_cocina.py`.

## Incremento 3: verificación y despacho

**Despacho → Panel** muestra pedidos `LISTO` pendientes de verificación,
verificados y `DESPACHADO`. La lista **Pedidos** permite filtrar por estado,
modalidad y código. La verificación exige confirmar cada producto y cantidad,
el empaque y las observaciones. Se guardan el usuario y la fecha, sin crear un
estado principal adicional. Un pedido no se puede verificar dos veces.

Los Delivery verificados requieren asignar un repartidor disponible. El
repartidor queda ocupado al asignarlo y se libera manualmente desde
**Repartidores** después de entregar el pedido al repartidor y de que este
regrese. La liberación se rechaza si aún tiene un pedido `LISTO` pendiente.
La confirmación exige pedido `LISTO`, preparación terminada, verificación y,
para Delivery, repartidor asignado. Guarda usuario, fecha y evento de historial.
Las incidencias de Despacho solo se registran mientras un pedido **Listo** está
pendiente de verificación, sin anularlo ni cambiar stock;
Administración las consulta junto a las verificaciones, asignaciones y
despachos en **Historial**. **Administrador → Despacho** es de consulta.

**Inventario:** el proyecto ya descuenta stock de productos al registrar en
Caja y stock de insumos al iniciar preparación en Cocina. Por ello, confirmar
despacho no realiza otro descuento; hacerlo duplicaría la salida. Para mover
el descuento a Despacho habría que rediseñar también la reserva, cancelación,
edición y validación de stock de las etapas previas.

La migración `0011_repartidor_pedido_asignado_por_pedido_despachado_por_and_more`
añade repartidores, datos de verificación/asignación/despacho y eventos, y
amplía el tamaño de los motivos de incidencia. Tras `python manage.py migrate`,
registra repartidores en la pantalla **Repartidores** o en Django Admin.
Las pruebas del flujo están en `test_despacho.py`.

## Incidencias y anulación temprana

El cajero puede registrar una incidencia en un pedido **Registrado** o **En
cola** desde el detalle del pedido. La API guarda el tipo, la descripción,
el usuario y la fecha; el administrador los consulta en **Historial**. Las
incidencias de caja se rechazan desde **En preparación**; en esa etapa cocina
puede registrar los problemas indicados en el Capítulo 6.6.

Los cuatro motivos disponibles para caja son: **el cliente ya no desea el
pedido**, **producto o cantidad incorrectos**, **modalidad de entrega
incorrecta** y **datos del cliente incorrectos**. En todos los casos, el pedido
pasa a **Cancelado**, sale de la cola y el stock reservado vuelve al catálogo.
El pedido original queda en el historial; para corregirlo se registra uno
nuevo. Una segunda incidencia se rechaza para evitar devolver el stock dos
veces. Los pedidos no se editan mediante `PUT` o `PATCH`.

Las rutas son `POST /api/pedidos/incidencias/` para caja y
`GET /api/pedidos/incidencias/` para administración. Los productos de pedidos
cancelados quedan excluidos del reporte de productos por hora; la incidencia
sí se cuenta en el reporte de incidencias.

## Edición de pedidos antes de la preparación

En **Cajero → Pedidos**, **Editar pedido** aparece solo si el pedido está
**Registrado** o **En cola**. La opción permite agregar o quitar productos,
cambiar cantidades y modificar observaciones; conserva el cliente, la modalidad
y el estado. La anulación sigue siendo una acción separada desde **Ver detalle →
Registrar incidencia**.

Los complementos se crean como productos normales del catálogo, con nombre,
precio y stock. No hay nombres de complementos fijos en el código. Si un producto
nuevo entrará en producción, también necesita una receta de insumos para poder
iniciar su preparación.

La edición usa `POST /api/pedidos/{id}/editar/` con la **lista final** de
`detalles` y `observaciones`. Omitir un producto de esa lista lo quita del
pedido; cada cantidad enviada debe ser positiva y debe quedar al menos un
producto. El backend vuelve a comprobar el estado y el stock antes de guardar.
Solo reserva o devuelve la diferencia de unidades; mantiene el precio guardado
de los productos existentes y toma el precio actual del catálogo para los
nuevos. Si falta stock, no aplica ningún cambio.

Cada edición guarda el usuario, fecha, descripción, total anterior y nuevo total.
Administración puede consultarla en **Historial** o en
`GET /api/pedidos/ediciones/`. Los `PUT` y `PATCH` generales de pedidos siguen
deshabilitados para evitar cambios arbitrarios de estado.

## Incremento 4: supervisión, historial y reportes

**Administrador → Pedidos, Producción y Despacho** consulta los registros de los
tres incrementos operativos. **Historial** reúne pedidos, observaciones,
ediciones, incidencias y eventos de verificación, asignación y despacho desde la
API. Las incidencias de Caja anulan pedidos Registrados o En cola; las de Cocina
se registran solo durante la preparación y las de Despacho solo para pedidos
Listos aún no verificados. Estas últimas no anulan el pedido ni modifican el
inventario. El modelo contempla el nombre de tipo `DEVOLUCION`, pero todavía
no existe un flujo de devolución en las pantallas y endpoints activos.

El historial registra incidencias, ediciones y eventos de Despacho, pero **no
conserva cada transición anterior de estado como un evento independiente**.
El estado actual y las fechas principales permanecen en `Pedido`; esto no
equivale a una auditoría completa de estados.

**Administrador → Reportes** consulta
`GET /api/pedidos/estadisticas/?periodo=hoy|semana|mes`. Presenta productos
solicitados por hora, el tiempo promedio entre inicio y fin de preparación y
las incidencias por modalidad de entrega. Los datos provienen de los pedidos e
incidencias guardados; hay estados vacíos si no existen registros para el
período. El reporte de productos excluye pedidos Cancelados. El acceso al
endpoint de estadísticas está restringido a Administración.

Las fechas del frontend comparten las funciones de `src/utils/fechas.js`, usadas
en Caja, Cocina, Despacho e Historial. El backend está configurado con la zona
horaria `America/Lima`.

## Frontend integrado

- El inicio de sesión usa JWT y `GET /api/usuarios/me/` para mostrar el rol real.
- **Cajero → Registrar pedido** carga productos y stock reales, busca clientes
  por nombre y guarda el pedido con sus detalles en la API. **Clientes** muestra
  los registros reales y **Pedidos** permite consultar y enviar a cocina.
- **Productos** consulta el mismo catálogo que **Registrar pedido** y **Editar
  pedido**. Administración puede agregar productos y actualizar nombre, precio y stock; caja solo
  consulta. La categoría de la maqueta no aparece porque todavía no existe en
  el modelo real de productos. Un producto nuevo necesita configurar su receta
  de insumos en Django Admin antes de iniciar la preparación de un pedido que lo
  contenga. La imagen es opcional: admite JPG o PNG de hasta 5 MB y se muestra
  en el catálogo. Los archivos se guardan en `backend/media/`, que no se sube a
  GitHub; cada instalación conserva sus propias imágenes locales.
- **Cocinero → Cola de cocina** muestra la cola priorizada y permite avanzar
  pedidos a **En preparación** y **Listo**, y registrar incidencias durante la
  preparación. **Administrador → Producción** usa la misma vista de estados
  para consulta, sin acciones para cambiar estados ni registrar incidencias de cocina.
- **Cajero → Registrar incidencia** y **Administrador → Historial** muestran
  registros reales de pedidos, observaciones, ediciones e incidencias.
- **Despacho → Panel, Pedidos y Repartidores** usan datos reales de la API.
  Permiten verificar, asignar repartidores, confirmar entregas y registrar
  incidencias. **Administrador → Despacho** muestra el avance en solo lectura.
- **Administrador → Reportes** usa estadísticas reales y filtros Hoy, Semana y
  Mes. **Administrador → Resumen** todavía contiene cifras de ejemplo y no
  debe emplearse como evidencia de reportes reales.

## Instalación y ejecución local

### Requisitos previos

- Git, **Python 3.12**, MySQL Server, un cliente como MySQL Workbench, Node.js y npm.
- El backend fija `Django==5.1.2`. Usa Python 3.12 para este proyecto: Python
  3.14 no figura entre las [versiones compatibles con Django
  5.1](https://docs.djangoproject.com/en/5.1/releases/5.1/#python-compatibility)
  y puede fallar al abrir formularios del administrador.

En PowerShell, comprueba la versión instalada con `py -3.12 --version`. Si no
aparece, instálala con `winget install --id Python.Python.3.12 --exact --source winget`
y abre una terminal nueva antes de continuar. Python 3.14 puede permanecer
instalado; el entorno virtual se creará explícitamente con 3.12.

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
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version
python -m pip install -r requirements.txt
```

Estos comandos se ejecutan desde `backend/`, donde está `manage.py`.
`python --version` debe mostrar `3.12.x` después de activar el entorno. Solo
si todavía no existe `backend/.env`, créalo con:

```powershell
Copy-Item .env.example .env
```

Edita **`backend/.env`**, no `.env.example`: establece una `SECRET_KEY` propia
y reemplaza `TU_CONTRASENA` en `DATABASE_URL` por la contraseña del usuario
MySQL. La dirección tiene esta estructura:

```text
mysql://USUARIO_MYSQL:CONTRASENA@SERVIDOR:PUERTO/NOMBRE_BASE
```

En el ejemplo del proyecto, `pardos_app` es el usuario de MySQL,
`pardos_chicken_db` es el nombre de la base, `localhost` es la computadora
actual y `3306` es el puerto. Si creaste otros nombres o usas otro puerto,
ajusta esos valores. La cuenta de MySQL no es la cuenta para iniciar sesión
como cajero o administrador. Mantén las contraseñas solo en `.env`: este
archivo está excluido de Git, mientras que `.env.example` es una plantilla
compartida que debe conservar `TU_CONTRASENA`.

Antes de migrar, comprueba a qué base apunta Django sin mostrar la contraseña:

```powershell
python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['ENGINE']); print(settings.DATABASES['default']['NAME'])"
```

Debe mostrar `django.db.backends.mysql` y el nombre de tu base. Si muestra
`django.db.backends.sqlite3`, revisa que el archivo se llame exactamente
`backend/.env` y que `DATABASE_URL` esté configurada allí: Django usa SQLite
por defecto cuando falta esa variable.

### Ejecutar migraciones e importar datos iniciales

Cada integrante usa su propia base de datos local. Aunque todas se llamen
`pardos_chicken_db`, `localhost` apunta a una computadora diferente en cada
caso. El repositorio no incluye un volcado SQL, clientes, pedidos anteriores,
usuarios, productos agregados manualmente ni contraseñas. Las migraciones
crean o actualizan las tablas, pero no copian esos registros entre compañeros:

```powershell
python manage.py migrate
```

`No migrations to apply` indica que esa base ya está actualizada. Cambiar o
recrear el entorno virtual no borra los datos de MySQL. Para una **base nueva**,
carga los cuatro productos de ejemplo, sus insumos y recetas de prueba, y
crea una cuenta administradora:

```powershell
python manage.py loaddata apps/pedidos/fixtures/productos_demo.json
python manage.py loaddata apps/pedidos/fixtures/insumos_demo.json
python manage.py createsuperuser
```

Estas cargas de ejemplo y `createsuperuser` están pensados para una base nueva.
En una base existente, ejecuta `migrate` y añade solo los datos que falten
desde el administrador; repetir las fixtures puede restablecer el stock de
prueba. Abrir un volcado SQL en MySQL Workbench tampoco importa datos por sí
solo; ejecutar uno que contenga `DROP TABLE` puede reemplazar tablas existentes.

### Crear usuarios para cada rol

`createsuperuser` crea una cuenta de administración **en tu base local**. Con
el backend en ejecución, entra a `http://127.0.0.1:8000/admin/` con esa cuenta.
En **Usuarios → Añadir usuario**, asigna un nombre de usuario y una contraseña;
selecciona el **Rol del sistema** (por ejemplo, **Personal de caja**,
**Personal de cocina** o **Personal de despacho**) y guarda. Las cuentas
operativas no necesitan permisos de *staff* ni de superusuario para usar
su pantalla del frontend.

Si Django avisa que el nombre de usuario ya existe, elige otro. Usa una
contraseña distinta del nombre de usuario para que supere la validación.

Cada compañero repite estos pasos en su propia computadora y elige sus propias
credenciales. El usuario MySQL `pardos_app` solo conecta Django a la base;
no sirve para iniciar sesión en la aplicación. No compartas contraseñas ni
subas archivos `.env` o bases de datos al repositorio.

### Ejecutar el backend

```powershell
python manage.py runserver
```

La API queda en `http://127.0.0.1:8000/api/` y su documentación en
`http://127.0.0.1:8000/api/docs/`. Deja esta terminal abierta mientras usas
la aplicación.

### Ejecutar el frontend

En **otra terminal**, desde `pardos-chicken/`:

```powershell
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. El archivo `.env.example`
apunta a `http://127.0.0.1:8000/api` mediante `VITE_API_URL`. `npm install`
descarga Vite y las demás dependencias; ejecútalo la primera vez y cuando
cambien las dependencias del frontend. Si necesitas configurar la dirección de
la API y aún no existe `frontend/.env`, crea ese archivo con
`Copy-Item .env.example .env` desde `frontend/`.

### Inicio de sesión

En la pantalla inicial, ingresa con uno de los usuarios creados. El
superusuario entra como administrador; un usuario con rol **Personal de caja**
entra a Caja, uno con **Personal de cocina** a Cocina y uno con **Personal de
despacho** a Despacho. React solicita el token a `POST /api/token/`;
no hace falta generarlo ni guardarlo manualmente.

## Ejecutar las pruebas automatizadas

### Backend (pytest)

Con el entorno virtual activo y desde `backend/`, la ejecución habitual usa la
configuración de base de datos del backend y requiere los permisos de MySQL para
la base de pruebas indicados arriba:

```powershell
python -m pytest
```

Para ejecutar las pruebas de pedidos y usuarios verificadas en este proyecto
sin conectarse a MySQL ni modificar la base habitual, abre una **terminal
exclusiva para pruebas** en `backend/` y usa SQLite en memoria:

```powershell
$env:DATABASE_URL = 'sqlite:///:memory:'
$env:PYTHONDONTWRITEBYTECODE = '1'
.\.venv\Scripts\python.exe -m pytest apps/pedidos/tests apps/usuarios/test_usuario_actual.py -q -o addopts= -p no:cacheprovider
```

Este comando terminó con **142 pruebas aprobadas** en la verificación del
capítulo 9. El número puede variar si se agregan o modifican pruebas.

### Frontend (Vitest)

En otra terminal, desde `frontend/`, con `npm install` ya ejecutado:

```powershell
npm run test -- --run
```

Este comando terminó con **3 pruebas aprobadas** para los formatos compartidos
de fecha en la misma verificación. `--run` ejecuta las pruebas una vez y sale.

## Problemas frecuentes

- **`manage.py` no se encuentra:** entra a `pardos-chicken/backend/` antes de
  ejecutar `python manage.py ...`.
- **Error de conexión a MySQL:** verifica que el servidor esté activo y que
  `DATABASE_URL` en `backend/.env` coincida con el usuario, contraseña y base.
- **Las migraciones fueron a SQLite:** comprueba el motor con el comando de
  arriba. Configura `backend/.env` y ejecuta `migrate` de nuevo para MySQL.
- **`No migrations to apply`:** esa base ya tiene las migraciones aplicadas;
  todavía puede necesitar datos iniciales o usuarios.
- **No aparecen clientes o productos de otro compañero:** cada `localhost`
  corresponde a su propia base. Migrar no copia datos; registra los datos
  necesarios en esta instalación o planifica una copia de datos por separado.
- **Catálogo vacío:** carga `apps/pedidos/fixtures/productos_demo.json` después
  de ejecutar las migraciones solo si la base es nueva.
- **`vite` no se reconoce:** desde `frontend/`, ejecuta `npm install` y después
  `npm run dev`.
- **`npm install` muestra avisos de `npm audit`:** la instalación puede haber
  terminado correctamente; comprueba si `npm run dev` inicia Vite. Revisa las
  actualizaciones de dependencias por separado antes de aplicar cambios
  automáticos que puedan afectar el proyecto.
- **El frontend no conecta con la API:** comprueba que Django esté ejecutándose
  y que `VITE_API_URL` en `frontend/.env` apunte a su dirección.
- **Inicio de sesión rechazado (`401`):** verifica el usuario y la contraseña
  creados en *esta* base MySQL. Las cuentas de otra computadora no se comparten
  por Git. Para crear una cuenta administradora usa `createsuperuser`; si el
  nombre ya existe y es tu cuenta local, puedes usar
  `python manage.py changepassword NOMBRE_USUARIO`.
- **Error al abrir “Añadir usuario” en Django Admin con Python 3.14:** crea un
  entorno virtual nuevo con Python 3.12, instala de nuevo `requirements.txt`
  y reinicia el backend. Los datos de MySQL permanecen en la base.

## Estado actual y límites conocidos

Los cuatro incrementos descritos arriba están integrados. Despacho aplica las
reglas de Salón, Recojo y Delivery según la modalidad del pedido; el código
actual **no implementa clases Strategy** por modalidad. Los reportes ya están
conectados a datos reales, aunque la pantalla **Administrador → Resumen** aún
usa cifras de ejemplo. El flujo de devoluciones y el registro independiente de
*cada* cambio de estado siguen fuera del alcance implementado.
