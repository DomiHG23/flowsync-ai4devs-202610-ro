## Purpose

Mantener una única lista de tareas compartida por todo el equipo, en la que cualquiera crea una tarea con solo su título y mantiene al día su estado, para que se pueda ver de un vistazo quién está en qué.

## ADDED Requirements

### Requirement: Listado de la lista compartida

La API SHALL devolver, a cualquier persona autenticada que lo pida con `GET /api/v1/tasks`, todas las tareas existentes en un cuerpo `{ data: [...] }`. El contenido SHALL ser el mismo sea quien sea quien lo pide: no hay tareas privadas ni contenido reservado a ningún rol.

#### Scenario: Dos personas ven lo mismo

- **WHEN** dos personas autenticadas distintas piden la lista sin que nadie la modifique entre medias
- **THEN** ambas reciben estado 200 con exactamente el mismo conjunto de tareas

#### Scenario: Una tarea ajena es visible

- **WHEN** otra persona crea una tarea y después yo pido la lista
- **THEN** esa tarea aparece en mi respuesta, aunque su responsable no sea yo

#### Scenario: Lista vacía

- **WHEN** se pide la lista y no existe ninguna tarea
- **THEN** la respuesta tiene estado 200 y cuerpo `{ data: [] }`

#### Scenario: Pedir la lista no modifica nada

- **WHEN** se pide la lista varias veces seguidas
- **THEN** ninguna tarea cambia de título, estado ni responsable, y su `updatedAt` no varía

### Requirement: Forma de una tarea en la API

La API SHALL representar cada tarea con exactamente `id`, `title`, `status`, `assignee`, `createdAt` y `updatedAt`, donde `assignee` es `{ id, fullName }` del responsable. La API SHALL no exponer el correo ni ningún otro dato de cuenta del responsable, y la tarea SHALL no tener fecha de vencimiento.

#### Scenario: Responsable con nombre

- **WHEN** se lista una tarea cuyo responsable tiene nombre completo "Ada Lovelace"
- **THEN** la tarea incluye `assignee` con su `id` y `fullName` igual a "Ada Lovelace", y no incluye su email

#### Scenario: Responsable sin nombre

- **WHEN** se lista una tarea cuyo responsable no tiene nombre completo
- **THEN** la tarea incluye `assignee.fullName` igual a `null` y sigue sin incluir su email

#### Scenario: Sin fecha de vencimiento

- **WHEN** se lista, se crea o se actualiza una tarea
- **THEN** la representación devuelta no contiene ningún campo de fecha de vencimiento

### Requirement: Creación de una tarea con solo el título

La API SHALL crear una tarea a partir de `POST /api/v1/tasks` con un cuerpo cuyo único dato considerado es `title`, y SHALL responder con estado 201 y la tarea creada en `{ data: task }`. El título se guarda sin los espacios iniciales y finales.

#### Scenario: Creación correcta

- **WHEN** una persona autenticada envía una petición de creación con `title` igual a "Preparar la demo del viernes"
- **THEN** la respuesta tiene estado 201, la tarea devuelta tiene ese título y la tarea aparece al pedir la lista

#### Scenario: Espacios alrededor del título

- **WHEN** se crea una tarea con `title` igual a "  Revisar el PR  "
- **THEN** la tarea queda con el título "Revisar el PR"

### Requirement: Valores por defecto de una tarea nueva

La API SHALL crear toda tarea nueva en estado `pending` y con quien hace la petición como responsable, y SHALL ignorar cualquier estado, responsable o fecha que venga en el cuerpo de creación.

#### Scenario: Nace pendiente y mía

- **WHEN** una persona autenticada crea una tarea indicando solo el título
- **THEN** la tarea devuelta tiene `status` igual a `pending` y `assignee.id` igual al de esa persona

#### Scenario: Se ignoran otros datos al crear

- **WHEN** se crea una tarea enviando, además del título, `status` igual a `done`, un `assigneeId` de otra persona y un `dueDate`
- **THEN** la tarea se crea igualmente en `pending`, con quien la crea como responsable y sin fecha de vencimiento

### Requirement: Título obligatorio

