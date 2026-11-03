# Design

## Context

Hoy el backend solo tiene la entidad usuario y sus tokens. Sigue estas convenciones:

- **Esquema generado:** `database/schema.ts` se regenera desde las migraciones y los modelos extienden la clase generada.
- **Respuestas:** todas pasan por `serialize()` con un transformer y se envuelven en `{ data }`.
- **Validación:** VineJS 4, con `vine.create`.
- **Rutas:** se declaran con el registro generado `#generated/controllers`.

En el frontend, `lib/api.ts` es el único punto de contacto con la API: traduce los errores a `ApiError` en castellano. Las pantallas de login y registro siguen este patrón:

- una página en `pages/`;
- el hook `useAuthForm` para el estado de envío y el reparto de errores por campo;
- los componentes `Card`, `Input`, `Button`, `Alert` y `Label` de `components/ui/`;
- guards de ruta en `routes/`.

La motivación y el alcance están en `proposal.md`, y el comportamiento exigido en `specs/tasks/spec.md` y `specs/auth/spec.md`.

## Goals / Non-Goals

**Goals:**

- Añadir la entidad tarea respetando las convenciones del backend: migración, esquema regenerado, modelo sin columnas declaradas y transformer propio.
- Que la representación de la tarea no pueda filtrar datos de cuenta del responsable por accidente.
- Reutilizar en la interfaz los componentes, el cliente de API y el hook de formulario existentes, sin dependencias nuevas.

**Non-Goals:**

- Paginación, ordenación, filtros, refresco en tiempo real e interfaz para reasignar.
- Gestionar globalmente un 401 a mitad de sesión.
- Tests: este change no los incluye por decisión explícita.

## Decisions

### D1. Estado como enumeración cerrada definida una sola vez

- **Backend:** una constante `TASK_STATUSES = ['pending', 'in_progress', 'done'] as const` y su tipo `TaskStatus`, en un módulo propio, `app/models/task_status.ts`, que no importa nada del esquema generado. De ella salen:
  - la columna, con `table.enum('status', TASK_STATUSES)`, que en SQLite crea un `CHECK` como segunda barrera;
  - el validador, con `vine.enum(TASK_STATUSES)`;
  - el tipo del atributo `status` en el modelo.
- **Por qué un módulo propio:** la migración no puede importar el modelo. El modelo extiende `TaskSchema`, que solo existe en `database/schema.ts` después de correr la migración, así que importarlo rompería la primera `migration:run`.
- **Tipo generado:** Lucid probablemente genera `status: string` para la columna enum. Si es así, el modelo redeclara `declare status: TaskStatus` en lugar de tocar `schema.ts` o `schema_rules.ts`.
- **Frontend:** un tipo `TaskStatus` y un mapa `TASK_STATUS_LABELS` (`pending → Pendiente`, `in_progress → En curso`, `done → Hecho`). El mapa alimenta tanto la fila como las opciones del control, para que no puedan divergir.
- **Alternativa descartada:** tabla de estados. Va contra «no se pueden añadir ni renombrar estados» y añade una consulta sin ningún valor.

### D2. Tabla `tasks`

| Columna | Definición |
|---|---|
| `id` | autoincremental |
| `title` | `string(255)`, no nulo |
| `status` | enum anterior, no nulo, por defecto `pending` |
| `assignee_id` | entero no nulo, FK a `users.id` con índice |
| `created_at`, `updated_at` | marcas de tiempo |

Decisiones sobre las columnas:

- **Sin columna de vencimiento**, ni nullable ni «para luego».
- **FK sin `ON DELETE CASCADE`:** no existe borrado de usuarios, y en cascada se perderían tareas en silencio el día que exista.
- **Sin campo «creador».** La spec solo exige responsable. El creador se pierde al reasignar, y es aceptable porque ningún requisito lo pide.

### D3. Validadores

- **Creación:** `title: vine.string().trim().minLength(1).maxLength(255)`.
  - El `trim` va primero, así que tanto el blanco como el límite se evalúan sobre el texto recortado.
  - Un título solo con espacios falla en `minLength`; uno ausente falla en `required`. Basta con que el error recaiga en `title`.
