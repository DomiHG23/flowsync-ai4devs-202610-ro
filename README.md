<!-- Generado desde la lección de ejercicio del módulo: no se edita a mano. -->

# Ejercicio FlowSync: mide qué está probado de verdad

Es la última lección del módulo y la que más se subestima: **leerla** son nueve minutos, **hacerla** lleva bastante más (10 de entorno e instalación y unos 45 de la tarea), más unos 5 si abres las lecturas mínimas. No la abras la noche anterior a las 23:50.

Cuatro partes. La primera explica cómo funciona el módulo, y conviene leerla aunque tengas prisa. La segunda deja el entorno listo. La tercera es la tarea, que es la que lleva tiempo de verdad. La cuarta es cómo se entrega.

---

## 🔁 Cómo funciona este módulo

Hay tres momentos, y saberlos cambia cómo aprovechas cada uno.

**1. Lo intentas tú.** Sobre el proyecto de abajo, con tu agente, con el reloj puesto. Entregas lo que te salga, **con lo que tenga**. La entrega a medias no es un problema: este paso no se puntúa por completarlo.

**2. Lo ves resuelto en el directo.** El mentor hace este mismo trabajo, sobre este mismo proyecto. Si no te salió, ahí ves que se puede y cómo. Por eso conviene **mirar sin teclear**: lo vas a repetir con calma después.

**3. Lo replicas.** Los prompts que use el mentor te llegan por escrito. Con ellos vuelves a tu entorno y rehaces el recorrido, que es donde se asienta.

> ⚠️ **En el paso 3 no esperes salidas idénticas, y no es un fallo tuyo.** El agente no es determinista: con el mismo prompt y el mismo código cambian los nombres de las variables, la redacción y hasta cuántas filas te devuelve una tabla. Lo que se repite es **la forma del recorrido**, no el texto.

---

## 🛠️ Deja el entorno listo

**Primero, lo que necesita tu máquina.** El proyecto funciona en **macOS** y en **Linux**, tal cual, y en **Windows dentro de WSL** (Windows Subsystem for Linux, el Linux que corre dentro de Windows). **En PowerShell no**: los atajos del `Makefile` están escritos para la terminal de macOS y Linux, así que ahí fallan aunque consigas instalar `make`.