La API SHALL rechazar con estado 422, sin crear ninguna tarea, una petición de creación sin `title`, con `title` vacío o con `title` formado solo por espacios, y SHALL indicar en `{ errors: [...] }` un error sobre el campo `title`.

#### Scenario: Sin título

- **WHEN** se envía una petición de creación sin el campo `title`
- **THEN** la respuesta tiene estado 422 con un error sobre el campo `title`, y la lista no cambia

#### Scenario: Título en blanco

- **WHEN** se envía una petición de creación con `title` igual a "   "
- **THEN** la respuesta tiene estado 422 con un error sobre el campo `title`, y en la lista no aparece ninguna tarea sin texto

### Requirement: Límite de longitud del título

La API SHALL aceptar títulos de hasta 255 caracteres (una vez quitados los espacios de los extremos) y SHALL rechazar con estado 422 los más largos, con un error sobre el campo `title` y la regla `maxLength`, sin guardar nunca una versión recortada.

#### Scenario: Título en el límite

- **WHEN** se crea una tarea con un título de exactamente 255 caracteres
- **THEN** la tarea se crea con el título completo

#### Scenario: Título demasiado largo

- **WHEN** se intenta crear una tarea con un título de 256 caracteres
- **THEN** la respuesta tiene estado 422 con un error sobre `title` con la regla `maxLength`, y no se crea ninguna tarea, ni completa ni recortada

### Requirement: Tres estados fijos

Una tarea SHALL estar siempre en exactamente uno de los estados `pending`, `in_progress` o `done`. La API SHALL rechazar con estado 422, con un error sobre el campo `status`, cualquier otro valor, y SHALL no ofrecer ninguna forma de añadir, renombrar ni eliminar estados.

#### Scenario: Valor de estado desconocido

- **WHEN** se intenta actualizar una tarea con `status` igual a `blocked`
- **THEN** la respuesta tiene estado 422 con un error sobre el campo `status`, y la tarea conserva su estado anterior

#### Scenario: Valor en castellano

- **WHEN** se intenta actualizar una tarea con `status` igual a `Hecho`
- **THEN** la respuesta tiene estado 422 con un error sobre el campo `status`

### Requirement: Cambio de estado de cualquier tarea

La API SHALL permitir, con `PATCH /api/v1/tasks/:id` y un `status` válido, cambiar el estado de cualquier tarea a cualquiera de los tres estados, sea quien sea su responsable y sea cual sea su estado actual, y SHALL responder con estado 200 y la tarea actualizada en `{ data: task }`.

#### Scenario: Tarea propia a en curso

- **WHEN** el responsable de una tarea pendiente la actualiza con `status` igual a `in_progress`
- **THEN** la respuesta tiene estado 200 y la tarea devuelta y la de la lista están en `in_progress`

#### Scenario: Tarea de otra persona

- **WHEN** una persona actualiza el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual que en una tarea propia, con estado 200, y el responsable no cambia

#### Scenario: Volver atrás desde hecho

- **WHEN** se actualiza una tarea en `done` con `status` igual a `pending`
- **THEN** la respuesta tiene estado 200 y la tarea queda en `pending`

### Requirement: Cambio de responsable de cualquier tarea

La API SHALL permitir, con `PATCH /api/v1/tasks/:id` y un `assigneeId`, asignar cualquier tarea a cualquier cuenta existente, y SHALL rechazar con estado 422, con un error sobre el campo `assigneeId`, un identificador que no corresponda a ninguna cuenta. Estado y responsable SHALL poder cambiarse por separado o en la misma petición.

#### Scenario: Reasignar una tarea

- **WHEN** se actualiza una tarea con el `assigneeId` de otra cuenta existente
- **THEN** la respuesta tiene estado 200 y la tarea devuelta tiene como `assignee` a esa cuenta, con su estado sin cambios

#### Scenario: Responsable inexistente

- **WHEN** se actualiza una tarea con un `assigneeId` que no pertenece a ninguna cuenta
- **THEN** la respuesta tiene estado 422 con un error sobre `assigneeId`, y la tarea no cambia

#### Scenario: El título no se edita

