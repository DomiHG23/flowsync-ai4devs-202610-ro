# auth Specification

## Purpose

Permitir que una persona cree una cuenta en FlowSync, inicie y cierre sesión, y consulte su perfil, tanto a través de la API HTTP (autenticación por token de acceso) como desde las pantallas de la aplicación web.

## Requirements

### Requirement: Registro de cuenta

La API SHALL permitir crear una cuenta nueva con nombre completo, email, contraseña y confirmación de contraseña, y SHALL devolver en la misma respuesta los datos públicos de la cuenta creada y un token de acceso ya utilizable, de modo que el registro deja la sesión iniciada.

#### Scenario: Registro correcto

- **WHEN** se envía una petición de registro con un email no registrado, una contraseña de entre 8 y 32 caracteres, su confirmación idéntica y un nombre completo
- **THEN** la respuesta tiene estado 200 y un cuerpo `{ data: { user, token } }`, donde `user` contiene `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt`, y `token` es una cadena utilizable como token Bearer

#### Scenario: Registro sin nombre

- **WHEN** se envía una petición de registro válida con `fullName` igual a `null`
- **THEN** la cuenta se crea y la respuesta devuelve `user.fullName` igual a `null`

#### Scenario: La contraseña nunca se devuelve

- **WHEN** se completa un registro correcto
- **THEN** ni la contraseña ni ningún derivado suyo aparece en el cuerpo de la respuesta

### Requirement: Validación de los datos de registro

La API SHALL rechazar con estado 422, sin crear la cuenta, toda petición de registro cuyos campos incumplan sus reglas (`fullName` presente aunque sea `null`; `email` con formato de email y hasta 254 caracteres; `password` y `passwordConfirmation` de 8 a 32 caracteres e iguales), y SHALL devolver `{ errors: [...] }` con el campo, la regla y un mensaje por error.

#### Scenario: Email con formato inválido

- **WHEN** se envía una petición de registro con `email` igual a `"no-es-un-email"`
- **THEN** la respuesta tiene estado 422 y contiene un error sobre el campo `email` con la regla `email`

#### Scenario: Contraseña demasiado corta

- **WHEN** se envía una petición de registro con una contraseña de 7 caracteres
- **THEN** la respuesta tiene estado 422 y contiene un error sobre el campo `password` con la regla `minLength`

#### Scenario: Contraseña demasiado larga

- **WHEN** se envía una petición de registro con una contraseña de 33 caracteres
- **THEN** la respuesta tiene estado 422 y contiene un error sobre el campo `password` con la regla `maxLength`

#### Scenario: Confirmación distinta

- **WHEN** se envía una petición de registro en la que `passwordConfirmation` no coincide con `password`
- **THEN** la respuesta tiene estado 422 y contiene un error sobre el campo `passwordConfirmation` con la regla `sameAs`

#### Scenario: Falta la clave del nombre

- **WHEN** se envía una petición de registro que omite por completo la clave `fullName`
- **THEN** la respuesta tiene estado 422 y contiene un error sobre el campo `fullName` con la regla `required`

### Requirement: Email único por cuenta

La API SHALL impedir que dos cuentas compartan el mismo email.

#### Scenario: Email ya registrado

- **WHEN** se envía una petición de registro con un email que ya pertenece a una cuenta existente
- **THEN** la respuesta tiene estado 422, contiene un error sobre el campo `email` con la regla `database.unique` y no se crea ninguna cuenta nueva

### Requirement: Inicio de sesión con email y contraseña

La API SHALL emitir un token de acceso nuevo a quien presente un email y una contraseña que correspondan a una cuenta existente, y SHALL devolverlo junto con los datos públicos de la cuenta. Cada inicio de sesión SHALL generar un token distinto sin invalidar los emitidos anteriormente.

#### Scenario: Credenciales correctas

- **WHEN** se envía una petición de inicio de sesión con el email y la contraseña de una cuenta existente
- **THEN** la respuesta tiene estado 200 y un cuerpo `{ data: { user, token } }` con la misma forma que la del registro

