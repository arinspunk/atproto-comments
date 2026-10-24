# Spec Delta

## MODIFIED Requirements

### Requirement: Estado accesible del botón
El botón que abre el selector SHALL exponer a las tecnologías de asistencia si el selector está abierto o cerrado desde que se renderiza, y SHALL estar relacionado con el selector que controla, tenga o no el navegador Popover API. El botón SHALL NOT anunciarse como un menú emergente, porque el selector no es un menú.

#### Scenario: Estado inicial
- **WHEN** se renderiza el botón y el selector no se ha abierto nunca
- **THEN** el botón se expone como contraído

#### Scenario: Lector de pantalla
- **WHEN** el visitante abre el selector con un lector de pantalla activo
- **THEN** el botón se anuncia como expandido, y como contraído tras cerrarse

#### Scenario: Sin rol de menú
- **WHEN** se inspecciona el botón en el árbol de accesibilidad
- **THEN** no tiene `aria-haspopup` ni se anuncia como botón de menú

## ADDED Requirements

### Requirement: El botón de enviar dominio tiene nombre accesible
El botón que envía el dominio personalizado SHALL tener como nombre accesible el texto de la cadena `go`. La flecha visible SHALL quedar oculta a las tecnologías de asistencia.

#### Scenario: Nombre en inglés
- **WHEN** el visitante recorre el selector con un lector de pantalla en una página `lang="en"`
- **THEN** el botón junto al campo «Other app» se anuncia como «Open»

#### Scenario: Nombre personalizado
- **WHEN** el componente recibe `strings='{"go":"Ir"}'`
- **THEN** el nombre accesible del botón es «Ir» y la flecha sigue visible
