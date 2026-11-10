# Matriz de trazabilidad — «Lo que cada tarea muestra de su responsable»

**Requisito:** [`openspec/specs/tasks/spec.md`](../../openspec/specs/tasks/spec.md) § *Requirement: Lo que cada tarea muestra de su responsable*

> El sistema SHALL acompañar cada tarea del nombre y las iniciales de su responsable, lo justo para identificarlo en la lista, y NO SHALL exponer junto a la tarea ningún otro dato de esa cuenta, en particular su email.

**Tests:** [`backend/tests/functional/tasks/assignee.spec.ts`](../../backend/tests/functional/tasks/assignee.spec.ts) — `node ace test functional --files=assignee`
**Fecha de la verificación:** 2026-11-10

---

## 1. De dónde viene

| Nivel | Artefacto | Qué aporta |
|---|---|---|
| PRD | [RF-16](../prd/flowsync-mvp.md) — Lista compartida única | Una sola lista, igual para todos: el responsable de cualquier tarea lo ve cualquiera, así que lo que se expone de él lo ve todo el equipo |
| PRD | [RF-17](../prd/flowsync-mvp.md) — «Quién está en qué» de un vistazo | Cada tarea tiene que enseñar su responsable sin abrirla |
| Historia | [E3-1 CA-4](../backlog/E3-actividad-equipo/us-lista-compartida.md) — Cada fila dice título, responsable y estado | Hace falta un dato que identifique al responsable |
| Historia | [E3-1 CA-6](../backlog/E3-actividad-equipo/us-lista-compartida.md) — El responsable se identifica por su nombre | Su nombre, nunca un identificador interno ni un correo |
| Historia | [E3-1, «Nota para quien la implemente»](../backlog/E3-actividad-equipo/us-lista-compartida.md) | Avisa del punto delicado: devolver el usuario entero filtra datos de cuenta |
| Diseño | [add-task-list · design.md](../../openspec/changes/archive/2026-08-13-add-task-list/design.md) § *El responsable se expone recortado* | Decisión: transformer propio con `id`, `fullName` e `initials` y sin reutilizar `UserTransformer` |
| Diseño | [add-task-list · design.md](../../openspec/changes/archive/2026-08-13-add-task-list/design.md) § Riesgos | «La regresión más probable —que el responsable acabe filtrando el email— no la va a detectar nada automático» |
| Tareas | [add-task-list · tasks.md](../../openspec/changes/archive/2026-08-13-add-task-list/tasks.md) 2.3, 2.4, 6.3 | 2.3 y 2.4 crean y usan el transformer recortado; 6.3 («verificar que ninguna respuesta incluye el email») se quedó sin marcar |

## 2. Dónde se implementa

| Capa | Artefacto | Papel |
|---|---|---|
| Modelo | `backend/app/models/user.ts` — `get initials()` | Calcula las iniciales; sin nombre, las deriva del email (ver observación b) |
| Transformer | `backend/app/transformers/task_assignee_transformer.ts` | **La única forma del responsable junto a una tarea**: `id`, `fullName` e `initials` |
| Transformer | `backend/app/transformers/task_transformer.ts` | Tarea de lista, de creación y de cambio de estado → `TaskAssigneeTransformer` |
| Transformer | `backend/app/transformers/task_detail_transformer.ts` | Tarea suelta y cambio de fecha → `TaskAssigneeTransformer` |
| Controlador | `tasks_controller.ts` — `index`, `store` → `TaskTransformer`; `show` → `TaskDetailTransformer` | |
| Controlador | `task_statuses_controller.ts` — `update` → `TaskTransformer` | |
| Controlador | `task_due_dates_controller.ts` — `update` → `TaskDetailTransformer` | |
| Frontend | `frontend/src/lib/types.ts` — `TaskAssignee` | Refleja el contrato: sin `email` |
| Frontend | `frontend/src/components/task-item.tsx`, `frontend/src/pages/task-page.tsx` | Pintan `fullName ?? 'Sin nombre'` y las iniciales |

## 3. Scenario × endpoint → test

Cada celda es un test de `assignee.spec.ts`. El estado **antes** corresponde a `trazabilidad-dhg` (`6af2c43`); el estado **después**, a esta rama con el arreglo.

