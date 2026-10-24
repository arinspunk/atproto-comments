# Spec Delta

## ADDED Requirements

### Requirement: Los enlaces del texto abren en la app preferida
Los enlaces de las menciones y el enlace «View more» de una respuesta SHALL abrir en la app que el visitante eligió en el selector, o en bsky.app si no ha elegido ninguna o el almacenamiento no está disponible. Los hashtags SHALL abrir en la app elegida solo si es Bluesky, Mu o Deer, y en bsky.app con un dominio personalizado o sin preferencia. Cada enlace SHALL usar la preferencia vigente cuando el visitante lo abre, aunque la haya cambiado después de renderizarse.

#### Scenario: Sin preferencia
- **WHEN** el visitante no ha elegido ninguna app y abre la mención de un usuario
- **THEN** se abre `https://bsky.app/profile/<did>`

#### Scenario: Preferencia elegida antes
- **WHEN** el visitante eligió Deer en el selector y abre el enlace «View more» de una respuesta
- **THEN** se abre `https://deer.social/profile/<did>/post/<rkey>`

#### Scenario: Preferencia cambiada después del render
- **WHEN** el hilo ya está renderizado, el visitante elige Mu en el selector y después abre una mención
- **THEN** se abre `https://mu.social/profile/<did>`

#### Scenario: Dominio personalizado
- **WHEN** el visitante eligió el dominio personalizado `app.example` y abre una mención
- **THEN** se abre `https://app.example/profile/<did>`

#### Scenario: Hashtag con una app conocida
- **WHEN** el visitante eligió Deer y abre un hashtag
- **THEN** se abre `https://deer.social/hashtag/<tag>`

#### Scenario: Hashtag con un dominio personalizado
- **WHEN** el visitante eligió el dominio personalizado `app.example` y abre un hashtag
- **THEN** se abre `https://bsky.app/hashtag/<tag>`, porque no se sabe si esa app tiene la ruta `/hashtag/`

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