> 🪟 **Si trabajas en Windows, haz todo lo de esta lección dentro de la terminal de Ubuntu de WSL**: el clon, Node y `make`. Lo que tengas instalado en Windows no existe dentro de WSL, y al revés. Y clona el proyecto dentro de tu carpeta de Linux (`~/…`), no en `/mnt/c`: desde ahí `npm install` va muy lento. Si aún no tienes WSL, se instala con `wsl --install` desde PowerShell **abierto como administrador**, según la [guía oficial de Microsoft](https://learn.microsoft.com/es-es/windows/wsl/install).

### 1. Node.js 24 o superior

`node -v` responde `v24` o más. Con la 20 el proyecto no arranca (`make setup` se para con `Unknown file extension ".ts"`); con la 22 arranca, pero con una pantalla de avisos `EBADENGINE` porque el proyecto pide la 24. La versión **LTS** (*long term support*, la de soporte largo) de [nodejs.org/en/download](https://nodejs.org/en/download) cumple.

### 2. `make`

`make --version` responde con un número. Si no: en macOS, `xcode-select --install`; en Linux y en WSL con Ubuntu, `sudo apt install make`.

### 3. Tu fork, en la rama de partida

Repo del proyecto en la rama **`s4/start`**, **sobre tu propio fork** de [`github.com/LIDR-academy/flowsync-ai4devs-202610-ro`](https://github.com/LIDR-academy/flowsync-ai4devs-202610-ro). Sobre un clon directo del repo del curso **no tienes permiso de push**, y lo descubrirías al intentar subir tu trabajo.

```bash
# 1. Fork desde la web: botón "Fork" en github.com/LIDR-academy/flowsync-ai4devs-202610-ro

# 2a. Si AÚN NO has clonado: clona TU fork (no el del curso)
git clone git@github.com:<tu-usuario>/flowsync-ai4devs-202610-ro.git
cd flowsync-ai4devs-202610-ro
git remote add upstream git@github.com:LIDR-academy/flowsync-ai4devs-202610-ro.git

# 2b. Si YA clonaste el del curso: no vuelvas a clonar, recoloca los remotos
git remote rename origin upstream
git remote add origin git@github.com:<tu-usuario>/flowsync-ai4devs-202610-ro.git

# 2c. Si ya venías trabajando sobre tu fork: solo comprueba que están los dos
git remote -v          # origin = TU fork · upstream = el repo del curso

# 3. Trae las ramas nuevas del curso y colócate en la de este módulo
git fetch upstream
git checkout -b s4/start upstream/s4/start

# 4. Comprueba que el fork quedó bien montado: esto tiene que funcionar
git push -u origin s4/start
```

> 📌 **Un fork es una foto del momento, y el curso sigue publicando ramas.** Las que aún no se han publicado **todavía no existen** en tu fork, y tu fork no se entera solo: por eso el `git fetch upstream` va antes del `checkout`. Si te contesta *"pathspec did not match"*, casi siempre es esto. Si te contesta *"'upstream' does not appear to be a git repository"*, te falta el `git remote add` del paso 2. Y si el `push` del paso 4 te rechaza por permisos, es que `origin` sigue apuntando al repo del curso: vuelve al 2b.

> 📌 **Si te sale `Permission denied (publickey)`, es SSH, no el fork.** Los comandos de arriba usan URLs SSH (`git@github.com:…`), que necesitan una clave subida a tu cuenta de GitHub. O [súbela ahora](https://docs.github.com/es/authentication/connecting-to-github-with-ssh), que son cinco minutos y te sirve para el resto del curso, o cambia las URLs por su versión HTTPS (`https://github.com/<tu-usuario>/flowsync-ai4devs-202610-ro.git` y `https://github.com/LIDR-academy/flowsync-ai4devs-202610-ro.git`). Cualquiera de las dos vale; lo que no vale es descubrirlo el día del directo.

### 4. Dependencias instaladas y el proyecto levanta

Desde la raíz del proyecto. Este es el paso que conviene adelantar, así que hazlo hoy: descubrir que algo no compila con el directo empezado es el peor momento posible.

```bash
make setup   # solo la primera vez: instala backend y frontend, crea los dos .env, genera la clave y migra la base de datos
make start   # levanta el backend en http://localhost:3333 y el frontend en http://localhost:5173, a la vez
```

`make start` **se queda ocupando la terminal**: arranca los dos servidores juntos, `Ctrl-C` los para, y si uno se cae se lleva al otro. `make` a secas lista todos los atajos. **Comprueba en otra terminal que viven**: `curl -s localhost:3333/` devuelve `{"hello":"world"}`, y `http://localhost:5173` en el navegador enseña FlowSync. El frontend busca el backend en `http://localhost:3333`; si lo levantas en otro puerto, cambia `VITE_API_URL` en `frontend/.env`.

> 🔧 **Si algo falla, casi siempre es una de estas:** `make: command not found` → falta `make`; `Unknown file extension ".ts"` durante `make setup` → tu Node es anterior a la 22; `❌ Faltan dependencias. Ejecuta primero: make setup` → te saltaste el `setup`; un puerto en uso → tienes otro proyecto corriendo en el 3333 o en el 5173: ciérralo y vuelve a lanzar.
>
> **Sin `make`**, los mismos pasos a mano: `npm install` dentro de `backend/` y de `frontend/`, copia en cada una su `.env.example` a `.env`, y en `backend/` ejecuta `node ace generate:key` y `node ace migration:run`. Después, `npm run dev` en cada una, en dos terminales.

### 5. La suite de tests corre y sale en verde

Se lanza desde `backend/` con `npm test` (desde la raíz: `(cd backend && npm test)`, con los paréntesis, que te devuelven a ella). Debe terminar sin ningún test en rojo. Si algo falla aquí, es tu entorno y conviene resolverlo antes del directo, no en el minuto 1.

### 6. Abre `openspec/specs/`

Localiza la spec viva de la gestión de tareas. Cada carpeta de ahí dentro es una **capability**: una parcela de comportamiento del sistema, escrita como **debe comportarse** y no como está programada. Dentro viven los **requisitos** y, colgando de cada uno, los **scenarios**, los ejemplos concretos contra los que se verifica. Ten claro dónde están antes de empezar, porque la tarea sale de ahí.

### 7. Claude Code arranca y lee tu contexto

**Abre `.claude/agents/` y anota qué subagentes tienes ya definidos**, aunque la respuesta sea "ninguno": es la carpeta donde vas a trabajar, y saber si está vacía o no es la comprobación. Si no hay ninguno de revisión, no te bloquea: un subagente no es más que un archivo Markdown con su propio prompt y sus permisos, y montarlo lleva un minuto.

### 8. Crea tu rama

```bash
git checkout -b trazabilidad-<tus-iniciales>
```

Ahí va todo lo que produzcas.

---

## 📋 La tarea

> ⚠️ **Ve guardando cada prompt tal cual lo lanzas, desde el primero.** Se entregan junto con la matriz, y no valen reconstruidos: el prompt que arreglas mentalmente diez minutos después no es el que lanzaste, y es justo la diferencia que interesa mirar.

### El encuadre, y no es un consuelo

**El entregable no es la matriz completa. Son las tres líneas de la parte B**, y esas se escriben igual de bien con la matriz a medias.

De hecho, si terminas con la matriz llena y ninguna casilla en duda, vuelve a mirarla: casi nadie sale de esta tarea sin al menos un scenario del que no sabe qué decir, y ese es el interesante.

**El reloj tampoco es una crueldad de diseño.** Verificar de verdad no compite con escribir la funcionalidad: compite con el rato que hay antes de dar algo por terminado. Lo que sale en 45 minutos es exactamente la parte que depende de tener criterio, y no la que depende de tener una herramienta mejor.

**Sobre qué se hace:** sobre el requisito **«Lo que cada tarea muestra de su responsable»** de la spec viva de la gestión de tareas, `openspec/specs/tasks/spec.md`, en el proyecto que acabas de montar. Es el mismo requisito sobre el que trabaja el mentor en el directo: tú lo intentas antes, con tus propios prompts.

**Dónde va cada cosa:**

- La **matriz de trazabilidad** y las **tres líneas** van juntas en `docs/verificacion/<tus-iniciales>.md`. Es una carpeta nueva: la crea tu archivo.
- Los **tests que escribas** van en `backend/tests/functional/tasks/`, siguiendo el estilo de los que ya hay en `backend/tests/functional/auth/`. No toques nada fuera de `backend/tests/`.

Trabájalo en la rama propia que creaste al dejar el entorno listo.

> ⚠️ **Resérvale un rato de verdad y ponte el reloj.** Son unos 45 minutos y hay que pararlos. Dejarlo para la noche de antes te deja con una matriz rellenada de oído, que es justo lo que la tarea quiere que veas, pero se aprovecha mejor con tiempo de pensarlo.

---

### 🅰️ Parte A: la matriz y los tests que faltan, con reloj

Con un agente, y sobre el requisito **«Lo que cada tarea muestra de su responsable»**, produce dos cosas y déjalas escritas en **archivos versionados del repositorio**, no en el chat.

Un **requisito** de una spec viva es una regla de comportamiento del sistema, y de él cuelgan varios **scenarios**: los ejemplos concretos, con su par de *cuándo* y *entonces*, contra los que esa regla se comprueba. Un grupo de requisitos que cubre una parcela entera de comportamiento es una **capability**, y la matriz se hace por requisito y no por capability porque el requisito es la unidad que cabe en un rato.

**Solo ese requisito.** No la capability entera, aunque quepa y aunque el agente se ofrezca a cubrirla. Es uno cuyo incumplimiento le importa a alguien: dice qué datos de una persona salen junto a cada tarea, y eso es lo primero que se rompe sin que nadie lo vea.

#### A.1 · La matriz de trazabilidad

**El formato lo fija esta lección, y no es negociable**: una fila por scenario, con estas cuatro casillas, y **dos números arriba del todo**.

Los dos números son **cuántos scenarios tiene ese requisito** y **cuántos resultaron estar cubiertos**. El segundo se escribe al final; el primero, al principio.

1. **El scenario, en una línea.** Qué se espera y en qué situación. Si no cabe en una línea, es que estás juntando dos.
2. **Qué prueba lo cubre, nombrada tal cual aparece en la suite.** Sin el nombre concreto, la casilla se queda vacía: *"seguro que algo lo cubre"* no es una fila.
3. **Cubierto · No cubierto · No lo sé.** Los tres estados existen, y el tercero no es un fallo tuyo: es el resultado más informativo de los tres.
4. **Si pusiste "no lo sé", qué te faltó para decidirlo.** Media línea. Suele ser una de dos: no encontraste dónde se comprueba, o encontraste algo que se le parece y no dice exactamente lo mismo.

> ⚠️ **Un nombre de test no es una prueba de cobertura.** Un test puede llamarse igual que el scenario y comprobar otra cosa, o comprobar la mitad. Para marcar *cubierto* hay que **abrir el test y leer lo que afirma**. Es la casilla que más caro sale rellenar de oído, y es justo la que la tarea quiere que mires.

#### A.2 · Los tests que faltan

De las filas que quedaron en **No cubierto**, escribe los tests que faltan: **uno por scenario**, siguiendo el estilo de los que ya existen en el proyecto, y **sin tocar nada fuera de la carpeta de tests**.

Después, ejecútalos.

> ⚠️ **Pase lo que pase, no arregles el código, y no aflojes el test para que pase.** Si algo se pone rojo, se queda rojo y se entrega rojo: hoy toca saber qué está mal, no taparlo. Quien verifica no arregla, porque quien arregla deja de ver.

> ⚠️ **Cuando suene el reloj, para. Aunque esté a medias.** Aunque falten filas, aunque haya tests sin escribir, aunque justo estuvieras a punto de comprobar una cosa.
>
> Una matriz con cuatro filas rellenas y el resto en blanco **es información**: dice exactamente hasta dónde llegaste. Una fila completada de memoria diez minutos después es ruido con formato, y encima es indistinguible de la buena.

> 📌 **Sobre qué proyecto se hace, cómo dejarlo listo y cómo se entrega, lo tienes en esta misma lección**, arriba y abajo de la tarea: el entorno antes, y los sitios donde dejar cada archivo, el plazo y el segundo archivo de la entrega, después.

> ⚠️ **Ve guardando cada prompt tal cual lo lanzas, desde el primero.** Se entregan junto con la matriz, y no valen reconstruidos: el prompt que arreglas mentalmente diez minutos después no es el que lanzaste, y es justo la diferencia que interesa mirar.

---

### 🅱️ Parte B: las tres líneas

Debajo de la matriz, en el mismo archivo, tres líneas anotadas. **Esta parte no se puede fallar**, y es la que hay que traer sí o sí.

1. **Cuántos scenarios creías cubiertos antes de mirar, y cuántos lo estaban.** El primer número se escribe **antes** de lanzar el primer prompt, a ojo y sin abrir nada; el segundo, al final. Los dos tal cual salieron, sin redondear ni explicar.

2. **El scenario del que no supiste si era un hueco de test o un hueco de spec**, y en una frase, por qué. Son dos cosas distintas y se parecen mucho desde fuera: en un caso la regla está escrita y nadie la comprobó; en el otro, lo que creías que era la regla no está escrito en ninguna parte y lo estabas poniendo tú.

3. **Algo que el scenario no decidía por ti y tuviste que decidir al escribir el test.** Un valor concreto, un límite, qué pasa cuando el dato viene vacío. Casi ningún scenario determina su test del todo, y el hueco que rellenaste sin darte cuenta es lo que más se parece a un defecto futuro.

> ⚠️ **Ninguna de las tres tiene respuesta correcta.** La segunda y la tercera son mejores cuanto más incómodas: un *"no supe si esto lo tenía que decidir yo"* honesto vale más que una matriz llena con seguridad fingida.

---

### Cómo saber que la has hecho bien

- **Las tres líneas están escritas y son concretas.** Si la tercera dice *"el scenario lo decidía todo"*, vuelve a mirar el test que escribiste: los valores que pusiste salieron de algún sitio, y ese sitio eras tú.
- **Los dos números de la primera línea no coinciden.** Casi nunca coinciden, y eso no es un fallo tuyo: es el dato entero de la tarea.
- **Hay al menos un *"no lo sé"* en la matriz.** Significa que abriste los tests en vez de fiarte de sus nombres.
- **La matriz cabe en una pantalla.** Si no cabe, te saliste del requisito y estás cubriendo la capability entera otra vez.
- **Hay algún test tuyo en rojo, o sabes decir por qué no lo hay.** Las dos respuestas valen; lo que no vale es no haberlo mirado.

> Entrégalo con lo que tenga.

---

## 📤 Cómo se entrega

Todo lo que produzcas va en la rama que creaste en el último paso del entorno.

**Un pull request desde tu fork**, con tres cosas dentro y ni una más:

1. **Tu archivo** de `docs/verificacion/`, con la matriz y las tres líneas.
2. **Los tests** que hayas escrito, tal como quedaron: en verde, en rojo o a medias.
3. **`prompts.md`**, en la raíz del proyecto, con la plantilla que la rama de partida trae en ese mismo archivo.

```bash
git add docs/verificacion backend/tests prompts.md
git commit -m "trazabilidad: responsable de la tarea + prompts"
git push -u origin trazabilidad-<tus-iniciales>
```

Con la rama empujada, GitHub te ofrece arriba el botón para abrir el pull request. Va **contra el repositorio del curso**, no contra tu fork.

> 🧠 **`prompts.md` no es papeleo, y es la mitad de lo que se revisa.** Lo que se mira no es solo lo que te salió, es **cómo lo pediste**: un resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan respuestas distintas, y sin ese archivo no se distinguen. Pega los prompts **tal cual los lanzaste**, con su modelo y su herramienta, e incluye también **los que no funcionaron**, que suelen ser los más útiles de leer.

### El plazo

**Antes del directo.** Lo que llegue a tiempo recibe el feedback de tu TA **antes de la sesión**, que es el único momento en que te sirve: llegas sabiendo dónde fallaste y miras la sesión buscando eso. Lo que llegue después se marca como recibido, pero ya no se revisa.

---

## 📚 Si vas justo de tiempo

- Repasa las lecciones de este módulo sobre verificación y trazabilidad y sobre la revisión adversarial.
- 📖 Un ejemplo de ADR de verdad: la [plantilla MADR](https://adr.github.io/madr/), unos 5 minutos, y basta con ver qué apartados tiene. Es la variante extendida; el curso trabaja con los cinco apartados del formato original.
- 📖 Un vistazo a la [sintaxis de los diagramas de flujo en Mermaid](https://mermaid.js.org/syntax/flowchart.html): con entender cómo se declara un nodo y cómo se une con una flecha vas servido. El resto del material de apoyo está en la lección de recursos de este módulo.

---

## ✅ Antes de conectarte, comprueba

- [ ] Estás en la rama de partida, sobre **tu fork**, y `git push` funciona.
- [ ] El proyecto levanta y la suite corre en verde.
- [ ] **Traes el archivo de la tarea**, con su matriz (aunque esté a medias) y sus tres líneas.
- [ ] Los tests que escribiste están commiteados **tal como quedaron**, sin maquillar.
- [ ] **`prompts.md` está relleno**, con modelo y herramienta en cada bloque.
- [ ] **El pull request está abierto.**

> Trae el trabajo tal como quedó, sin maquillarlo: lo que le falta es la mitad de lo interesante.

---

## 🎯 Qué te llevas del Módulo 4

**El modelo mental**: *tests verdes ≠ correcto*; **verificar** es trazabilidad (ticket→criterio→prueba→código); la **revisión adversarial** refuta en vez de validar (subagente read-only, contrastado contra la spec viva); y la **documentación viva** vive en el repo: el diagrama, el contrato de la API y el README se **generan** de lo que existe, y el ADR se **decide** y se escribe una vez. Versionada, y regenerada en CI lo que se genera. El ancla de todo es la **spec viva**: mientras esté al día, lo que cuelga de ella también.

**Lo que queda en el proyecto**: una **matriz de trazabilidad** que dice qué criterio tiene prueba y cuál no, los **bugs que el adversario cazó con la suite en verde** corregidos y con la prueba que faltaba añadida, y **documentación viva** (arquitectura, ADR, OpenAPI, README) versionada en el repo y publicable desde CI. Un proyecto entregable, no "casi".
