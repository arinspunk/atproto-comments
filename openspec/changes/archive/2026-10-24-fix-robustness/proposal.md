# Proposal

## Why

Una auditoría de la versión 1.1.2 encontró fallos que dejan el componente sin funcionar o sin cumplir lo que promete, y todos se pueden arreglar sin tocar la API pública:

1. **Las respuestas que el autor oculta en Bluesky aparecen en la web.** En el lexicon `app.bsky.feed.threadgate`, `hiddenReplies` es una lista de AT-URIs (`string[]`), pero el código la lee como `{ uri }[]`. El conjunto de URIs ocultas siempre queda vacío.
2. **Un `localStorage` bloqueado deja el componente vacío.** En iframes de terceros con el almacenamiento bloqueado, en contextos sandbox y con algunas configuraciones de privacidad, `localStorage` lanza `SecurityError`. La lectura se hace durante el render del selector, y una sola excepción interrumpe todo el render.
3. **En navegadores sin `Intl.Segmenter` (Firefox anterior a 125) no se renderiza nada** en cuanto un autor no tiene avatar, porque las iniciales del avatar provisional se calculan con `Intl.Segmenter` sin comprobar que exista.
4. **El campo «Otra app» no tiene nombre accesible y un dominio inválido no se anuncia.** Solo se marca con `aria-invalid`, y la clave `invalidDomain` existe pero no se usa.
5. **El CI no ejecuta los tests.** Ni `ci.yml` ni `release.yml` lanzan `deno task test`, así que una regresión puede publicarse.

El primer fallo rompe la moderación del autor. Por eso conviene sacar ya un parche.

## What Changes

- Las respuestas cuya URI aparece en `hiddenReplies` del threadgate dejan de mostrarse, junto con sus subrespuestas.
- Todos los accesos a `localStorage` se protegen. Si el almacenamiento no está disponible, el selector funciona igual, aunque no recuerde la app elegida.
- Las iniciales del avatar provisional se calculan sin `Intl.Segmenter` cuando el navegador no lo tiene.
- El campo «Otra app» usa la cadena `otherApp` como nombre accesible. Un dominio inválido se comunica con la validación nativa del navegador, usando la cadena `invalidDomain`.
- Las funciones puras (`hiddenUris`, `getInitials`, `normalizeDomain`, `isHiddenByLabel`, `sortedReplies` y el cálculo de rangos de las facets) pasan a módulos sin DOM con tests en Deno, y `deno task test` se ejecuta en `ci.yml` y en `release.yml` antes de publicar.
- El nombre del autor en la cabecera de cada respuesta pasa a tener el mismo tamaño que el handle y la fecha (`--atproto-font-size`). Hasta ahora heredaba el tamaño de texto de la página y salía más grande. Quien haya fijado el tamaño de `.atproto-reply__author` en su CSS no nota el cambio.
- README: `invalidDomain` deja de figurar como reservada y la tabla de compatibilidad ya no dice que el render falla sin `Intl.Segmenter`.
- Versión de parche (1.1.3). No se añaden ni cambian atributos, propiedades, claves de `strings`, variables CSS ni clases.

Quedan fuera de este change:

- El ejemplo «Custom element name» (1.2): ya se corrigió en el README de `main`. El punto de entrada `./element` va en `packaging-and-ci`.
- La clave nueva `go` para el botón «→» (2.2) y la retirada de `aria-haspopup` (2.4): van en `app-preference-consistency`, porque añaden una clave pública o modifican un requisito de `app-chooser`.
- El ciclo de vida del elemento (1.3): reconectar sin duplicar, `attributeChangedCallback` y cancelación de cargas. Va en un change propio, `component-lifecycle` (minor).

## Capabilities

### New Capabilities

### Modified Capabilities
- `reply-rendering`: se añade que las respuestas ocultadas en el threadgate no se muestran, que el avatar provisional se renderiza en navegadores sin `Intl.Segmenter` y que nombre, handle y fecha comparten tamaño de texto.
- `app-chooser`: el escenario «Dominio inválido» exige mostrar y anunciar el mensaje de dominio inválido, el campo «Otra app» exige un nombre accesible, y la preferencia recordada admite que el almacenamiento no esté disponible.

## Impact

- `src/index.ts`: `Threadgate` (desaparece `HiddenReply`), accesos a `localStorage` en `buildAppPopover` y `buildAppAction`, el input y `openCustom` en `buildAppPopover`, e imports de los módulos nuevos.
- Módulos nuevos sin DOM en `src/` (p. ej. `text.ts`, `thread.ts`) con sus `*.test.ts`.
- `src/atproto-comments.css`: tamaño de texto en `.atproto-reply__header`.
- `.github/workflows/ci.yml` y `.github/workflows/release.yml`: instalar Deno y ejecutar `deno task test`.
- `README.md`: fila de `invalidDomain` en la tabla de cadenas y fila de `Intl.Segmenter` en la de compatibilidad.
- `package.json`, `package-lock.json`, `deno.json` y los pins de versión del README pasan a 1.1.3 al publicar.
- Webs que ya usan el componente: sin cambios de integración. Las respuestas que el autor ocultó dejarán de verse.
