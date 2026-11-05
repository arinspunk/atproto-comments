# reply-rendering Specification

## Purpose

Define cómo se presenta cada respuesta del hilo (autor, handle, fecha y texto) para que se lea correctamente en cualquier navegador, incluidos los que autodetectan datos en el texto.

## Requirements

### Requirement: Nombre y handle separados en el texto
La cabecera de cada respuesta SHALL contener, como texto renderizado, al menos un espacio en blanco entre el nombre visible del autor y su handle (`@handle`). Una separación solo visual por CSS (márgenes, `gap`) o un espacio que el navegador no renderice no cumplen este requisito.

#### Scenario: Texto de la cabecera
- **WHEN** se renderiza una respuesta de "Xulio Zé" con handle `xulioze.com`
- **THEN** el texto renderizado de la cabecera (`innerText`) contiene "Xulio Zé @xulioze.com", no "Xulio Zé@xulioze.com"

#### Scenario: Autor sin nombre visible
- **WHEN** se renderiza una respuesta de un autor sin `displayName`, o con `displayName` vacío, con handle `xulioze.com`
- **THEN** el texto renderizado de la cabecera contiene "xulioze.com @xulioze.com", con espacio

#### Scenario: Data Detectors de iOS
- **WHEN** la respuesta se muestra en Safari o Chrome en iOS y el visitante toca el handle
- **THEN** iOS no lo detecta como dirección de correo y no abre la app de correo
- **AND** se abre el perfil del autor en la app preferida, porque el handle forma parte del enlace del autor

#### Scenario: Aspecto visual equivalente
- **WHEN** se renderiza la cabecera en un navegador de escritorio
- **THEN** nombre, handle y fecha siguen en la misma línea cuando caben, con una separación visual equivalente a la anterior

### Requirement: La cabecera no desborda horizontalmente
La cabecera de cada respuesta SHALL ajustarse al ancho disponible, aunque el nombre o el handle sean palabras largas sin espacios.

#### Scenario: Handle largo en móvil
- **WHEN** se renderiza una respuesta cuyo handle es un dominio largo en una ventana de 320 px de ancho
- **THEN** el handle se parte en varias líneas y la cabecera no provoca scroll horizontal

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

### Requirement: Nombre, handle y fecha con el mismo tamaño de texto
En la cabecera de cada respuesta, el nombre del autor, su handle y la fecha SHALL mostrarse con el mismo tamaño de texto, el definido por `--atproto-font-size`, sea cual sea el tamaño de texto de la página. El nombre SHALL distinguirse solo por el peso de la fuente.

#### Scenario: Página con texto de 16 px
- **WHEN** el componente se muestra en una página cuyo texto base es de 16 px y `--atproto-font-size` tiene su valor por defecto
- **THEN** el nombre, el handle y la fecha se muestran a 14 px (0.875rem)

#### Scenario: Tamaño personalizado
- **WHEN** el integrador define `--atproto-font-size: 1rem`
- **THEN** el nombre, el handle y la fecha se muestran a ese tamaño

### Requirement: Los enlaces del texto abren en la app preferida
Las menciones y el enlace «View more» de una respuesta SHALL abrir en la app elegida en el selector, con sus rutas de perfil o de post, o en bsky.app si no hay preferencia o no hay almacenamiento. Un dominio personalizado SHALL usar las rutas de bsky.app. Los hashtags SHALL abrir en la app elegida solo si está en la lista y tiene ruta de hashtag; si no, en bsky.app. Cada enlace SHALL usar la preferencia vigente cuando el visitante lo abre.

#### Scenario: Sin preferencia
- **WHEN** el visitante no ha elegido ninguna app y abre la mención de un usuario
- **THEN** se abre `https://bsky.app/profile/<did>`

#### Scenario: Preferencia elegida antes
- **WHEN** el visitante eligió Deer en el selector y abre el enlace «View more» de una respuesta
- **THEN** se abre `https://deer.social/profile/<did>/post/<rkey>`

#### Scenario: Preferencia cambiada después del render
- **WHEN** el hilo ya está renderizado, el visitante elige Mu en el selector y después abre una mención
- **THEN** se abre `https://mu.social/profile/<did>`

#### Scenario: App con rutas propias
- **WHEN** el visitante eligió una app de la lista cuya ruta de perfil no es la de bsky.app y abre una mención
- **THEN** se abre el perfil con la ruta de esa app

#### Scenario: Dominio personalizado
- **WHEN** el visitante eligió el dominio personalizado `app.example` y abre una mención
- **THEN** se abre `https://app.example/profile/<did>`

#### Scenario: Hashtag con una app conocida
- **WHEN** el visitante eligió Deer y abre un hashtag
- **THEN** se abre `https://deer.social/hashtag/<tag>`

