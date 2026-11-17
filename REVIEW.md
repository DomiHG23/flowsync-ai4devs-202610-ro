# Calibración del revisor automático

Este archivo lo lee el revisor de CI ([`.github/workflows/claude-review.yml`](.github/workflows/claude-review.yml))
antes de revisar cada pull request. Decide qué cuenta como grave, qué no se comenta y cuánto
ruido cabe.

Un revisor no se mide por lo que encuentra, sino por **cuántos de sus comentarios acaban en un
cambio de código**. Un comentario que nadie va a aplicar no es neutro: cuesta leerlo y entierra
al que sí importaba. Ante la duda, no lo publiques.

## Qué es un hallazgo

Solo es un hallazgo si puedes escribir las tres cosas:

1. **Qué falla**, en una frase.
2. **El escenario concreto**: con esta entrada o este estado, pasa esto en vez de aquello.
3. **La evidencia**: `archivo:línea` del cambio y, si aplica, el requisito de
   `openspec/specs/<capability>/spec.md` que se incumple.

Si te falta el escenario, es una sospecha, no un hallazgo, y no se publica. Un "podría ser
problemático" sin un caso que lo rompa es ruido.

## Severidad

### Grave: se comenta siempre

Algo que, si se mergea, rompe comportamiento o expone datos.

- **Incumple un scenario de la spec viva** (`openspec/specs/`). Cita el requisito.
- **Expone datos de cuenta que no debe.** Precedente real en este repo: la lista de tareas
  publicaba el email del responsable porque el transformer de la tarea serializaba el
  `assignee` con `UserTransformer`. Mira qué transformer usa cada respuesta y qué campos
  `pick`ea.
- **Un controlador devuelve un modelo crudo** en vez de pasar por un transformer de
  `app/transformers/` y por `serialize()`. Es la misma fuga, todavía sin descubrir.
- **Una ruta que debe pedir autenticación queda fuera de `.use(middleware.auth())`**, o una
  operación sobre una tarea no comprueba que el recurso exista o sea accesible para quien la pide.
- **Una validación desaparece o se afloja**: un campo que pasa de `vine.enum` a `vine.string()`,
  una regla `.unique()` que se cae, un `request.all()` donde había `validateUsing`.
- **Se edita a mano un fichero generado** que se regenera solo y pisará el cambio:
  `backend/database/schema.ts` o `backend/.adonisjs/`.
- **Un test que escribe en la base de datos sin aislarse** (`testUtils.db()`, truncate o
  transacción): los tests functional comparten fichero SQLite con el servidor de desarrollo y el
  estado se filtra entre ejecuciones.

### Importante: se comenta si el cambio lo introduce

Algo que no rompe hoy, pero deja el proyecto peor de lo que estaba.

- **Comportamiento nuevo en `auth` o `tasks` sin test** que lo cubra en `backend/tests/`.
- **Cambian rutas, controladores, validadores o transformers de una capability y su
  `docs/capabilities/<nombre>/README.md` no se actualiza** en el mismo PR.
- **Un caso límite sin manejar** en lo que el PR toca: `dueDate` a `null`, una lista vacía, un
  id que no existe, un estado que no es de los tres del dominio.
- **En el frontend, una llamada a la API fuera de `src/lib/api.ts`**, o un error del backend que
  llega al usuario sin pasar por `ApiError` (sin mensaje en castellano ni `fieldErrors`).

### Menor: como mucho tres, y solo si no hay nada grave

Legibilidad, nombres, duplicación, un import relativo donde había alias `#...`, un comentario
que ya no dice la verdad.

- **Máximo tres por revisión.** Si ves más, elige las tres que más ayuden y descarta el resto
  sin mencionarlas.
- **Si hay algún hallazgo grave, no publiques ninguno menor.** Lo que importa no puede quedar
  enterrado entre sugerencias.
- Agrupa: una sugerencia que se repite en cinco sitios es un comentario, no cinco.

## Qué no se comenta nunca

- **Lo que resuelve una herramienta.** Formato (Prettier), lint (ESLint en backend, oxlint en
  frontend) y tipos (`tsc`): si el PR los rompe, el arreglo es ejecutar la herramienta, no leer
  un comentario. Y que `docs/api/openapi.json` coincida con el código ya lo comprueba
  `openapi:check` en CI: si lo dices tú, lo dices dos veces.
- **El contenido de ficheros generados**, línea a línea: `backend/.adonisjs/`,
  `backend/database/schema.ts`, `docs/api/openapi.json`, `frontend/src/components/ui/`
  (shadcn) y `package-lock.json`.
- **Problemas que ya estaban antes del PR** en código que el PR no toca. Si el cambio los
  empeora, sí.
- **Preferencias de estilo** sin un fallo detrás, felicitaciones y resúmenes de lo que hace el
  PR: quien lo abrió ya lo sabe.
- **Alternativas de diseño** ("yo lo habría hecho con...") sin un fallo concreto del diseño
  actual.

## Formato

- **En castellano.**
- **Cada hallazgo, como comentario en línea** sobre la línea que lo evidencia. Empieza por la
  severidad en negrita (`**Grave**`, `**Importante**`, `**Menor**`), sigue con qué falla y el
  escenario, y termina con el requisito de la spec si lo hay.
- **Un único comentario de resumen** al final, con cuántos hallazgos hay de cada severidad y,
  si hay algún grave, cuál mirar primero. Si no hay nada que merezca la pena, una línea que lo
  diga: un PR limpio no necesita más.
