# Tasks

## 1. Modelo de datos (backend)

- [ ] 1.0 Crear `app/models/task_status.ts` con `TASK_STATUSES` y el tipo `TaskStatus`, sin importar nada del esquema generado (D1). Verificar con `npm run typecheck`.
- [ ] 1.1 Crear la migración de la tabla `tasks` según D2 (`title` string(255), `status` enum de `TASK_STATUSES`, importado de `#models/task_status` y nunca de `#models/task`, con valor por defecto `pending`, `assignee_id` como FK a `users` con índice, timestamps y sin columna de vencimiento), ejecutar `node ace migration:run` y verificar que `database/schema.ts` incluye `TaskSchema` con esas columnas y sin fecha de vencimiento.
- [ ] 1.2 Crear el modelo `Task` extendiendo `TaskSchema`, con la relación `belongsTo` `assignee` hacia `User` (`foreignKey: 'assigneeId'`) y `status` tipado como `TaskStatus` si el esquema generado lo deja en `string`, y verificar con `npm run typecheck`.

## 2. API de tareas (backend)

- [ ] 2.1 Comprobar en los `.d.ts` de `@vinejs/vine` las firmas de `vine.enum` y `.exists`, y si `optional()` acepta `null`. Crear los validadores de creación y actualización de D3, rechazando `null` explícito en `status` y en `assigneeId`. Verificar con `npm run typecheck`.
- [ ] 2.2 Crear `TaskTransformer` con `id`, `title`, `status`, `createdAt`, `updatedAt` y `assignee: { id, fullName }`, sin reutilizar `UserTransformer`, y verificar con `npm run typecheck`.
- [ ] 2.3 Crear el controlador de tareas con `index` (precarga el responsable, sin `orderBy`), `store` (201, `pending`, responsable igual a quien crea) y `update` (`findOrFail`, `merge`, 200), y verificar con `npm run typecheck`.
- [ ] 2.4 Registrar en `start/routes.ts` las tres rutas explícitas bajo `/api/v1/tasks` con `middleware.auth()` y el matcher numérico en `:id`. Arrancar `npm run dev` y verificar dos cosas:
  - `node ace list:routes` muestra exactamente `GET /api/v1/tasks`, `POST /api/v1/tasks` y `PATCH /api/v1/tasks/:id`;
  - los ficheros regenerados de `.adonisjs/` reflejan el nuevo controlador.
- [ ] 2.5 Antes de verificar, copiar `backend/tmp/db.sqlite3` a una copia de seguridad: no existe borrado de tareas, y las pruebas ensuciarían la BD compartida con el servidor de desarrollo. Con la tabla aún vacía, verificar primero «Lista vacía» (`{ data: [] }`). Después, con dos cuentas de prueba (una de ellas sin nombre), verificar con curl los escenarios de la spec delta `tasks`:
  - **Lista compartida:** las dos cuentas reciben el mismo conjunto, la tarea de una aparece a la otra, y pedir la lista varias veces no cambia ningún `updatedAt`.
  - **Creación:** 201 con `pending` y el creador como responsable; se ignoran `status`, `assigneeId` y `dueDate` enviados en el cuerpo; un título con espacios en los extremos se guarda recortado.
  - **Título:** 422 si falta o está en blanco; 422 con `maxLength` si tiene 256 caracteres; se acepta con 255.
  - **Estado:** 422 con `blocked`, con `Hecho`, con `""` y con `null`; el paso de `done` a `pending` funciona; un `title` enviado en la actualización no cambia el título.
  - **Responsable:** se puede reasignar a otra cuenta sin que cambie el estado; 422 si el `assigneeId` no existe o es `null`; la cuenta sin nombre aparece con `assignee.fullName` igual a `null`.
  - **Tareas inexistentes y operaciones que no hay:** 404 al actualizar un id inexistente, y 404 en `GET` y en `DELETE` de `/tasks/:id` con el id de una tarea **existente**, que sigue en la lista.
  - **Sesión:** 401 sin token en las tres operaciones.
  - **Responsable en la respuesta:** nunca incluye el email.
  - Al terminar, restaurar la copia de seguridad de `tmp/db.sqlite3`.