- **Actualización:** `status: vine.enum(TASK_STATUSES).optional()` y `assigneeId: vine.number().exists({ table: 'users', column: 'id' }).optional()`.
- **`null` y cadena vacía:** el bodyparser tiene `convertEmptyStringsToNull: true`, así que `""` llega como `null`. Si `optional()` de VineJS 4 trata `null` como ausente (hay que comprobarlo en sus `.d.ts`), `status: null` o `assigneeId: null` darían 200 sin cambios. Para evitarlo, se usa la variante que solo admite `undefined`; si no existe, el controlador rechaza la presencia explícita de `null` con 422 sobre ese campo. La spec lo exige.
- **Campos ignorados:** VineJS solo devuelve las claves declaradas. Por eso `status`, `assigneeId` o `dueDate` al crear, y `title` al actualizar, se ignoran sin código adicional.
- **Actualización vacía:** sin ningún campo, devuelve la tarea sin cambios (200). No se exige «al menos uno», porque no aporta comportamiento observable útil.
- **Verificar en el arranque de la implementación:** antes de asumir la firma de `.exists` y `vine.enum` en VineJS 4, mirar los `.d.ts` de `node_modules/@vinejs/vine`. Si `.exists` no existe con esa forma, comprobar la existencia en el controlador y lanzar un error de validación con 422, `field: 'assigneeId'` y `rule: 'database.exists'`.
- **Unidad de «caracteres»:** `maxLength` cuenta unidades UTF-16 (`String.length`), igual que el `maxLength` de la columna en la práctica. Un título con emojis llega antes al límite. Se acepta: la spec fija sus ejemplos en texto sin emojis.

### D4. Controlador y rutas

Un controlador de tareas con `index`, `store` y `update`, en un grupo `/api/v1/tasks` con `middleware.auth()`. Son tres rutas explícitas, no `router.resource`, para que no aparezcan por error `show` ni `destroy`:

- `GET /api/v1/tasks`;
- `POST /api/v1/tasks`;
- `PATCH /api/v1/tasks/:id`, con el matcher numérico en `:id`, de modo que un id no numérico da 404 de ruta.

Comportamiento de cada acción:

- **`index`:** `Task.query().preload('assignee')` **sin `orderBy`**. El orden queda abierto (PA-3) y no se inventa uno.
- **`store`:** crea la tarea con `status: 'pending'` y `assigneeId: auth.user.id`, carga el responsable y responde con `response.status(201)`.
- **`update`:** usa `Task.findOrFail(params.id)`, cuyo «no encontrado» se traduce en 404. Aplica `merge` con lo validado, guarda, recarga el responsable y responde con 200.

Al terminar, se regeneran los ficheros de `.adonisjs/` (registro de controladores y Tuyau) arrancando el servidor, y se commitean.

### D5. Transformer de tarea con responsable recortado

`TaskTransformer` devuelve `id`, `title`, `status`, `createdAt`, `updatedAt` y `assignee: { id, fullName }`, construido a mano desde la relación precargada. **No reutiliza `UserTransformer`**, que expone el email y las iniciales. Así, añadir un campo al perfil nunca lo filtra a la lista. Es la «nota para quien la implemente» de E3-1.

### D6. Cliente de API y traducción de errores

- **Funciones nuevas en `lib/api.ts`:** `listTasks(token)`, `createTask(token, { title })` y `updateTask(token, id, { status })`. El tipo de método de `request` admite `PATCH`.
- **Traducción:** `FIELD_LABELS` incorpora `title` («el título»), `status` («el estado») y `assigneeId` («el responsable»), y `translate` trata `title` aparte:
  - `maxLength` se traduce como «El título no puede superar los 255 caracteres.»;
  - cualquier otra regla, como «Escribe un título para la tarea.»;
  - `status` inválido muestra el texto genérico «Revisa el estado.».
- **Tipos nuevos:** `Task`, `TaskAssignee` y `TaskStatus` en `lib/types.ts`.

### D7. Pantalla de tareas

Una página nueva en `pages/`, con un layout de una columna dentro de una `Card`.

**Formulario de creación**

