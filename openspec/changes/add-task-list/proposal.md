# Proposal

## Why

FlowSync todavía no tiene tareas: hoy solo existen las cuentas y el acceso. Sin una lista compartida donde se creen tareas y se mantenga su estado, el producto no puede responder a la pregunta para la que existe, «quién está en qué». Este change entrega la base de la gestión de tareas: las historias E3-1 (lista compartida), E2-1 (crear con solo el título), E2-2 (título obligatorio), E2-3 (nace mía y pendiente) y E2-4 (cambiar el estado desde la lista).

## What Changes

- Nueva entidad **tarea**, con título, estado y responsable. **No tiene fecha de vencimiento** y no queda nada preparado para tenerla.
- El estado es un conjunto cerrado de tres valores, que viajan por la API como `pending`, `in_progress` y `done` y se muestran como «Pendiente», «En curso» y «Hecho». Cualquier otro valor se rechaza con 422.
- La API tiene **exactamente tres operaciones**, todas con autenticación:
  - listar todas las tareas;
  - crear una;
  - actualizar una (estado y/o responsable).

  No hay lectura individual de una tarea, ni borrado, ni endpoints de equipo.
- Al crear una tarea, el título es el único dato que se acepta:
  - es obligatorio;
  - se recorta;
  - se rechaza si queda en blanco;
  - se rechaza (sin recortarlo) si pasa de 255 caracteres.

  La tarea nace en `pending` y con quien la crea como responsable.
- Hay una única lista, compartida por todo el equipo. No hay tareas privadas ni vista de «mis tareas». Cualquier persona registrada puede cambiar el estado y el responsable de cualquier tarea.
- Del responsable, la API solo expone el identificador y el nombre, nunca el correo.
- Las transiciones de estado son libres entre los tres valores, incluida la vuelta atrás desde «Hecho».
- Nueva pantalla protegida **Tareas** en la interfaz:
  - un formulario con un único campo de título;
  - la lista con el título, el nombre del responsable («Sin nombre» si no tiene) y un control para cambiar el estado desde la propia fila;
  - un estado vacío que explica la pantalla e invita a crear la primera tarea.
- La lista de tareas pasa a ser la **pantalla de inicio**:
  - tras iniciar sesión o registrarse;
  - con sesión activa en login o registro;
  - al abrir una ruta desconocida.

  Las pantallas protegidas tienen navegación entre «Tareas» y «Perfil».
- La interfaz reutiliza los componentes existentes y el patrón de páginas y rutas del login. No añade dependencias.
- Este change no incluye tests ni montaje de base de pruebas.

### Fuera de alcance

- La interfaz para cambiar el responsable. La API lo admite, pero no hay endpoint de equipo con el que construir un selector de personas.
- El filtro por estado (RF-20) y ocultar las tareas hechas (RF-21): en este change las tareas en «Hecho» siguen en la lista.
- El refresco automático cuando otra persona cambia algo (E3-2): la lista es correcta en el momento en que se pide.
- Editar el título, ver una tarea individualmente y borrar tareas.

### Puntos abiertos

- **Orden de la lista (PA-3).** No hay regla de orden decidida. La API no ordena de forma explícita y la interfaz muestra las tareas en el orden en que llegan. La promesa de CA-5 de E3-1 («enumerar el trabajo de cada persona») queda débil hasta que se decida orden o agrupación.
- **Transiciones (PA-7).** Se dejan libres entre los tres estados; no hay regla de transiciones legales ni confirmación al marcar «Hecho».
- **Límite del título (PA-9).** Se fija en 255 caracteres como decisión de este change. El umbral de producto sigue pendiente de validar.
- **Selector de responsable.** Hace falta una fuente de personas del equipo, que hoy no existe en la API.
- **Sesión revocada durante el uso.** Si una llamada de la lista recibe un 401, la pantalla muestra el aviso de sesión caducada, pero la sesión local no se cierra sola. Es el mismo hueco que ya tiene la capability `auth`.
- **Límite de tareas «En curso» por persona (PA-4).** Sin decidir; no se limita.

## Capabilities

### New Capabilities

- `tasks`: la lista compartida de tareas del equipo. Cubre la creación con solo el título, los valores por defecto (responsable y estado), los tres estados fijos, la actualización de estado y de responsable, y la pantalla de la lista con su estado vacío.

### Modified Capabilities

- `auth`: el destino tras iniciar sesión o registrarse, el rebote de login y registro con sesión activa y la redirección de rutas desconocidas pasan del perfil a la lista de tareas.

## Impact

- **Backend:**
  - una migración nueva para la tabla de tareas, con una clave foránea al responsable (lo que regenera el esquema);
  - un modelo, un validador, un transformer y un controlador nuevos;
  - tres rutas nuevas bajo `/api/v1/tasks`, protegidas con auth;
  - los ficheros generados de `.adonisjs/` cambian y se commitean.
- **Frontend:**
  - funciones nuevas en el cliente de API y tipos nuevos;
  - una página de tareas, una cabecera de navegación compartida para las pantallas protegidas y una ruta protegida nueva;
  - cambian los destinos por defecto de los guards y de la ruta comodín.
- **Dependencias:** ninguna nueva.
- **Datos:** una tabla nueva en SQLite. No se tocan los usuarios ni los tokens existentes.
