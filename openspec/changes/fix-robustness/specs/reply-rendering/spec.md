# Spec Delta

## ADDED Requirements

### Requirement: Las respuestas ocultadas en el threadgate no se muestran
El componente NO SHALL mostrar ninguna respuesta cuya AT-URI figure en la lista `hiddenReplies` del threadgate del post raíz, ni ninguna de sus subrespuestas. Las demás respuestas SHALL mostrarse igual que si la lista no existiera. Una lista ausente o con entradas que no sean URIs SHALL tratarse como si no ocultara nada válido.

#### Scenario: Respuesta ocultada por el autor
- **WHEN** el threadgate del post raíz tiene `hiddenReplies: ["at://did:plc:x/app.bsky.feed.post/abc"]` y el hilo contiene esa respuesta
- **THEN** la respuesta `at://did:plc:x/app.bsky.feed.post/abc` no aparece en la lista

#### Scenario: Subrespuestas de una respuesta ocultada
- **WHEN** una respuesta ocultada en el threadgate tiene subrespuestas
- **THEN** tampoco aparece ninguna de esas subrespuestas

#### Scenario: Hilo sin threadgate
- **WHEN** el post raíz no tiene threadgate o su lista `hiddenReplies` está vacía
- **THEN** se muestran todas las respuestas que no estén ocultas por etiquetas

#### Scenario: Lista con entradas no válidas
- **WHEN** `hiddenReplies` contiene valores que no son cadenas junto a URIs válidas
- **THEN** se ocultan solo las respuestas con esas URIs válidas y el componente se renderiza sin errores

### Requirement: El avatar provisional se renderiza sin Intl.Segmenter
Cuando un autor no tiene avatar o su imagen no carga, el componente SHALL mostrar un avatar provisional con hasta dos iniciales tomadas de su nombre visible o, si no lo tiene, de su handle, también en navegadores sin `Intl.Segmenter`. Si no se puede obtener ninguna inicial, SHALL mostrar `?`. La falta de `Intl.Segmenter` NO SHALL impedir el render del resto del hilo.

#### Scenario: Navegador sin Intl.Segmenter
- **WHEN** se renderiza una respuesta de "Xulio Zé" sin avatar en un navegador sin `Intl.Segmenter` (p. ej. Firefox ESR 115)
- **THEN** el avatar provisional muestra "XZ"
- **AND** el resto del hilo se renderiza

#### Scenario: Handle como fuente de las iniciales
- **WHEN** se renderiza una respuesta sin avatar de un autor sin nombre visible con handle `xulio.ze.example`, en un navegador con o sin `Intl.Segmenter`
- **THEN** el avatar provisional muestra iniciales tomadas del handle, no `?`

#### Scenario: Sin texto del que sacar iniciales
- **WHEN** el autor no tiene nombre visible ni handle
- **THEN** el avatar provisional muestra `?`
