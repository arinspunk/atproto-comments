# Spec Delta

## Purpose

Define cómo el visitante elige la app AT Protocol con la que abrir un post para comentar o responder: apps conocidas, dominio personalizado, preferencia recordada y comportamiento del selector en cualquier navegador, tenga o no Popover API.

## ADDED Requirements

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
Elegir una app conocida o enviar un dominio personalizado válido SHALL abrir el post de destino en esa app en una pestaña nueva, recordar la elección como preferida y cerrar el selector.

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
