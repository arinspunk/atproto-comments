# Spec Delta

## MODIFIED Requirements

### Requirement: Claves de cadena documentadas
El conjunto de claves aceptadas en `strings` SHALL estar documentado públicamente, junto con su texto en inglés y los marcadores que admite cada una.

#### Scenario: Consulta de la documentación
- **WHEN** quien integra el componente consulta el README
- **THEN** encuentra la tabla de claves (`reply`, `replyTo`, `comment`, `commentIn`, `replyIn`, `pickerNote`, `close`, `lastUsed`, `otherApp`, `inputPlaceholder`, `go`, `error`, `now`, `minutes`, `hours`, `days`, `months`, `viewMore`, `invalidDomain`, `unknownAuthor`) con su texto por defecto

## ADDED Requirements

### Requirement: Textos del panel de apps en los diccionarios incluidos
Los diccionarios incluidos SHALL traer las claves `commentIn` («Comment in…» / «Comentar em…»), `replyIn` («Reply to {name} in…» / «Responder a {name} em…»), `close` («Close» / «Fechar») y `lastUsed` («Last used» / «Última usada»). `pickerNote` SHALL estar vacía en los dos. `replyIn` SHALL admitir el marcador `{name}`, como `replyTo`.

#### Scenario: Portugués
- **WHEN** la página tiene `lang="pt"` y el visitante pulsa «Comentar»
- **THEN** la cabecera del panel es «Comentar em…» y el botón de cerrar se llama «Fechar»

#### Scenario: Cadena personalizada con marcador
- **WHEN** el componente recibe `strings='{"replyIn":"Responder a {name} con…"}'` y el visitante pulsa «Reply» bajo una respuesta de "Ana"
- **THEN** la cabecera del panel es «Responder a Ana con…»