#### Scenario: Varias sesiones simultáneas

- **WHEN** la misma cuenta inicia sesión dos veces
- **THEN** se obtienen dos tokens distintos y ambos permiten acceder a los recursos protegidos

### Requirement: Rechazo de credenciales incorrectas

La API SHALL rechazar con estado 400 un inicio de sesión cuyas credenciales no correspondan a ninguna cuenta, sin indicar si el fallo está en el email o en la contraseña.

#### Scenario: Contraseña incorrecta

- **WHEN** se envía una petición de inicio de sesión con un email registrado y una contraseña equivocada
- **THEN** la respuesta tiene estado 400, no incluye ningún token y ningún error del cuerpo señala un campo concreto

#### Scenario: Email no registrado

- **WHEN** se envía una petición de inicio de sesión con un email que no pertenece a ninguna cuenta
- **THEN** la respuesta es indistinguible en estado y forma de la de una contraseña incorrecta

### Requirement: Validación de los datos de inicio de sesión

La API SHALL rechazar con estado 422 un inicio de sesión cuyo `email` falte, no tenga formato de email o supere 254 caracteres, o cuya `password` falte. La API SHALL no aplicar al inicio de sesión los límites de longitud de contraseña del registro.

#### Scenario: Email mal formado al iniciar sesión

- **WHEN** se envía una petición de inicio de sesión con `email` igual a `"no-es-un-email"`
- **THEN** la respuesta tiene estado 422 y contiene un error sobre el campo `email`

#### Scenario: Contraseña corta al iniciar sesión

- **WHEN** se envía una petición de inicio de sesión con un email bien formado y una contraseña de 3 caracteres
- **THEN** la respuesta no es un 422 por longitud de contraseña, sino el rechazo por credenciales incorrectas (400)

### Requirement: Acceso autenticado mediante token Bearer

La API SHALL exigir un token de acceso válido, enviado en la cabecera `Authorization: Bearer <token>`, para consultar el perfil y para cerrar sesión, y SHALL responder con estado 401 cuando falte o no sea válido. Los tokens SHALL no caducar por tiempo: solo dejan de valer al cerrar sesión con ellos.

#### Scenario: Petición sin token

- **WHEN** se consulta el perfil sin cabecera `Authorization`
- **THEN** la respuesta tiene estado 401

#### Scenario: Token inventado o revocado

- **WHEN** se consulta el perfil con un token que la API no emitió o que ya fue revocado
- **THEN** la respuesta tiene estado 401

### Requirement: Consulta del perfil propio

La API SHALL devolver los datos públicos de la cuenta a la que pertenece el token presentado.

#### Scenario: Perfil con token válido

- **WHEN** se consulta el perfil con un token válido
- **THEN** la respuesta tiene estado 200 y un cuerpo `{ data: user }` con `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt` de la cuenta dueña del token

### Requirement: Cálculo de las iniciales

La API SHALL incluir en los datos públicos de la cuenta unas iniciales en mayúsculas derivadas así: si hay nombre completo, se toman sus dos primeras palabras separadas por espacio; si no lo hay, se toman la parte local y el dominio del email. Si hay dos partes, las iniciales son la primera letra de cada una; si solo hay una, son sus dos primeros caracteres.

#### Scenario: Nombre con nombre y apellido

- **WHEN** la cuenta tiene `fullName` igual a `"Ada Lovelace"`
- **THEN** `initials` vale `"AL"`

#### Scenario: Nombre de una sola palabra

- **WHEN** la cuenta tiene `fullName` igual a `"Ada"`
- **THEN** `initials` vale `"AD"`

#### Scenario: Cuenta sin nombre

- **WHEN** la cuenta tiene `fullName` igual a `null` y `email` igual a `"ada@flowsync.dev"`
- **THEN** `initials` vale `"AF"`

