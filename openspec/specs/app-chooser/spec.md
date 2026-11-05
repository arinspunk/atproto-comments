# app-chooser Specification

## Purpose

Define cómo el visitante elige la app AT Protocol con la que abrir un post para comentar o responder: apps conocidas, dominio personalizado, preferencia recordada y comportamiento del panel de apps (un `<dialog>` modal anclado abajo) en cualquier navegador.

## Requirements

### Requirement: Elegir una app abre el post en ella
Elegir una app de la lista o enviar un dominio personalizado válido SHALL abrir el post de destino en esa app en una pestaña nueva, recordar la elección como preferida y cerrar el panel. Cada app de la lista SHALL abrir el post con su propia ruta; un dominio personalizado SHALL usar la ruta de bsky.app (`/profile/<did>/post/<rkey>`). Enviar un dominio inválido SHALL mostrar al visitante, y anunciar a las tecnologías de asistencia, el mensaje de la cadena `invalidDomain`.

#### Scenario: App conocida
- **WHEN** el visitante elige "Mu" en el panel
- **THEN** se abre `https://mu.social/profile/<did>/post/<rkey>` en una pestaña nueva
- **AND** el panel se cierra

#### Scenario: App con una ruta propia
- **WHEN** el visitante elige una app de la lista cuya ruta de post no es la de bsky.app
- **THEN** se abre el post con la ruta de esa app, no con `/profile/<did>/post/<rkey>`

#### Scenario: Dominio personalizado
- **WHEN** el visitante escribe un dominio válido en "Other app" y pulsa Enter o el botón de envío
- **THEN** se abre `https://<dominio>/profile/<did>/post/<rkey>` en una pestaña nueva
- **AND** el panel se cierra

#### Scenario: Dominio inválido
- **WHEN** el visitante envía un valor que no es un dominio válido
- **THEN** no se abre nada, el campo se marca como inválido y el panel sigue abierto
- **AND** se muestra el mensaje de `invalidDomain` ("Invalid domain" en inglés, "Domínio inválido" en portugués, o el valor personalizado en `strings`)
- **AND** un lector de pantalla anuncia ese mensaje

#### Scenario: Corregir el dominio
- **WHEN** después de un dominio inválido el visitante escribe un dominio válido y lo envía
- **THEN** el campo deja de estar marcado como inválido y se abre el post en esa app

### Requirement: La app preferida se resalta
Al abrir el panel, si la app recordada como preferida está en la lista, SHALL aparecer la primera, con la etiqueta de la cadena `lastUsed`, y no repetida más abajo. Si la preferida es un dominio personalizado, SHALL aparecer prellenado en el campo "Other app" y la lista SHALL mantener su orden habitual.

#### Scenario: Preferencia previa
- **WHEN** el visitante eligió Deer anteriormente y abre de nuevo el panel
- **THEN** Deer aparece la primera, con la etiqueta «Last used», y no vuelve a aparecer en la lista

#### Scenario: Preferencia de dominio personalizado
- **WHEN** el visitante eligió `app.example` anteriormente y abre de nuevo el panel
- **THEN** el campo "Other app" contiene `app.example` y ninguna app lleva la etiqueta «Last used»

#### Scenario: Preferencia guardada por la versión 1.x
- **WHEN** el visitante eligió Mu con la versión 1.x del componente y visita una página con la 2.0
- **THEN** Mu aparece la primera, con la etiqueta «Last used»

### Requirement: El selector se muestra por encima del contenido y dentro de la ventana
El panel abierto SHALL mostrarse anclado al borde inferior de la ventana, a todo su ancho y por encima del resto de la página, aunque un ancestro del elemento cree un bloque contenedor o un contexto de apilamiento. Su contenido SHALL ir en una columna centrada de ancho limitado. Si no cabe en la altura de la ventana, SHALL desplazarse dentro del panel sin salirse de ella.

#### Scenario: Botón cerca del borde inferior
- **WHEN** el visitante pulsa "Responder" en una respuesta situada al final de la ventana
- **THEN** el panel se muestra completo, anclado al borde inferior, igual que desde cualquier otro botón

#### Scenario: Escritorio
- **WHEN** el visitante abre el panel en una ventana de 1440 px de ancho
- **THEN** el panel ocupa todo el ancho en la parte inferior y la lista de apps va en una columna centrada

#### Scenario: Móvil
- **WHEN** el visitante abre el panel en una ventana de 320 px de ancho
- **THEN** el panel ocupa todo el ancho, se ve entero o se desplaza por dentro, y la página no hace scroll horizontal

#### Scenario: Ancestro con transform
- **WHEN** el elemento está dentro de un contenedor con `transform` y `z-index`
- **THEN** el panel se muestra igual, anclado al borde inferior de la ventana y por encima de todo

### Requirement: Estado accesible del botón
El botón que abre el panel SHALL anunciar a las tecnologías de asistencia que abre un diálogo. El panel SHALL exponerse como un diálogo modal cuyo nombre accesible es el texto de su cabecera. El botón SHALL NOT anunciarse como un menú emergente, porque el panel no es un menú.

