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
El componente SHALL aceptar una propiedad JS `strings` con un objeto de clave a texto, con la misma semántica que el atributo. Si se proporcionan ambos, la propiedad SHALL tener prioridad clave a clave sobre el atributo.

#### Scenario: Propiedad asignada antes de conectar
- **WHEN** se crea el elemento, se asigna `el.strings = { comment: "Kommentieren" }` y después se inserta en el documento
- **THEN** el botón principal muestra "Kommentieren"

#### Scenario: Atributo y propiedad a la vez
- **WHEN** el atributo `strings` define `comment` como "A" y la propiedad define `comment` como "B"
- **THEN** el botón principal muestra "B"

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
El componente SHALL formatear la fecha absoluta (título del `<time>`) con el idioma completo del atributo `lang` o de `<html lang>`, aunque no exista diccionario incluido para él. Si ese idioma no es válido para el formateador, SHALL caer en el idioma resuelto.

#### Scenario: Idioma sin diccionario
- **WHEN** la página tiene `<html lang="es-ES">`
- **THEN** el título de cada `<time>` muestra la fecha con formato español (p. ej. `14/10/26, 19:48`)

### Requirement: Claves de cadena documentadas
El conjunto de claves aceptadas en `strings` SHALL estar documentado públicamente, junto con su texto en inglés y los marcadores que admite cada una.

#### Scenario: Consulta de la documentación
- **WHEN** quien integra el componente consulta el README
- **THEN** encuentra la tabla de claves (`reply`, `replyTo`, `comment`, `otherApp`, `inputPlaceholder`, `error`, `now`, `minutes`, `hours`, `days`, `months`, `viewMore`, `invalidDomain`) con su texto por defecto
