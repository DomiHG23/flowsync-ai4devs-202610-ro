## MODIFIED Requirements

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer una pantalla de registro con los campos nombre completo (marcado como opcional), email, contraseña (con la indicación "Entre 8 y 32 caracteres.") y repetición de contraseña, un botón "Crear cuenta" y un enlace "Inicia sesión" que lleva a la pantalla de inicio de sesión. Un nombre vacío o formado solo por espacios SHALL enviarse como ausencia de nombre.

#### Scenario: Registro correcto desde la web

- **WHEN** una persona sin sesión rellena el formulario de registro con datos válidos y pulsa "Crear cuenta"
- **THEN** queda con la sesión iniciada y ve la lista de tareas

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
- **THEN** queda con la sesión iniciada y ve la lista de tareas

#### Scenario: Credenciales incorrectas desde la web

- **WHEN** la persona introduce un email o una contraseña incorrectos y pulsa "Entrar"
- **THEN** ve un aviso destacado sobre el formulario con el texto "El email o la contraseña no son correctos." y sigue en la pantalla de inicio de sesión

### Requirement: Protección de pantallas según la sesión

La aplicación web SHALL mostrar las pantallas de perfil y de lista de tareas solo a personas con sesión iniciada, SHALL mostrar las pantallas de inicio de sesión y registro solo a personas sin sesión, y SHALL redirigir cualquier dirección desconocida a la lista de tareas.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre la dirección del perfil
- **THEN** es redirigida a la pantalla de inicio de sesión

#### Scenario: Login con sesión

- **WHEN** una persona con sesión iniciada abre la dirección de inicio de sesión o la de registro
- **THEN** es redirigida a la lista de tareas

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no corresponde a ninguna pantalla
- **THEN** es redirigida a la lista de tareas, y de ahí al inicio de sesión si no tiene sesión
