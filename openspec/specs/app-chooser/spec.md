# app-chooser Specification

## Purpose

Define cómo el visitante elige la app AT Protocol con la que abrir un post para comentar o responder: apps conocidas, dominio personalizado, preferencia recordada y comportamiento del selector en cualquier navegador, tenga o no Popover API.

## Requirements

### Requirement: La acción abre un selector de apps
Al activar el botón principal ("Comentar") o el de una respuesta ("Responder"), el componente SHALL mostrar un selector con las apps conocidas y un campo para un dominio personalizado. NO SHALL navegar a ninguna app sin que el visitante la elija.

#### Scenario: Navegador con Popover API
- **WHEN** el visitante pulsa "Responder" en un navegador con Popover API
- **THEN** se muestra el selector con Bluesky, Mu, Deer y el campo "Otra app"
- **AND** la página no navega

#### Scenario: Navegador sin Popover API
- **WHEN** el visitante pulsa "Responder" en iOS 16 (sin Popover API)
- **THEN** se muestra el mismo selector con Bluesky, Mu, Deer y el campo "Otra app"
- **AND** la página no navega a bsky.app

### Requirement: Elegir una app abre el post en ella
Elegir una app conocida o enviar un dominio personalizado válido SHALL abrir el post de destino en esa app en una pestaña nueva, recordar la elección como preferida y cerrar el selector. Enviar un dominio inválido SHALL mostrar al visitante, y anunciar a las tecnologías de asistencia, el mensaje de la cadena `invalidDomain`.

#### Scenario: App conocida
- **WHEN** el visitante elige "Mu" en el selector
- **THEN** se abre `https://mu.social/profile/<did>/post/<rkey>` en una pestaña nueva
- **AND** el selector se cierra

#### Scenario: Dominio personalizado
- **WHEN** el visitante escribe un dominio válido en "Otra app" y pulsa Enter o el botón de envío
- **THEN** se abre `https://<dominio>/profile/<did>/post/<rkey>` en una pestaña nueva
- **AND** el selector se cierra

#### Scenario: Dominio inválido
- **WHEN** el visitante envía un valor que no es un dominio válido
- **THEN** no se abre nada, el campo se marca como inválido y el selector sigue abierto
- **AND** se muestra el mensaje de `invalidDomain` ("Invalid domain" en inglés, "Domínio inválido" en portugués, o el valor personalizado en `strings`)
- **AND** un lector de pantalla anuncia ese mensaje

#### Scenario: Corregir el dominio
- **WHEN** después de un dominio inválido el visitante escribe un dominio válido y lo envía
- **THEN** el campo deja de estar marcado como inválido y se abre el post en esa app

### Requirement: La app preferida se resalta
Al abrir el selector, la app recordada como preferida SHALL aparecer resaltada; si la preferida es un dominio personalizado, SHALL aparecer prellenado en el campo "Otra app".

#### Scenario: Preferencia previa
- **WHEN** el visitante eligió Deer anteriormente y abre de nuevo el selector
- **THEN** Deer aparece resaltada

### Requirement: Cierre del selector
El selector abierto SHALL cerrarse al pulsar de nuevo el botón que lo abrió, al pulsar fuera de él, al pulsar Escape, al hacer scroll o al redimensionar la ventana. El scroll y el redimensionado NO SHALL cerrarlo mientras el foco esté dentro del selector (p. ej. escribiendo en "Otra app" con el teclado virtual abierto). Como mucho SHALL haber un selector abierto a la vez.

#### Scenario: Pulsar de nuevo el botón
- **WHEN** el selector está abierto y el visitante pulsa el mismo botón que lo abrió
- **THEN** el selector se cierra

#### Scenario: Pulsar fuera
- **WHEN** el selector está abierto y el visitante pulsa en otra zona de la página
- **THEN** el selector se cierra

#### Scenario: Escape
- **WHEN** el selector está abierto y el visitante pulsa Escape
- **THEN** el selector se cierra
- **AND** el foco vuelve al botón que lo abrió

#### Scenario: Scroll sin foco en el selector
- **WHEN** el selector está abierto, el foco no está dentro de él y la página hace scroll
- **THEN** el selector se cierra

#### Scenario: Escribir con el teclado virtual
- **WHEN** el visitante toca el campo "Otra app" en un móvil y la apertura del teclado desplaza o redimensiona la página
- **THEN** el selector sigue abierto y el visitante puede escribir y enviar el dominio

#### Scenario: Abrir otro selector
- **WHEN** el selector de una respuesta está abierto y el visitante pulsa "Responder" en otra
- **THEN** el primero se cierra y se abre el segundo

### Requirement: El selector se muestra por encima del contenido y dentro de la ventana
El selector abierto SHALL mostrarse junto a su botón, por encima del resto del contenido de la página y sin salirse horizontalmente de la ventana; si no cabe debajo del botón, SHALL mostrarse encima.

#### Scenario: Botón cerca del borde inferior
- **WHEN** el visitante pulsa "Responder" en una respuesta situada al final de la ventana
- **THEN** el selector se muestra encima del botón, completamente visible

### Requirement: Estado accesible del botón
El botón que abre el selector SHALL indicar que abre un menú emergente, SHALL exponer a las tecnologías de asistencia si el selector está abierto o cerrado desde que se renderiza, y SHALL estar relacionado con el selector que controla, tenga o no el navegador Popover API.

#### Scenario: Estado inicial
- **WHEN** se renderiza el botón y el selector no se ha abierto nunca
- **THEN** el botón se expone como contraído

#### Scenario: Lector de pantalla
- **WHEN** el visitante abre el selector con un lector de pantalla activo
- **THEN** el botón se anuncia como expandido, y como contraído tras cerrarse

### Requirement: El campo de dominio personalizado tiene nombre accesible
El campo para escribir un dominio personalizado SHALL tener como nombre accesible el texto de la cadena `otherApp`, sin depender de su placeholder.

#### Scenario: Lector de pantalla en el campo
- **WHEN** el foco llega al campo de dominio personalizado con un lector de pantalla activo
- **THEN** el campo se anuncia como "Other app" (o el valor de `otherApp` en el idioma o las `strings` activas)

### Requirement: El selector funciona sin almacenamiento local
Si el navegador no permite leer o escribir el almacenamiento local (iframes de terceros con el almacenamiento bloqueado, contextos sandbox, ajustes de privacidad), el componente SHALL renderizarse por completo y el selector SHALL funcionar igual, salvo que no recuerde ni resalte una app preferida.

#### Scenario: Almacenamiento no disponible
- **WHEN** el acceso al almacenamiento local lanza un error y el visitante abre el selector y elige "Deer"
- **THEN** el hilo y el selector se muestran sin errores
- **AND** se abre el post en Deer
- **AND** al volver a abrir el selector ninguna app aparece resaltada