- [ ] 2.6 Ejecutar `npm run lint` y `npm run typecheck` en `backend/` y verificar que terminan sin errores.

## 3. Cliente de API (frontend)

- [ ] 3.1 Añadir a `lib/types.ts` los tipos `TaskStatus`, `TaskAssignee` y `Task`, y un módulo con `TASK_STATUSES` y `TASK_STATUS_LABELS` (Pendiente, En curso, Hecho). Verificar con `npm run build`.
- [ ] 3.2 Añadir a `lib/api.ts` `listTasks`, `createTask` y `updateTask`, admitir `PATCH` en `request` y traducir los errores de `title` según D6. Verificar con `npm run build`.

## 4. Pantallas y navegación (frontend)

- [ ] 4.1 Crear el layout de las pantallas protegidas, con la cabecera y los enlaces «Tareas» y «Perfil» (D8). Montarlo dentro de `ProtectedRoute`, adaptar la página de perfil para que viva debajo de la cabecera, y verificar en el navegador que se navega entre ambas pantallas.
- [ ] 4.2 Crear la página de tareas según D7: carga con indicador y aviso de error, estado vacío explicativo, formulario de solo título con comprobación local de blanco y fila con título, «Sin nombre» como respaldo del responsable y `<select>` nativo de estado con actualización optimista y reversión. Verificar con `npm run build`.
- [ ] 4.3 Registrar la ruta protegida `/tasks` y cambiar a `/tasks` el destino de `PublicOnlyRoute` y de la ruta comodín. Verificar en el navegador cuatro cosas:
  - al iniciar sesión se llega a la lista;
  - `/login` con sesión rebota a la lista;
  - una ruta desconocida lleva a la lista;
  - `/tasks` sin sesión lleva al login.
- [ ] 4.4 Verificar en el navegador los escenarios de interfaz de la spec delta `tasks`, partiendo de nuevo de una copia de seguridad de `tmp/db.sqlite3` y con la tabla de tareas vacía (restaurar la copia al terminar):
  - **Estado vacío:** aparece sin tareas y desaparece tras crear la primera.
  - **Creación:** la tarea aparece sin recargar, en «Pendiente» y con el nombre propio, y el campo se vacía. El botón muestra «Creando…» deshabilitado mientras se envía (con la red ralentizada en las DevTools). El formulario solo tiene el campo título, sin ningún control ni texto sobre responsable, estado o fecha.
  - **Servidor caído al crear:** con el backend parado aparece el aviso de conexión y el título escrito se conserva.
  - **Errores del título:** con el título en blanco o demasiado largo se ve el mensaje junto al campo y lo escrito se conserva.
  - **Cambio de estado:** el control ofrece solo «Pendiente», «En curso» y «Hecho». El cambio se refleja al instante, sin diálogo, también en tareas ajenas, y persiste al recargar. Si falla con el backend parado, la fila vuelve al estado anterior y aparece un aviso.
  - **Lista sin fechas, correos ni presencia:** ninguna fila muestra fechas ni indicadores de conexión. Una cuenta sin nombre, o con un nombre formado solo por espacios creado vía API, aparece como «Sin nombre», nunca como su correo. La navegación solo ofrece «Tareas» y «Perfil», sin otra vista de tareas.
  - **Sesión revocada:** tras revocar el token con un logout por curl, cargar la lista muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.».
  - **Servidor caído al abrir la lista:** se muestra el aviso de conexión, no el estado vacío.
- [ ] 4.5 Ejecutar `npm run lint` y `npm run build` en `frontend/` y verificar que terminan sin errores.

## Workflow follow-up

- Abrir el PR del change con la descripción completa y pasar el subagente `adversarial-reviewer` sobre él, según las reglas del proyecto.
- Archivar el change con `/opsx:archive` cuando esté implementado y revisado, para fusionar los deltas `tasks` y `auth` en `openspec/specs/`.
