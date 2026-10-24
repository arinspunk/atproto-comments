# Tasks

## 1. Módulos sin DOM

- [x] 1.1 Añadir a `src/i18n.ts` las claves `go` («Open» / «Abrir») y `unknownAuthor` («Unknown» / «Desconhecido»), y cambiar `viewMore` a «View more replies» / «Ver mais respostas» (design, decisión 3). Actualizar `src/i18n.test.ts`. Verificar que `deno task test` pasa
- [x] 1.2 Hacer que `bylineParts(author, unknown)` reciba el texto de autor desconocido y actualizar `src/byline.test.ts`. Verificar que `deno task test` pasa
- [x] 1.3 Crear `src/date.ts` con `isValidDate`, `formatRelativeTime(iso, strings, locale, now?)` y `formatAbsoluteDate` movidos de `src/element.ts`, con `Intl.DateTimeFormat(locale, { dateStyle: "short" })` para más de un año (design, decisión 2), y `src/date.test.ts`: cada unidad relativa, `en-US` da `1/2/20` y `pt-PT` da `02/01/20` para el 2 de enero de 2020 a mediodía local (`new Date(2020, 0, 2, 12)`, para que el día no cambie con la zona horaria de la máquina; design, riesgos), y un locale inválido no lanza. Verificar también que pasa con `TZ` en `America/Los_Angeles`, `Pacific/Auckland`, `Pacific/Kiritimati` y `Etc/GMT+12`. Verificar que `deno task test` pasa
- [x] 1.4 Hacer que `facetSegments` devuelva `{ text, mention: did }` para las menciones, sin URL, y dejar enlaces y hashtags como están (design, decisión 1). Actualizar `src/text.test.ts`. Verificar que `deno task test` pasa
- [x] 1.5 Añadir `labels` a `ProfileViewBasic`, `uri` a `Label` e `isReplyHidden(post, hidden)` en `src/thread.ts`, que solo cuenta las etiquetas del autor con `uri === author.did` (design, decisión 6). Tests:
  - URI ocultada en el threadgate;
  - etiqueta del post;
  - etiqueta de cuenta del autor (`uri` = su DID);
  - etiqueta que oculta pero puesta sobre el perfil (`uri` = `at://<did>/app.bsky.actor.profile/self`): no oculta;
  - etiqueta de cuenta de otro DID: no oculta;
  - autor sin `did` con etiquetas: no oculta;
  - autor con etiquetas que no ocultan, y sin etiquetas.

  Verificar que `deno task test` pasa

## 2. Componente

- [x] 2.1 En `src/element.ts`, usar `src/date.ts`, pasar `t("unknownAuthor")` a `bylineParts` y sustituir el filtro de `renderReply` por `isReplyHidden`, quitando la comprobación de `blockedPost` (design, decisión 6), y hacer que `renderThread` devuelva solo el botón principal si la lista queda sin hijos, y que `renderReply` no añada la lista de subrespuestas si queda vacía (decisión 7). Añadir la línea en blanco que falta antes de `// --- Web Component ---`. Verificar que `npx tsc --noEmit` pasa y que `npm run test:browser` sigue en verde
- [x] 2.2 Implementar `appBase()`, el `WeakMap` de rutas y los listeners de captura del elemento, y usarlos en las menciones de `buildFacetedText` y en «View more» (design, decisión 1). Verificar que `npx tsc --noEmit` pasa
- [x] 2.3 Botón «→» con `aria-label` de `t("go")` y la flecha en un `<span aria-hidden="true">`, y quitar `aria-haspopup` de `buildAppButton` (design, decisiones 4 y 5). Verificar con una captura de Chromium que el botón se ve igual que en 1.3.0
- [x] 2.4 Añadir `#setLoading` y llamarlo en `#fetch`, `#abort()` y al aceptar la respuesta (design, decisión 8). Verificar que `npx tsc --noEmit` pasa

## 3. Batería de navegador

