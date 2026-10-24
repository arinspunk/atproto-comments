# Spec Delta

## MODIFIED Requirements

### Requirement: Fechas absolutas en el idioma de la página
El componente SHALL formatear la fecha absoluta (título del `<time>`) con el idioma completo del atributo `lang` o de `<html lang>`, aunque no exista diccionario incluido para él. Si ese idioma no es válido para el formateador, SHALL caer en el idioma resuelto. La fecha visible de una respuesta de hace más de un año SHALL usar el formato corto de ese mismo idioma.

#### Scenario: Idioma sin diccionario
- **WHEN** la página tiene `<html lang="es-ES">`
- **THEN** el título de cada `<time>` muestra la fecha con formato español (p. ej. `14/10/26, 19:48`)

#### Scenario: Respuesta de hace más de un año en inglés de EE. UU.
- **WHEN** la página tiene `lang="en-US"` y una respuesta es del 2 de enero de 2020
- **THEN** su fecha visible es `1/2/20`

#### Scenario: Respuesta de hace más de un año en portugués
- **WHEN** la página tiene `lang="pt-PT"` y una respuesta es del 2 de enero de 2020
- **THEN** su fecha visible es `02/01/20`

### Requirement: Claves de cadena documentadas
El conjunto de claves aceptadas en `strings` SHALL estar documentado públicamente, junto con su texto en inglés y los marcadores que admite cada una.

#### Scenario: Consulta de la documentación
- **WHEN** quien integra el componente consulta el README
- **THEN** encuentra la tabla de claves (`reply`, `replyTo`, `comment`, `otherApp`, `inputPlaceholder`, `go`, `error`, `now`, `minutes`, `hours`, `days`, `months`, `viewMore`, `invalidDomain`, `unknownAuthor`) con su texto por defecto

## ADDED Requirements

### Requirement: Autor sin nombre
Cuando una respuesta no trae nombre visible ni handle del autor, el componente SHALL mostrar como nombre el texto de la cadena `unknownAuthor`.

#### Scenario: Diccionario incluido
- **WHEN** la página tiene `lang="pt"` y el autor de una respuesta no tiene nombre ni handle
- **THEN** el nombre del autor es «Desconhecido»

#### Scenario: Cadena personalizada
- **WHEN** el componente recibe `strings='{"unknownAuthor":"Anónimo"}'` y el autor no tiene nombre ni handle
- **THEN** el nombre del autor es «Anónimo»

### Requirement: Texto por defecto del enlace a más respuestas
El texto por defecto de `viewMore` SHALL no nombrar una app concreta, porque el enlace abre en la app preferida del visitante: «View more replies» en inglés y «Ver mais respostas» en portugués.

#### Scenario: Sin cadena personalizada
- **WHEN** una respuesta tiene más respuestas de las cargadas en una página `lang="en"`
- **THEN** el enlace bajo ella dice «View more replies»
