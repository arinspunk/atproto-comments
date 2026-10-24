# Spec Delta

## MODIFIED Requirements

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