- Un `Input` para el título y un `Button` con el texto «Crear tarea» (o «Creando…» durante el envío).
- Reutiliza `useAuthForm(['title'])` para el estado de envío y los errores por campo, aunque su nombre diga «auth», porque su lógica es genérica. Renombrarlo queda fuera del change.
- Comprobación local: un título vacío o en blanco se rechaza con `failWith('title', …)` sin hacer la petición, igual que el registro con las contraseñas.
- Al crear con éxito, se **añade al final del estado local** la tarea devuelta y se vacía el campo.
  - No se vuelve a pedir la lista, para no reordenar lo que la persona ya ve.
  - Añadir al final no es un criterio de orden: es dejar lo que había donde estaba.

**Lista**

- Se carga al montar la pantalla, ignorando la respuesta si la pantalla ya se ha desmontado. Hay tres estados: cargando, con un spinner inline (no `FullScreenLoader`, cuyo `min-h-svh` empujaría el contenido bajo la cabecera); error, con un `Alert` destructivo y el mensaje de `ApiError`; y lista.
- Con la lista vacía se muestra el texto explicativo e invita a crear la primera tarea con el formulario de arriba.
- Cada fila muestra el título, `assignee.fullName?.trim() || 'Sin nombre'` y el control de estado. El `trim` es necesario porque la API de registro admite un nombre formado solo por espacios.

**Control de estado**

- Es un `<select>` nativo con las clases visuales del `Input` existente. No hay componente `select` en `components/ui/`, y `npx shadcn add select` añadiría Radix como dependencia, lo que el alcance prohíbe.
- Ofrece exactamente las tres opciones del mapa de D1.
- El cambio es optimista: se actualiza la fila al instante y se envía la petición. Si falla, se restaura el estado anterior de esa fila y se muestra un `Alert` con el mensaje.
- Mientras su petición está en curso, el select de esa fila queda deshabilitado para evitar carreras dentro de la misma fila.

### D8. Navegación y rutas

- Nuevo componente de layout para las pantallas protegidas: una cabecera con «FlowSync» y dos `NavLink`, «Tareas» (`/tasks`) y «Perfil» (`/profile`), con un `<Outlet />` debajo.
- Se monta como ruta de layout dentro de `ProtectedRoute`, envolviendo `/tasks` y `/profile`.
- La página de perfil pierde su `min-h-svh` de pantalla completa, porque pasa a vivir debajo de la cabecera. Su contenido no cambia.
- `PublicOnlyRoute` redirige a `/tasks`, y la ruta comodín también.

## Risks / Trade-offs

- **[Sin orden explícito, SQLite devuelve en orden físico]** Hoy coincide con el de inserción, pero no está garantizado y puede cambiar con otra base de datos. → Es la decisión pedida (PA-3 abierto). Queda anotada en el proposal, y la interfaz no reordena.
- **[Escrituras concurrentes: gana la última]** Dos personas cambiando el estado de la misma tarea se pisan sin aviso. → Aceptable para el MVP; el refresco y la detección de conflictos pertenecen a E3-2 y PA-8.
- **[Actualización optimista sobre datos viejos]** La fila puede mostrar un estado que otra persona ya cambió. → La respuesta del servidor sustituye la fila por la tarea devuelta, así que al menos se corrige con el propio cambio.
- **[401 en mitad de la sesión]** Una llamada de tareas con el token revocado muestra «Tu sesión ha caducado…», pero no cierra la sesión local. → Es el mismo hueco que ya tiene `auth`; queda como punto abierto en el proposal.
- **[Sin paginación]** RNF-5 habla de unas 200 tareas, un volumen trivial para una sola respuesta. → No se pagina.
- **[Sin tests]** Las regresiones no se detectan solas. → La verificación de cada tarea en `tasks.md` es manual o por comando (typecheck, lint, build, peticiones con curl).

## Migration Plan

1. `node ace migration:run` crea la tabla `tasks` y regenera `database/schema.ts`. No toca datos existentes.
2. Rollback: `node ace migration:rollback` elimina la tabla y deshace la regeneración del esquema. El frontend anterior no llama a `/tasks`, así que revertir el código es independiente.
