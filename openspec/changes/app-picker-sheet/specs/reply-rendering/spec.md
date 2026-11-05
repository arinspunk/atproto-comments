# Spec Delta

## MODIFIED Requirements

### Requirement: Los enlaces del texto abren en la app preferida
Los enlaces de las menciones y el enlace «View more» de una respuesta SHALL abrir en la app que el visitante eligió en el selector, con la ruta de perfil o de post de esa app, o en bsky.app si no ha elegido ninguna o el almacenamiento no está disponible. Un dominio personalizado SHALL usar las rutas de bsky.app. Los hashtags SHALL abrir en la app elegida solo si está en la lista del selector y tiene ruta de hashtag; si no, en bsky.app. Cada enlace SHALL usar la preferencia vigente cuando el visitante lo abre, aunque la haya cambiado después de renderizarse.

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

## ADDED Requirements

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
