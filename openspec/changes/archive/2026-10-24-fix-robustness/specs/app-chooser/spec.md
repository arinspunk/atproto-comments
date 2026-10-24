# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