#### Scenario: Hashtag con una app sin ruta de hashtag
- **WHEN** el visitante eligió una app de la lista que no tiene ruta de hashtag y abre un hashtag
- **THEN** se abre `https://bsky.app/hashtag/<tag>`

#### Scenario: Hashtag con un dominio personalizado
- **WHEN** el visitante eligió el dominio personalizado `app.example` y abre un hashtag
- **THEN** se abre `https://bsky.app/hashtag/<tag>`, porque no se sabe si esa app tiene la ruta `/hashtag/`

#### Scenario: Respuesta sin DID del autor
- **WHEN** una respuesta cuyo autor no tiene DID tiene más respuestas de las cargadas
- **THEN** no se muestra el enlace «View more», porque no hay post al que enlazar

### Requirement: Las respuestas de autores etiquetados no se muestran
Una respuesta cuyo autor lleva sobre su cuenta alguna de las etiquetas que ya ocultan un post SHALL NOT mostrarse, y con ella SHALL ocultarse todo su subárbol de respuestas. Una etiqueta es de la cuenta cuando su `uri` es el DID del autor. Las etiquetas puestas sobre el registro de perfil del autor (`at://<did>/app.bsky.actor.profile/self`) SHALL NOT ocultar sus respuestas.

#### Scenario: Autor etiquetado
- **WHEN** una respuesta la escribe un autor con la etiqueta `!hide` cuyo `uri` es su DID
- **THEN** esa respuesta y sus subrespuestas no aparecen y el resto del hilo sí

#### Scenario: Etiqueta solo en el perfil
- **WHEN** el autor de una respuesta lleva la etiqueta `nudity` con `uri` `at://<did>/app.bsky.actor.profile/self`
- **THEN** la respuesta se muestra

#### Scenario: Autor con otras etiquetas
- **WHEN** el autor de una respuesta solo lleva etiquetas que no ocultan posts
- **THEN** la respuesta se muestra

### Requirement: Sin lista vacía cuando todo está oculto
Si ninguna de las respuestas cargadas llega a mostrarse (por el threadgate, por etiquetas del post o por etiquetas de cuenta del autor), el elemento SHALL mostrar solo el botón principal, igual que un hilo sin respuestas, y SHALL NOT contener una lista de respuestas vacía.

#### Scenario: Todas las respuestas ocultas
- **WHEN** el hilo tiene dos respuestas, una ocultada en el threadgate y otra con la etiqueta `!hide`
- **THEN** el elemento muestra solo el botón «Comment»
- **AND** no contiene ningún `.atproto-comments__list`

#### Scenario: Alguna respuesta visible
- **WHEN** el hilo tiene dos respuestas y solo una está oculta
- **THEN** el elemento muestra la lista con la respuesta visible y el botón «Comment»

### Requirement: El autor de una respuesta enlaza a su perfil
El nombre y el handle del autor de cada respuesta SHALL ser un único enlace a su perfil, que abre en una pestaña nueva en la app preferida, con las mismas reglas que las menciones. Si el autor no tiene DID, SHALL mostrarse como texto sin enlace.

#### Scenario: Sin preferencia
- **WHEN** el visitante no ha elegido ninguna app y pulsa el nombre del autor de una respuesta
- **THEN** se abre `https://bsky.app/profile/<did del autor>` en una pestaña nueva

#### Scenario: Con preferencia
- **WHEN** el visitante eligió Mu y pulsa el handle del autor de una respuesta
- **THEN** se abre `https://mu.social/profile/<did del autor>`

#### Scenario: Nombre y handle siguen separados
- **WHEN** se renderiza una respuesta de "Xulio Zé" con handle `xulioze.com`
- **THEN** el texto del enlace del autor es "Xulio Zé @xulioze.com", con espacio

### Requirement: La fecha de una respuesta enlaza a la respuesta
La fecha de cada respuesta SHALL ser un enlace a esa respuesta, que abre en una pestaña nueva en la app preferida, con las mismas reglas que «View more». La fecha completa SHALL seguir apareciendo al pasar el ratón.

#### Scenario: Sin preferencia
- **WHEN** el visitante no ha elegido ninguna app y pulsa la fecha de una respuesta
- **THEN** se abre `https://bsky.app/profile/<did del autor>/post/<rkey de la respuesta>` en una pestaña nueva

#### Scenario: Con preferencia
- **WHEN** el visitante eligió Deer y pulsa la fecha de una respuesta
- **THEN** se abre `https://deer.social/profile/<did del autor>/post/<rkey de la respuesta>`

#### Scenario: Fecha completa
- **WHEN** el visitante pasa el ratón por la fecha de una respuesta
- **THEN** ve la fecha y hora completas, como antes