### Requirement: Cierre de sesión en la API

La API SHALL revocar el token con el que se hace la petición de cierre de sesión, sin afectar a otros tokens de la misma cuenta, y SHALL responder con estado 200 y el cuerpo `{ message: "Logged out successfully" }`, sin el envoltorio `data`.

#### Scenario: Cierre de sesión correcto

- **WHEN** se envía una petición de cierre de sesión con un token válido
- **THEN** la respuesta tiene estado 200 con `{ message: "Logged out successfully" }` y cualquier petición posterior con ese mismo token recibe un 401

#### Scenario: Otras sesiones siguen vivas

- **WHEN** una cuenta con dos tokens cierra sesión usando uno de ellos
- **THEN** el otro token sigue permitiendo consultar el perfil

### Requirement: Respuestas siempre en JSON

La API SHALL responder en JSON en todos los casos, incluidos los errores, independientemente de lo que el cliente pida en la cabecera `Accept`.

#### Scenario: Cliente que pide HTML

- **WHEN** se consulta el perfil sin token y con `Accept: text/html`
- **THEN** la respuesta 401 llega en JSON y no como página HTML ni como redirección

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer una pantalla de registro con los campos nombre completo (marcado como opcional), email, contraseña (con la indicación "Entre 8 y 32 caracteres.") y repetición de contraseña, un botón "Crear cuenta" y un enlace "Inicia sesión" que lleva a la pantalla de inicio de sesión. Un nombre vacío o formado solo por espacios SHALL enviarse como ausencia de nombre.

#### Scenario: Registro correcto desde la web

- **WHEN** una persona sin sesión rellena el formulario de registro con datos válidos y pulsa "Crear cuenta"
- **THEN** queda con la sesión iniciada y ve la pantalla de su perfil

#### Scenario: Contraseñas que no coinciden

- **WHEN** la persona escribe dos contraseñas distintas y pulsa "Crear cuenta"
- **THEN** ve el mensaje "Las contraseñas no coinciden." bajo el campo de repetición, sin que se haga ninguna petición al servidor

#### Scenario: Email ya registrado desde la web

- **WHEN** la persona intenta registrarse con un email que ya tiene cuenta
- **THEN** ve bajo el campo email el mensaje "Ese email ya está registrado. Inicia sesión en su lugar."

### Requirement: Pantalla de inicio de sesión

La aplicación web SHALL ofrecer una pantalla de inicio de sesión con los campos email y contraseña, un botón "Entrar" y un enlace "Crea una" que lleva a la pantalla de registro.

#### Scenario: Inicio de sesión correcto desde la web

- **WHEN** una persona sin sesión introduce credenciales correctas y pulsa "Entrar"
- **THEN** queda con la sesión iniciada y ve la pantalla de su perfil

#### Scenario: Credenciales incorrectas desde la web

- **WHEN** la persona introduce un email o una contraseña incorrectos y pulsa "Entrar"
- **THEN** ve un aviso destacado sobre el formulario con el texto "El email o la contraseña no son correctos." y sigue en la pantalla de inicio de sesión

### Requirement: Mensajes de error en castellano

La aplicación web SHALL mostrar los errores de validación del servidor en castellano y debajo del campo al que se refieren, y SHALL mostrar los errores que no son de un campo concreto como un aviso destacado encima del formulario.

#### Scenario: Error de validación de un campo

- **WHEN** el servidor rechaza un envío porque la contraseña es demasiado corta
- **THEN** la persona ve bajo el campo contraseña "la contraseña debe tener al menos 8 caracteres."

#### Scenario: Email con formato inválido en la web

- **WHEN** el servidor rechaza un envío por formato de email
- **THEN** la persona ve bajo el campo email "Introduce una dirección de email válida."

#### Scenario: Servidor inaccesible al enviar

- **WHEN** la persona envía el formulario de registro o de inicio de sesión y el servidor no responde
- **THEN** ve el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Error interno del servidor