#### Scenario: Estado inicial
- **WHEN** se renderiza el botón "Reply" y el panel no se ha abierto nunca
- **THEN** el botón tiene `aria-haspopup="dialog"` y no tiene `aria-expanded`

#### Scenario: Sin rol de menú
- **WHEN** se inspecciona el botón en el árbol de accesibilidad
- **THEN** no se anuncia como botón de menú

#### Scenario: Lector de pantalla
- **WHEN** el visitante abre el panel desde "Reply" bajo una respuesta de "Ana" con un lector de pantalla activo
- **THEN** se anuncia un diálogo llamado «Reply to Ana in…»

### Requirement: El campo de dominio personalizado tiene nombre accesible
El campo para escribir un dominio personalizado SHALL tener como nombre accesible el texto de la cadena `otherApp`, sin depender de su placeholder.

#### Scenario: Lector de pantalla en el campo
- **WHEN** el foco llega al campo de dominio personalizado con un lector de pantalla activo
- **THEN** el campo se anuncia como "Other app" (o el valor de `otherApp` en el idioma o las `strings` activas)

### Requirement: El selector funciona sin almacenamiento local
Si el navegador no permite leer o escribir el almacenamiento local (iframes de terceros con el almacenamiento bloqueado, contextos sandbox, ajustes de privacidad), el componente SHALL renderizarse por completo y el panel SHALL funcionar igual, salvo que no recuerde ni destaque una app preferida.

#### Scenario: Almacenamiento no disponible
- **WHEN** el acceso al almacenamiento local lanza un error y el visitante abre el panel y elige "Deer"
- **THEN** el hilo y el panel se muestran sin errores
- **AND** se abre el post en Deer
- **AND** al volver a abrir el panel ninguna app lleva la etiqueta «Last used» y la lista mantiene su orden habitual

### Requirement: El botón de enviar dominio tiene nombre accesible
El botón que envía el dominio personalizado SHALL tener como nombre accesible el texto de la cadena `go`. La flecha visible SHALL quedar oculta a las tecnologías de asistencia.

#### Scenario: Nombre en inglés
- **WHEN** el visitante recorre el selector con un lector de pantalla en una página `lang="en"`
- **THEN** el botón junto al campo «Other app» se anuncia como «Open»

#### Scenario: Nombre personalizado
- **WHEN** el componente recibe `strings='{"go":"Ir"}'`
- **THEN** el nombre accesible del botón es «Ir» y la flecha sigue visible

### Requirement: La acción abre el panel de apps
Al activar el botón principal ("Comentar") o el de una respuesta ("Responder"), el componente SHALL mostrar un panel modal con una cabecera que indica la acción, la lista de apps y un campo para un dominio personalizado. La cabecera SHALL ser el texto de `commentIn` para el botón principal y el de `replyIn`, con el nombre del autor, para el de una respuesta. NO SHALL navegar a ninguna app sin que el visitante la elija.

#### Scenario: Comentar
- **WHEN** el visitante pulsa "Comment" en una página `lang="en"`
- **THEN** se muestra el panel con la cabecera «Comment in…», la lista de apps y el campo "Other app"
- **AND** la página no navega

#### Scenario: Responder
- **WHEN** el visitante pulsa "Reply" bajo una respuesta de "Ana"
- **THEN** se muestra el panel con la cabecera «Reply to Ana in…»
- **AND** la página no navega

#### Scenario: Safari/iOS 15.4–16
- **WHEN** el visitante pulsa "Reply" en Safari de iOS entre 15.4 y 16
- **THEN** se muestra el mismo panel, con la misma lista y el mismo campo, que en un navegador actual

#### Scenario: Autor sin nombre
- **WHEN** el visitante pulsa "Reply" bajo una respuesta cuyo autor no tiene nombre visible ni handle (o los tiene vacíos)
- **THEN** la cabecera del panel usa el mismo nombre que la cabecera de la respuesta, el texto de `unknownAuthor` («Reply to Unknown in…»), y no «Reply to  in…»

#### Scenario: Respuesta sin DID del autor
- **WHEN** se renderiza una respuesta cuyo autor no tiene DID
- **THEN** la respuesta no tiene botón "Reply", porque no hay post al que enviar al visitante

### Requirement: Cierre del panel
El panel abierto SHALL cerrarse al pulsar Escape, al pulsar su botón de cerrar, al pulsar fuera de él o al elegir una app. Al cerrarse, el foco SHALL volver al botón que lo abrió. El scroll y el redimensionado de la ventana NO SHALL cerrarlo. Como mucho SHALL haber un panel abierto a la vez.

#### Scenario: Pulsar de nuevo el botón
- **WHEN** el panel está abierto y el visitante pulsa donde está el botón que lo abrió
- **THEN** el panel se cierra, porque la pulsación queda fuera de él, y no se vuelve a abrir