- **WHEN** se envía una actualización que incluye un `title` nuevo
- **THEN** el título de la tarea no cambia

### Requirement: Actualización de una tarea inexistente

La API SHALL responder con estado 404 a una actualización dirigida a un identificador de tarea que no existe.

#### Scenario: Identificador desconocido

- **WHEN** se envía `PATCH /api/v1/tasks/999999` con un `status` válido y no existe esa tarea
- **THEN** la respuesta tiene estado 404 y no se crea ninguna tarea

### Requirement: Solo tres operaciones sobre tareas

La API SHALL exponer exactamente tres operaciones sobre tareas: listar, crear y actualizar. No SHALL existir lectura individual de una tarea, borrado ni ninguna operación sobre equipos.

#### Scenario: No hay lectura individual

- **WHEN** se pide `GET /api/v1/tasks/:id` de una tarea existente
- **THEN** la respuesta tiene estado 404

#### Scenario: No hay borrado

- **WHEN** se envía `DELETE /api/v1/tasks/:id` de una tarea existente
- **THEN** la respuesta tiene estado 404 y la tarea sigue apareciendo en la lista

### Requirement: Las operaciones de tareas exigen sesión

La API SHALL responder con estado 401 a cualquier petición de listar, crear o actualizar tareas que no traiga un token de acceso válido, sin revelar ni modificar ninguna tarea.

#### Scenario: Listar sin token

- **WHEN** se pide la lista de tareas sin cabecera `Authorization`
- **THEN** la respuesta tiene estado 401 y no contiene tareas

#### Scenario: Crear sin token

- **WHEN** se intenta crear una tarea sin token válido
- **THEN** la respuesta tiene estado 401 y no se crea ninguna tarea

### Requirement: Pantalla de la lista de tareas

La aplicación web SHALL ofrecer, solo a personas con sesión iniciada, una pantalla «Tareas» que muestra todas las tareas. Cada fila enseña, sin abrir nada, el título, el nombre del responsable y el estado, este último como «Pendiente», «En curso» o «Hecho». La pantalla SHALL no mostrar fechas, marcas de vencida ni señales de quién está conectado.

#### Scenario: Sin sesión no se ve ninguna tarea

- **WHEN** una persona sin sesión abre la dirección de la lista de tareas
- **THEN** es redirigida a la pantalla de inicio de sesión sin llegar a ver ninguna tarea

#### Scenario: Cada fila responde quién está en qué

- **WHEN** una persona con sesión abre la lista y hay una tarea "Preparar la demo" en `in_progress` cuyo responsable es "Ada Lovelace"
- **THEN** ve en una misma fila "Preparar la demo", "Ada Lovelace" y «En curso»

#### Scenario: Responsable sin nombre

- **WHEN** la lista contiene una tarea cuyo responsable no tiene nombre completo
- **THEN** en el lugar del responsable se ve «Sin nombre», y nunca su correo ni su identificador

#### Scenario: Sin fechas en la lista

- **WHEN** una persona recorre la lista
- **THEN** ninguna fila muestra fechas ni marcas de vencimiento

#### Scenario: Una sola lista para todos

- **WHEN** una persona busca en la aplicación otras vistas de tareas
- **THEN** no existe ninguna vista «mis tareas» ni otra lista aparte de la del equipo

### Requirement: Estado vacío de la lista

La aplicación web SHALL mostrar, cuando no existe ninguna tarea, un mensaje que explica que esta es la lista compartida del equipo y que invita a crear la primera tarea con el formulario de la propia pantalla, en lugar de una lista vacía sin más.

#### Scenario: Espacio sin tareas

- **WHEN** una persona con sesión abre la lista y no existe ninguna tarea
- **THEN** ve un mensaje que explica la lista compartida y la invita a crear la primera tarea, junto al formulario de creación

#### Scenario: Primera tarea creada

- **WHEN** desde el estado vacío la persona crea su primera tarea
- **THEN** el mensaje de lista vacía desaparece y en su lugar se ve la tarea

### Requirement: Creación de tareas desde la lista