- **WHEN** la persona envía un formulario y el servidor responde con un error inesperado
- **THEN** ve el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

### Requirement: Estado de envío de los formularios

La aplicación web SHALL deshabilitar el botón de envío mientras una petición de registro o de inicio de sesión está en curso, cambiando su texto a "Creando cuenta…" o "Entrando…" respectivamente, y SHALL volver a habilitarlo cuando la petición termina con error.

#### Scenario: Doble clic durante el envío

- **WHEN** la persona pulsa "Entrar" y la petición aún no ha terminado
- **THEN** el botón aparece deshabilitado con el texto "Entrando…" y no se puede volver a pulsar

### Requirement: Persistencia de la sesión en el navegador

La aplicación web SHALL recordar la sesión iniciada entre recargas y cierres del navegador y, al arrancar con una sesión recordada, SHALL comprobarla contra el servidor mostrando un indicador de carga a pantalla completa antes de mostrar ninguna pantalla.

#### Scenario: Recarga con sesión válida

- **WHEN** una persona con sesión iniciada recarga la página de su perfil
- **THEN** ve brevemente un indicador de carga y después su perfil, sin pasar por la pantalla de inicio de sesión

#### Scenario: Sesión rechazada por el servidor

- **WHEN** la aplicación arranca con una sesión recordada que el servidor ya no acepta
- **THEN** la persona llega a la pantalla de inicio de sesión con el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión." y la sesión recordada se olvida

#### Scenario: Servidor caído al arrancar

- **WHEN** la aplicación arranca con una sesión recordada y el servidor no responde
- **THEN** la persona llega a la pantalla de inicio de sesión con el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado.", y si recarga cuando el servidor vuelve a estar disponible recupera la sesión sin volver a introducir credenciales

### Requirement: Protección de pantallas según la sesión

La aplicación web SHALL mostrar la pantalla de perfil solo a personas con sesión iniciada, SHALL mostrar las pantallas de inicio de sesión y registro solo a personas sin sesión, y SHALL redirigir cualquier dirección desconocida al perfil.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre la dirección del perfil
- **THEN** es redirigida a la pantalla de inicio de sesión

#### Scenario: Login con sesión

- **WHEN** una persona con sesión iniciada abre la dirección de inicio de sesión o la de registro
- **THEN** es redirigida a la pantalla de su perfil

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no corresponde a ninguna pantalla
- **THEN** es redirigida al perfil, y de ahí al inicio de sesión si no tiene sesión

### Requirement: Pantalla de perfil

La aplicación web SHALL mostrar en el perfil las iniciales de la persona en un círculo, su nombre completo (o "Sin nombre" si no tiene), su email, la fecha de alta bajo la etiqueta "Miembro desde" en formato largo en castellano, y un botón "Cerrar sesión".

#### Scenario: Perfil de una cuenta sin nombre

- **WHEN** una persona registrada sin nombre abre su perfil
- **THEN** ve "Sin nombre" en lugar del nombre, junto a su email y sus iniciales

#### Scenario: Fecha de alta

- **WHEN** una persona dada de alta el 3 de noviembre de 2026 abre su perfil
- **THEN** ve "Miembro desde" seguido de "3 de noviembre de 2026"

### Requirement: Cierre de sesión desde la web

La aplicación web SHALL cerrar la sesión en el navegador al pulsar "Cerrar sesión" y llevar a la persona a la pantalla de inicio de sesión, aunque la petición de cierre al servidor falle.

#### Scenario: Cerrar sesión

- **WHEN** una persona pulsa "Cerrar sesión" en su perfil
- **THEN** llega a la pantalla de inicio de sesión sin ningún aviso de error, y al recargar sigue sin sesión

#### Scenario: Cerrar sesión con el servidor caído

- **WHEN** una persona pulsa "Cerrar sesión" y el servidor no responde
- **THEN** igualmente llega a la pantalla de inicio de sesión y deja de tener sesión en ese navegador