- [x] 3.1 Ampliar el AppView simulado de `tests/browser/harness.mjs` para poder devolver menciones, «View more» (`replyCount` mayor que las respuestas cargadas), etiquetas de autor con su `uri` (de cuenta y de perfil) y un threadgate con `hiddenReplies`, sin cambiar las respuestas que ya esperan los escenarios existentes. Verificar que `npm run test:browser` sigue en verde
- [x] 3.2 Añadir `tests/browser/preference.mjs` con los escenarios de `reply-rendering`: sin preferencia, preferencia elegida antes, preferencia cambiada después del render (eligiendo una app en el selector y abriendo la mención con un clic real), dominio personalizado, hashtag, autor etiquetado, etiqueta solo en el perfil, todas las respuestas ocultas (solo el botón, sin `.atproto-comments__list`) y alguna respuesta visible. Verificar que pasan en Chromium y WebKit
- [x] 3.3 Añadir escenarios para el estado de carga (durante, terminada, cancelada al desconectar, cancelada por `thread-uri` inválido, y sin `aria-busy` al cambiar `lang`), para el nombre accesible del botón «→» (`aria-label`, personalizado con `strings` y flecha con `aria-hidden`), para la ausencia de `aria-haspopup`, para «Desconhecido» con `lang="pt"`, para la fecha de más de un año con `lang="pt-PT"` (respuesta de `2020-01-02T12:00:00Z` con la página en `timezoneId: "Europe/Lisbon"`) y para «View more replies». Verificar que pasan en Chromium y WebKit

## 4. Documentación

- [x] 4.1 Actualizar el README: tabla de claves (`go`, `unknownAuthor`, nuevo texto de `viewMore`), «What is shown» (menciones y «View more» en la app elegida, hashtags en bsky.app, fecha de más de un año en el formato del idioma), «Moderation» (añadir a la lista las respuestas que el autor del hilo ocultó en Bluesky, threadgate `hiddenReplies`, que se ocultan desde 1.1.3, y las de autores con una de esas etiquetas sobre su cuenta, aclarando que las etiquetas puestas solo sobre el perfil no ocultan nada; y que si todas las respuestas quedan ocultas solo se ve el botón «Comment»), «Markup» (botón «→» con su `<span>`) y la clase `atproto-comments--loading` con `aria-busy`. Verificar que `grep -n "View more on Bluesky\|Mentions and hashtags open on bsky.app" README.md` no da resultados
- [x] 4.2 Añadir a `CHANGELOG.md` una sección `[Unreleased]` con «Added» (claves `go` y `unknownAuthor`, estado de carga), «Changed» (menciones y «View more» en la app preferida, texto de `viewMore`, fecha de más de un año, sin `aria-haspopup`) y «Fixed» (respuestas de autores con etiquetas de cuenta, lista vacía cuando todas las respuestas están ocultas, nombre accesible del botón «→»). Verificar que sigue el formato de las entradas anteriores

## 5. Verificación integrada y versión

- [x] 5.1 Ejecutar `npx tsc --noEmit`, `deno task check`, `deno task test`, `npm run build`, `npm run check:versions`, `npm run test:browser` y `deno publish --dry-run --allow-dirty`, y verificar que pasan
- [ ] 5.2 En Firefox y Safari de escritorio y en iOS 16, verificar a mano con `tests/browser/server.mjs` que elegir una app en el selector hace que la siguiente mención y «View more» abran en ella, y que VoiceOver anuncia el botón «→» como «Open» y no anuncia el botón de responder como menú
- [x] 5.3 Subir la versión a 1.4.0 en `package.json`, `package-lock.json` (raíz y `packages[""]`), `deno.json` y `tests/browser/package-lock.json`, cambiar los pins del README y fechar la sección del CHANGELOG como `[1.4.0]`. Verificar que `npm run check:versions` y `node scripts/check-versions.js --tag v1.4.0` pasan

## Workflow follow-up

- Tras fusionar, crear el tag `v1.4.0` en `main`. La release comprueba las versiones, ejecuta los tests, publica en JSR y crea la GitHub Release. npm se publica a mano con `npm run build && npm publish` y se comprueba con `npm view atproto-comments version`.
- Archivar el change con `/opsx:archive` cuando esté publicado. Con él se cierra la auditoría de la 1.1.2.
