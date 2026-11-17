# Revisor automático en CI

[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza Claude Code
([`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action)) sobre cada
pull request: cuando se abre, se reabre, sale de borrador o recibe un push. Publica cada hallazgo
como comentario en línea en el PR y deja un comentario de resumen.

No bloquea el merge, no corrige nada y no escribe en el repositorio. Un PR con hallazgos sigue en
verde: lo que hagas con ellos lo decides tú.

## Pasos manuales pendientes

Con el workflow commiteado no basta. Faltan estos pasos, en este orden:

1. **Tener Actions activado en el repositorio.** Si el repo de GitHub es un *fork*, GitHub
   desactiva los workflows hasta que alguien los habilite en la pestaña *Actions*.
2. **Instalar la app de Claude en GitHub sobre el repositorio.** La acción se autentica ante
   GitHub como esa app; para eso pide `id-token: write`. Lo más directo es ejecutar
   `/install-github-app` dentro de Claude Code, en local.
3. **Crear el secreto con la credencial**, por uno de los dos caminos de la sección siguiente.
   Desde la terminal: `gh secret set <NOMBRE>` (pide el valor sin dejarlo en el historial), o en
   *Settings → Secrets and variables → Actions*.
4. **Escribir el archivo de calibración, `REVIEW.md`, en la raíz.** El prompt le dice al revisor
   que lo lea antes que nada y que mande sobre qué es grave y cuántas sugerencias menores caben.
   **Todavía no existe**: hasta que exista, el revisor usa su propio criterio. El nombre lo
   fija el prompt del workflow; si lo cambias, cámbialo en los dos sitios.
5. **Subir la rama y abrir un PR.** Con `pull_request`, GitHub ejecuta el workflow tal como está
   en el propio PR, así que el PR que lo introduce ya se revisa a sí mismo. Ese primer run es la
   prueba de que los pasos anteriores están bien.

La acción solo se ejecuta si quien abre el PR tiene permiso de escritura en el repositorio; los
bots están excluidos por defecto.

## La credencial: dos caminos

Elige **uno**. Cada camino usa una entrada distinta de la acción y un secreto con un nombre
distinto:

| Camino | De dónde sale | Entrada de la acción | Nombre del secreto |
|---|---|---|---|
| **1. Suscripción** (el que está configurado) | `claude setup-token`, en local | `claude_code_oauth_token` | `CLAUDE_CODE_OAUTH_TOKEN` |
| **2. Clave de API** | La consola de Claude, en [platform.claude.com](https://platform.claude.com) | `anthropic_api_key` | `ANTHROPIC_API_KEY` |

### 1. Suscripción: `claude setup-token`

Ejecuta `claude setup-token` en tu máquina. Abre el navegador, inicias sesión con tu cuenta de
Claude y te devuelve un token de larga duración. Guárdalo como secreto `CLAUDE_CODE_OAUTH_TOKEN`.
El workflow ya lo lee con:

```yaml
claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

Requiere un plan de pago. La documentación no se pone de acuerdo sobre cuáles: la de la acción
habla de Pro y Max, y la de Claude Code de Pro, Max, Ultra, Team y Enterprise. El token queda
**atado a la suscripción de quien lo generó**, y las ejecuciones consumen de ese plan, no de
facturación de API. Si el secreto se va a compartir entre varios repos o personas, la propia
documentación recomienda el camino 2.

### 2. Clave de API de la consola

Crea una clave en la consola y guárdala como secreto `ANTHROPIC_API_KEY`. Después cambia en el
workflow la línea de la credencial por:

```yaml
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Se factura por token a la organización de la consola.

### Cruzarlos falla sin decir por qué

Un token de `setup-token` metido en `anthropic_api_key`, o una clave de API metida en
`claude_code_oauth_token`, **falla en la primera llamada al modelo con un error de
autenticación que no te dice que los has cruzado**. Lo mismo pasa si el nombre del secreto no
coincide con el que lee el workflow: GitHub sustituye un secreto que no existe por una cadena
vacía, sin avisar. Si el primer run falla al autenticar, revisa antes que nada que credencial,
entrada y nombre del secreto sean del mismo camino.

## En qué se va el dinero

Cada ejecución consume dos cosas:

- **Minutos de GitHub Actions**: el job corre en un runner de GitHub.
- **Uso del modelo**: tokens de lo que lee (diff, ficheros, `CLAUDE.md`, que lee en cada run) y
  de lo que escribe. Con el camino 1 sale del plan; con el camino 2, de la factura de la API.

**Los precios no se copian aquí** porque cambian. Están en las páginas oficiales:

- Planes de suscripción: <https://claude.com/pricing>
- Precio por token de la API, por modelo: <https://platform.claude.com/docs/en/about-claude/pricing>

### El modelo: `--model sonnet --effort medium`

- **Qué usa.** `sonnet` es un alias que apunta a la versión más reciente de Sonnet recomendada
  para el proveedor, y **se mueve solo** cuando sale una nueva. `--effort medium` limita cuánto
  razona antes de responder.
- **Por qué ese.** Revisar un diff acotado con herramientas de solo lectura no necesita el modelo
  más grande. Sonnet cuesta bastante menos por token que Opus, y el esfuerzo medio recorta los
  tokens de razonamiento, que se pagan aunque no se vean.
- **Cómo cambiarlo.** Edita `claude_args` en el workflow: `--model opus` para más capacidad,
  `--model haiku` para menos coste, o el nombre completo (por ejemplo `claude-sonnet-5-5`)
  para fijar una versión y que no cambie sola. Lo mismo con `--effort` (`low`, `medium`,
  `high`...). Los niveles disponibles dependen del modelo; están en
  [la configuración de modelos de Claude Code](https://code.claude.com/docs/en/model-config).

### Lo que pone techo al gasto

- `--max-turns 40`: como mucho 40 turnos del modelo por revisión.
- `timeout-minutes: 10`: GitHub mata el job a los 10 minutos.
- `concurrency` con `cancel-in-progress`: un push nuevo al PR cancela la revisión anterior en
  vez de pagar dos.
- Ojo: **cada push a un PR abierto es una revisión nueva**. Un PR con diez pushes son diez
  revisiones.

## Herramientas y permisos

- **Herramientas permitidas** (`--allowedTools`): `Read`, `Grep` y `Glob` para leer el
  repositorio; `gh pr diff` y `gh pr view` para ver el cambio; `gh pr comment` y la herramienta de
  comentario en línea para publicar. Nada más: ni editar, ni otros comandos de shell.
- **`--permission-mode default`.** Sin esto la acción corre en modo automático y, según su
  documentación, puede ejecutar llamadas fuera de `--allowedTools`. Con `default`, esa lista
  es estricta.
- **Por qué el prompt prohíbe redirigir la salida.** `gh pr diff 12 > diff.txt` o `gh pr diff 12 |
  head` ya no encajan con `Bash(gh pr diff:*)`: se deniegan, y cada intento gasta un turno de
  los 40.
- **Permisos del token del job**: `contents: read`, `pull-requests: write` (comentar) e
  `id-token: write` (autenticarse como la app). A nivel de workflow, ninguno.

## Pull requests desde un fork en un repositorio público

En un repositorio público, GitHub **no pasa secretos** a los runs de un PR que viene de un fork,
y deja su token en solo lectura. Sin credencial, la acción no podría arrancar. Además, quien
abre ese PR casi nunca tiene permiso de escritura, y la acción se niega a correr para él. Por
eso el job lleva una condición `if` que **lo salta** cuando el PR viene de otro repositorio:
queda como *skipped*, no en rojo.

**No lo arregles cambiando a `pull_request_target`.** Ese evento sí corre con los secretos del
repositorio base. Si además se hace checkout del código del PR, código que no has revisado
correría con tu credencial al alcance; la documentación de la acción lo desaconseja de forma
explícita. Para revisar un PR de un fork, que alguien con permiso suba esa rama al propio
repositorio y abra el PR desde ahí, o que lo revise en local.