Los títulos de test son `"<endpoint>: <scenario>"`:
- **S1** = «el responsable llega con su nombre y sus iniciales»
- **S2** = «el responsable no trae el email ni ningún otro dato de cuenta»
- **S3** = «un responsable sin nombre llega con nombre nulo e iniciales»

| Endpoint | Transformer | S1 Responsable identificable | S2 No filtra datos de cuenta | S3 Responsable sin nombre |
|---|---|---|---|---|
| `GET /api/v1/tasks` (por defecto) | `TaskTransformer` | ✅ / ✅ | ❌ → ✅ | ❌ → ✅ |
| `GET /api/v1/tasks?status=done` | `TaskTransformer` | ✅ / ✅ | ❌ → ✅ | ❌ → ✅ |
| `POST /api/v1/tasks` | `TaskTransformer` | ❌ → ✅ ¹ | ❌ → ✅ ¹ | ❌ → ✅ ² |
| `PATCH /api/v1/tasks/:id/status` | `TaskTransformer` | ✅ / ✅ | ❌ → ✅ | ❌ → ✅ |
| `GET /api/v1/tasks/:id` | `TaskDetailTransformer` | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| `PUT /api/v1/tasks/:id/due-date` | `TaskDetailTransformer` | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| Lista con tareas de varias cuentas, incluidas las ajenas | `TaskTransformer` | — | ❌ → ✅ ³ | ❌ → ✅ ³ |

¹ «POST /tasks: la tarea recién creada no filtra el email de quien la crea» (cubre S1 y S2)
² «POST /tasks: quien se registró sin nombre crea con nombre nulo e iniciales»
³ «la lista no filtra el email de nadie, tampoco el de las tareas ajenas»

S1 pasaba ya antes en todos los endpoints salvo `POST`, que la comprueba en el mismo test que S2, porque `UserTransformer` también trae `fullName` e `initials`: el requisito solo fallaba por lo que sobraba. En S3 lo que fallaba era la comprobación de claves, no el nombre nulo.

**Resultado:** antes 9 de 18 tests fallaban; después pasan los 18, y la suite completa del backend (38) sigue en verde.

S2 comprueba la lista exacta de claves (`id`, `fullName`, `initials`), no solo que falte el email. Así cualquier dato de cuenta que se añada en el futuro (fechas, hash, tokens…) rompe el test.

## 4. El hallazgo: la regresión que el diseño anunciaba

El commit `0aa5af7` («refactor(tasks): reutilizar UserTransformer y no duplicar la forma del usuario») cambió `TaskTransformer` de `TaskAssigneeTransformer` a `UserTransformer`. Desde entonces la lista, la creación y el cambio de estado devuelven `email`, `createdAt` y `updatedAt` de cada responsable a cualquier cuenta con sesión. Es justo el riesgo que el design daba por probable y que nada automático iba a detectar. La pantalla no lo enseñaba, así que el fallo era invisible a simple vista.

Esta rama deshace ese cambio y deja en `TaskTransformer` un comentario con el motivo y el test que lo vigila. Con esto, la tarea 6.3 del change archivado queda cubierta por un test automático.

## 5. Huecos y observaciones abiertas

| # | Observación | Estado |
|---|---|---|
| a | **Se expone el `id` del responsable.** Leída al pie de la letra, la frase «ningún otro dato de esa cuenta» no lo admite. El scenario solo prohíbe «datos de acceso», y el design lo decidió así. El frontend no lo usa hoy. | Decisión de producto pendiente: o se acepta y se aclara el requisito, o se retira del transformer y del test |
| b | **Las iniciales de una cuenta sin nombre salen del email** (`User.initials`: `ada@example.com` → `AE`). Son dos letras, pero son del email. Lo fija el requisito «Iniciales de la cuenta» de `auth`, y choca en espíritu con «sin recurrir a su email». | Pendiente de decidir entre las dos specs |
| c | **La parte de interfaz no tiene test automático.** Pintar «Sin nombre» y no enseñar nunca el email (scenario «Responsable sin nombre» de *Pantalla de la lista del equipo*) solo se verifica a mano, porque el frontend no tiene runner de tests. | Hueco conocido |
| d | **Los tipos generados no detectaban la fuga.** El registro Tuyau (`.adonisjs/client/registry`) ya describía el responsable recortado, y el frontend tipa `TaskAssignee` sin email. Los tipos no fallaban aunque la respuesta real llevara el email de más. Por eso los tests leen el cuerpo sin tipar. | Informativo |