La aplicación web SHALL ofrecer en la pantalla de la lista un formulario con un único campo de título y un botón «Crear tarea», sin pedir ni sugerir responsable, estado, fecha ni ningún otro dato. Al crearla, la tarea SHALL aparecer en la lista sin recargar ni navegar, y el campo SHALL quedar vacío.

#### Scenario: Crear con solo el título

- **WHEN** una persona escribe "Llamar al proveedor" y pulsa «Crear tarea»
- **THEN** sin recargar ni salir de la pantalla ve en la lista la tarea "Llamar al proveedor" con su propio nombre como responsable y en «Pendiente», y el campo de título queda vacío

#### Scenario: El formulario solo pide el título

- **WHEN** una persona recorre el formulario de creación
- **THEN** el único campo que existe es el título, y no hay ningún control ni texto que proponga responsable, estado o fecha

#### Scenario: Botón bloqueado durante el envío

- **WHEN** la persona pulsa «Crear tarea» y la petición aún no ha terminado
- **THEN** el botón aparece deshabilitado con el texto «Creando…» y no puede crear una segunda tarea con el mismo envío

### Requirement: Errores al crear una tarea en la web

La aplicación web SHALL explicar en castellano, junto al propio campo de título, por qué no se ha podido crear una tarea, y SHALL conservar lo escrito para que se pueda corregir.

#### Scenario: Título vacío o en blanco

- **WHEN** la persona pulsa «Crear tarea» con el campo vacío o con solo espacios
- **THEN** ve junto al campo el mensaje «Escribe un título para la tarea.» y no se crea ninguna tarea

#### Scenario: Título demasiado largo

- **WHEN** la persona intenta crear una tarea con un título de más de 255 caracteres
- **THEN** ve junto al campo el mensaje «El título no puede superar los 255 caracteres.», el texto escrito sigue en el campo y no se crea ninguna tarea

#### Scenario: Servidor inaccesible al crear

- **WHEN** la persona intenta crear una tarea y el servidor no responde
- **THEN** ve el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y el título escrito se conserva

### Requirement: Cambio de estado desde la fila

La aplicación web SHALL permitir cambiar el estado de cualquier tarea desde su propia fila con un control que ofrece exactamente «Pendiente», «En curso» y «Hecho», sin abrir la tarea, sin diálogo de confirmación ni advertencias, y sin rellenar ningún otro campo. El nuevo estado SHALL verse en la fila de inmediato.

#### Scenario: Cambiar el estado de una tarea

- **WHEN** una persona elige «En curso» en el control de estado de una tarea pendiente
- **THEN** la fila muestra «En curso» de inmediato, sin que aparezca ningún diálogo, y tras recargar la tarea sigue en «En curso»

#### Scenario: Tarea de otra persona desde la web

- **WHEN** una persona cambia el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual que en una tarea propia, sin advertencias ni permisos adicionales, y el responsable no cambia

#### Scenario: Solo tres destinos

- **WHEN** una persona despliega el control de estado de una fila
- **THEN** las únicas opciones son «Pendiente», «En curso» y «Hecho»

#### Scenario: El cambio falla

- **WHEN** una persona cambia el estado de una tarea y el servidor rechaza la petición o no responde
- **THEN** la fila vuelve a mostrar el estado anterior y se ve un aviso con el motivo

### Requirement: Error al cargar la lista

La aplicación web SHALL mostrar un indicador de carga mientras pide la lista y, si no puede obtenerla, SHALL mostrar un aviso con el motivo en castellano en lugar de la lista o del estado vacío.

#### Scenario: Servidor caído al abrir la lista

- **WHEN** una persona con sesión abre la lista y el servidor no responde
- **THEN** ve el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y no ve el mensaje de lista vacía

### Requirement: Navegación entre tareas y perfil

La aplicación web SHALL mostrar en las pantallas que requieren sesión una navegación con los enlaces «Tareas» y «Perfil», que llevan a la lista de tareas y al perfil respectivamente.

#### Scenario: Del perfil a la lista

- **WHEN** una persona con sesión está en su perfil y pulsa «Tareas»
- **THEN** ve la lista de tareas

#### Scenario: De la lista al perfil

- **WHEN** una persona con sesión está en la lista de tareas y pulsa «Perfil»
- **THEN** ve su perfil
