# ui-localization Specification

## Purpose

Define cómo el componente decide el idioma y los textos de su interfaz: diccionarios incluidos, cadenas aportadas por quien lo integra y formato de fechas según el idioma de la página.

## Requirements

### Requirement: Diccionario incluido según el idioma resuelto
El componente SHALL tomar el idioma del atributo `lang` o, si falta, de `<html lang>`, usando solo el subtag primario. Si existe un diccionario incluido para ese idioma (`pt`, `en`), SHALL usarlo; en caso contrario SHALL usar `en`.

#### Scenario: Idioma con diccionario incluido
- **WHEN** el componente tiene `lang="pt-BR"` y no recibe `strings`
- **THEN** el botón principal muestra "Comentar" y el de respuesta "Responder"

#### Scenario: Idioma sin diccionario incluido
- **WHEN** la página tiene `<html lang="es">` y el componente no recibe `strings`
- **THEN** la interfaz muestra las cadenas en inglés ("Comment", "Reply")

### Requirement: Cadenas aportadas mediante atributo
El componente SHALL aceptar un atributo `strings` cuyo valor es un objeto JSON de clave a texto. Cada clave conocida con valor de tipo cadena SHALL sustituir al texto del diccionario resuelto; las claves no proporcionadas SHALL seguir saliendo del diccionario resuelto.

#### Scenario: Sustitución parcial
- **WHEN** el componente recibe `strings='{"comment":"Comentar","reply":"Responder"}'` en una página `lang="es"`
- **THEN** los botones muestran "Comentar" y "Responder"
- **AND** el mensaje de error, si aparece, se muestra en inglés porque no se proporcionó

### Requirement: Cadenas aportadas mediante propiedad
El componente SHALL aceptar una propiedad JS `strings` con un objeto de clave a texto, con la misma semántica que el atributo. Si se proporcionan ambos, la propiedad SHALL tener prioridad clave a clave sobre el atributo. La propiedad se SHALL poder asignar antes o después de insertar el elemento, y también antes de que se registre el custom element. Cada asignación SHALL aplicarse a la interfaz.

#### Scenario: Propiedad asignada antes de conectar
- **WHEN** se crea el elemento, se asigna `el.strings = { comment: "Kommentieren" }` y después se inserta en el documento
- **THEN** el botón principal muestra "Kommentieren"

#### Scenario: Atributo y propiedad a la vez
- **WHEN** el atributo `strings` define `comment` como "A" y la propiedad define `comment` como "B"
- **THEN** el botón principal muestra "B"

#### Scenario: Propiedad asignada después de conectar
- **WHEN** el elemento ya muestra el hilo y se asigna `el.strings = { comment: "Kommentieren" }`
- **THEN** el botón principal pasa a mostrar "Kommentieren"

#### Scenario: Propiedad asignada antes de registrar el elemento
- **WHEN** la página asigna `el.strings = { comment: "Kommentieren" }` a un `<atproto-comments>` que ya está en el documento y después se carga el script del componente
- **THEN** el botón principal muestra "Kommentieren"

#### Scenario: Quitar la propiedad
- **WHEN** en un elemento conectado se asigna `el.strings = undefined`
- **THEN** la interfaz vuelve a los textos del atributo `strings`, o a los del diccionario resuelto si no hay atributo

### Requirement: Cadenas inválidas se ignoran sin romper el renderizado
El componente SHALL ignorar un atributo `strings` que no sea JSON válido o no sea un objeto, y SHALL ignorar las claves desconocidas y los valores que no sean cadena. En todos esos casos SHALL renderizar con el diccionario resuelto.

#### Scenario: JSON mal formado
- **WHEN** el atributo `strings` vale `{comment:`
- **THEN** los comentarios se renderizan con normalidad y con las cadenas del diccionario resuelto

#### Scenario: Valor que no es cadena
- **WHEN** `strings` vale `{"comment": 42, "reply": "Responder"}`
- **THEN** el botón principal usa el texto del diccionario y el de respuesta muestra "Responder"

### Requirement: Variables dentro de cadenas aportadas
Las cadenas aportadas SHALL admitir los mismos marcadores que las incluidas. En particular, `replyTo` SHALL sustituir `{name}` por el nombre del autor de la respuesta.

#### Scenario: Etiqueta accesible de respuesta
- **WHEN** `strings` define `replyTo` como "Responder a {name}" y una respuesta es de "Ana"
- **THEN** el botón de responder de esa respuesta tiene `aria-label="Responder a Ana"`

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