#### Scenario: Botón de cerrar
- **WHEN** el panel está abierto y el visitante pulsa su botón de cerrar
- **THEN** el panel se cierra
- **AND** el foco vuelve al botón que lo abrió

#### Scenario: Pulsar fuera
- **WHEN** el panel está abierto y el visitante pulsa en la zona de la página que queda fuera de él
- **THEN** el panel se cierra

#### Scenario: Escape
- **WHEN** el panel está abierto y el visitante pulsa Escape
- **THEN** el panel se cierra
- **AND** el foco vuelve al botón que lo abrió

#### Scenario: Scroll o redimensionado
- **WHEN** el panel está abierto y la página hace scroll o la ventana cambia de tamaño
- **THEN** el panel sigue abierto

#### Scenario: Escribir con el teclado virtual
- **WHEN** el visitante toca el campo "Other app" en un móvil y la apertura del teclado desplaza o redimensiona la página
- **THEN** el panel sigue abierto y el visitante puede escribir y enviar el dominio

#### Scenario: Abrir otro selector
- **WHEN** el panel abierto desde una respuesta está abierto y el visitante pulsa "Reply" en otra
- **THEN** el panel se cierra, porque la pulsación queda fuera de él, y hace falta otra pulsación para abrirlo desde la segunda respuesta

#### Scenario: Un solo panel
- **WHEN** hay dos elementos `<atproto-comments>` en la página y el panel de uno está abierto
- **THEN** el resto de la página, incluido el otro elemento, no responde a clics ni al teclado hasta que el panel se cierra

### Requirement: Apps de la lista
La lista SHALL contener solo apps web en las que cualquier cuenta AT Protocol puede iniciar sesión y responder a un post abriendo su URL. Bluesky SHALL ir la primera y el resto por orden alfabético de su nombre visible, salvo la app preferida, que va delante de todas.

#### Scenario: Sin preferencia
- **WHEN** el visitante abre el panel sin haber elegido nunca una app
- **THEN** Bluesky aparece la primera y el resto de apps le siguen en orden alfabético

#### Scenario: Apps conocidas
- **WHEN** el visitante abre el panel
- **THEN** Bluesky, Mu y Deer aparecen en la lista

### Requirement: Texto explicativo opcional
El panel SHALL mostrar bajo la cabecera el texto de la cadena `pickerNote` cuando no está vacío. Cuando está vacío, que es su valor por defecto, el panel SHALL NOT dejar un hueco ni un elemento vacío en su lugar.

#### Scenario: Por defecto
- **WHEN** el visitante abre el panel sin `pickerNote` en `strings`
- **THEN** no hay texto ni hueco entre la cabecera y la lista de apps

#### Scenario: Texto personalizado
- **WHEN** el componente recibe `strings='{"pickerNote":"Necesitas una cuenta para responder."}'` y el visitante abre el panel
- **THEN** el texto «Necesitas una cuenta para responder.» aparece entre la cabecera y la lista de apps

### Requirement: El panel tiene un botón de cerrar con nombre accesible
El panel SHALL tener un botón de cerrar cuyo nombre accesible es el texto de la cadena `close`.

#### Scenario: Nombre en inglés
- **WHEN** el visitante recorre el panel con un lector de pantalla en una página `lang="en"`
- **THEN** el botón de cerrar se anuncia como «Close»

### Requirement: El foco entra en el panel
Al abrirse el panel, el foco SHALL pasar a un elemento del panel, y SHALL NOT poder salir de él con Tab mientras está abierto.

#### Scenario: Navegación con teclado
- **WHEN** el visitante abre el panel con Enter desde el botón "Comment" y pulsa Tab varias veces
- **THEN** el foco recorre solo el botón de cerrar, las apps, el campo "Other app" y su botón de envío

### Requirement: El panel se cierra si cambia lo que muestra el elemento
Si mientras el panel está abierto el elemento vuelve a renderizar (porque cambia `thread-uri`, `appview`, `max-depth`, `lang` o `strings`) o se quita de la página, el panel SHALL cerrarse, para no abrir un post de otro hilo ni mostrar textos desactualizados.

#### Scenario: Cambia el hilo
- **WHEN** el panel está abierto y la web cambia el atributo `thread-uri` del elemento
- **THEN** el panel se cierra

#### Scenario: Cambia el idioma
- **WHEN** el panel está abierto y la web cambia el atributo `lang` del elemento
- **THEN** el panel se cierra, y al volver a abrirlo su cabecera está en el idioma nuevo

#### Scenario: Foco tras el cierre
- **WHEN** el panel se cierra porque el elemento vuelve a renderizar y el botón que lo abrió ya no existe
- **THEN** el foco pasa al botón principal del nuevo render, o al propio elemento si todavía no hay botón (mientras carga otro hilo), y no se pierde en el `<body>`

#### Scenario: Se quita el elemento
- **WHEN** el panel está abierto y la web quita el elemento de la página
- **THEN** el panel deja de verse y la página vuelve a responder a clics y al teclado
