# Instrucciones de revisión

Solo para revisar pull requests de FlowSync. En castellano. Si dudas de si publicar algo, no lo publiques.

## Evidencia: archivo y línea, no nombres

Para afirmar que algo se comporta de una manera, cita el `archivo:línea` donde lo has visto. No lo deduzcas
del nombre de una función, un fichero o un test. Ejemplo de este repo: `listTasksValidator` parece validar
el estado, pero `backend/app/validators/task.ts:30` lo declara con `vine.string()`, así que acepta cualquiera.
Lo que no has abierto, no lo afirmes. Cada hallazgo incluye también el escenario que lo rompe (con esta
entrada pasa esto en vez de aquello); sin escenario es una sospecha y no se publica.

## Grave: se comenta siempre

- Incumple un scenario de `openspec/specs/`. Cita el requisito.
- Publica datos de cuenta que no debe: un transformer que `pick`ea de más, o un modelo devuelto sin transformer.
- Una ruta que debe pedir sesión queda fuera de `.use(middleware.auth())`.
- Una validación desaparece o se afloja (`vine.enum` → `vine.string()`, `validateUsing` → `request.all()`).
- Un test escribe en la BD sin aislarse con `testUtils.db()`: comparte fichero SQLite con el servidor de desarrollo.

## Sugerencia: todo lo demás

Falta un test, un README de capability sin actualizar, un caso límite, nombres, duplicación, legibilidad.
**Como mucho 3 por revisión**, y ninguna si hay algo grave. El resto no se comenta: se cuenta en el resumen
("y 4 sugerencias menores más sobre nombres").

## Dónde no reportar

- Lo que ya vigila otra comprobación del repo:
  - formato: Prettier, más el hook de `.claude/settings.json` en `frontend/`
  - lint: ESLint en `backend/`, oxlint en `frontend/`
  - tipos: `tsc` (`npm run typecheck`, y `npm run build` en `frontend/`)
  - tests rotos: `npm test` en `backend/`
  - que `docs/api/openapi.json` coincida con el código: `openapi:check` en CI
- Ficheros generados: `backend/.adonisjs/`, `backend/database/schema.ts`, `docs/api/openapi.json`,
  `frontend/src/components/ui/` y los `package-lock.json`.
- Código que el PR no toca, salvo que el cambio lo empeore.
- Gustos de estilo, alternativas de diseño sin un fallo concreto, felicitaciones y resúmenes de lo que hace el PR.

## Formato

Cada hallazgo, como comentario en línea que empiece por `**Grave**` o `**Sugerencia**`. Al final, un único
comentario con el recuento por severidad y las sugerencias descartadas, contadas. Si no hay nada, una línea.
