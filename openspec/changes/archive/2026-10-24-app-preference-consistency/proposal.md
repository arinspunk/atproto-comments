# Proposal

## Why

Es el último change de la auditoría de la versión 1.1.2 (puntos 2.2, 2.4, 2.5, 3.1, 3.2, 3.3 y 4.2). Recoge incoherencias que quedan entre lo que el componente promete y lo que hace:

1. **Los enlaces ignoran la app elegida (3.1).** El visitante elige con qué app responder, pero las menciones y «View more on Bluesky» siempre abren bsky.app.
2. **Quedan textos fuera de i18n (3.2).** El nombre «Unknown» de un autor sin nombre ni handle está fijo en inglés, y las fechas de más de un año salen siempre como `dd/mm/yyyy`, sea cual sea el idioma.
3. **Las etiquetas del autor no ocultan sus respuestas (3.3).** Solo se miran las etiquetas del post. Una cuenta etiquetada con `!hide` o `porn` sigue apareciendo.
4. **El botón «→» del selector no tiene nombre accesible (2.2).** Un lector de pantalla anuncia «flecha a la derecha» o nada.
5. **`aria-haspopup="true"` es incorrecto (2.4).** Equivale a `menu`, pero el panel no es un menú ARIA: mezcla enlaces con un campo de texto y no tiene navegación con flechas.
6. **No hay estado de carga (2.5).** Mientras llega la respuesta, el elemento está vacío y no se puede saber que está cargando.
7. **Código redundante (4.2).** `renderReply` comprueba `blockedPost`, pero `sortedReplies` ya deja solo los `threadViewPost`.
8. **Lista vacía cuando todo está oculto.** Si todas las respuestas cargadas quedan ocultas (threadgate o etiquetas), `renderThread` deja un `<ol class="atproto-comments__list">` vacío junto al botón «Comment». Con las etiquetas del autor será más fácil que pase.
9. **El README no menciona el threadgate en «Moderation».** Desde 1.1.3 se ocultan las respuestas que el autor del hilo ocultó (`hiddenReplies`), pero la sección solo habla de posts bloqueados y etiquetas.

## What Changes

- **Menciones y «View more»** abren en la app preferida del visitante (Bluesky, Mu, Deer o su dominio personalizado), y en bsky.app si no ha elegido ninguna. **Los hashtags** abren en la app elegida si es Bluesky, Mu o Deer, que tienen la ruta `/hashtag/`, y en bsky.app con un dominio personalizado, del que no se sabe si la tiene. El enlace usa la preferencia del momento en que se abre, no la del render.
- **Texto por defecto de `viewMore`:** pasa de «View more on Bluesky» / «Ver mais no Bluesky» a «View more replies» / «Ver mais respostas», porque ya no va siempre a Bluesky. Quien tenga `viewMore` personalizado no nota el cambio.
- **Clave nueva `unknownAuthor`** («Unknown» / «Desconhecido») para el autor sin nombre ni handle.
- **Fechas de más de un año** con el formato corto del idioma de la página (`Intl.DateTimeFormat`, `dateStyle: "short"`). Las unidades relativas (`5 m`, `3 d`) no cambian.
- **Respuestas de autores etiquetados:** se ocultan, junto con sus subrespuestas, con las mismas etiquetas que ya se usan para los posts. Solo cuentan las etiquetas puestas sobre la cuenta (su `uri` es el DID del autor). Las puestas sobre el registro de perfil (`…/app.bsky.actor.profile/self`) se refieren al avatar y al banner, no a lo que publica, y no ocultan sus respuestas.
- **Sin lista vacía:** si todas las respuestas quedan ocultas, el elemento muestra solo el botón «Comment», igual que un hilo sin respuestas.
- **Clave nueva `go`** («Open» / «Abrir») como nombre accesible del botón «→». La flecha sigue visible y se oculta a los lectores de pantalla.
- **Se quita `aria-haspopup`** del botón que abre el selector. Siguen `aria-expanded` y la relación con el panel (`popovertarget` o `aria-controls`).
- **Estado de carga:** mientras se pide el hilo, el elemento lleva `aria-busy="true"` y la clase `atproto-comments--loading`, sin texto por defecto, para que la web muestre un esqueleto si quiere.
- Se quita la comprobación redundante de `blockedPost` en `renderReply`, y la línea en blanco que falta antes de `// --- Web Component ---` en `src/element.ts`.
- README y CHANGELOG. Versión minor (1.4.0): claves nuevas `go` y `unknownAuthor`, clase nueva `atproto-comments--loading` y texto por defecto distinto en `viewMore`.

Fuera de este change: crear el panel del selector solo al abrirlo (4.1), que se descartó porque cambia el DOM documentado, y cambiar las unidades relativas a `Intl.RelativeTimeFormat`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-chooser`: el botón deja de anunciarse como menú emergente («Estado accesible del botón»), y el botón de enviar dominio tiene nombre accesible.
- `reply-rendering`: menciones, «View more» y hashtags (estos solo con las apps conocidas) abren en la app preferida; las respuestas de autores con etiquetas de cuenta no se muestran; sin lista vacía cuando todas las respuestas están ocultas.
- `ui-localization`: claves nuevas `go` y `unknownAuthor` en la tabla documentada, texto por defecto neutro de `viewMore`, y fechas de más de un año en el formato del idioma.
- `element-lifecycle`: estado de carga visible para tecnologías de asistencia y para la web.

## Impact

- `src/text.ts`: `facetSegments` deja de fijar `bsky.app` en las menciones y los hashtags; devuelve qué tipo de enlace es para que el DOM construya la URL con la app preferida.
- `src/byline.ts`: `bylineParts` recibe el texto de `unknownAuthor`.
- `src/i18n.ts`: claves `go` y `unknownAuthor`, y textos nuevos de `viewMore` en `en` y `pt`.
- `src/types.ts`: `labels` en `ProfileViewBasic` y `uri` en `Label`.
- Un módulo sin DOM nuevo con el formato de fechas (`formatRelativeTime`), para poder probarlo en Deno.
- `src/element.ts`: enlaces de menciones y «View more», botón «→», `aria-haspopup`, filtro por etiquetas del autor, sin `<ol>` vacío en `renderThread`, estado de carga y limpieza.
- `src/atproto-comments.css`: la flecha del botón dentro de un `<span>`, si el estilo actual depende de que sea texto directo.
- `tests/browser/`: escenarios nuevos (enlaces según la preferencia, estado de carga, nombre accesible del botón).
- `README.md` (tabla de claves, «What is shown», «Moderation» con el threadgate y los autores etiquetados, «Markup», clase de carga) y `CHANGELOG.md`.
- Webs que ya usan el componente: el texto por defecto de «View more» cambia, dejan de verse respuestas de autores con etiquetas de cuenta, y un hilo con todas las respuestas ocultas ya no deja una lista vacía. Nada más cambia sin que lo pidan.
