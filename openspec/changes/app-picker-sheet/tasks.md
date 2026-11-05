# Tasks

## 1. Investigación de apps

- [x] 1.1 Comprobar cada candidata (Bluesky, Mu, Deer, Anisota, Red Dwarf, Impro, Blacksky, Northsky) con los cuatro criterios de design, decisión 4: inicio de sesión con una cuenta de un PDS que no sea bsky.social, responder abriendo la URL de un post real, rutas de post, perfil y hashtag con DID, y app web con dominio estable. Apuntar el resultado y la fecha en la sección «Apps comprobadas» de `design.md`: nombre, dominio, rutas (o `null` para hashtag) y si entra o no, con el motivo. Verificar que cada app que entra tiene sus tres rutas probadas en el navegador con un DID real
- [x] 1.2 Revisar la lista resultante con el usuario antes de pasar al grupo 2. Si una app conocida (Mu o Deer) no pasara la comprobación, decidir con el usuario si sale de la lista, porque cambia el escenario «Apps conocidas» del delta de `app-chooser`. Verificar que la decisión queda anotada en `design.md`

## 2. Módulos sin DOM

- [x] 2.1 Crear `src/apps.ts` con `APPS` (la lista de la tarea 1.1), `orderedApps(pref)` y `appUrl(pref, target)` (design, decisión 3), y `src/apps.test.ts`:
  - orden sin preferencia (Bluesky primero, el resto alfabético);
  - preferencia en la lista (delante, `lastUsed`, sin repetirse);
  - dominio personalizado (orden habitual, sin `lastUsed`);
  - post, perfil y hashtag con una app de rutas propias, si la hay;
  - hashtag con una app sin ruta de hashtag y con un dominio personalizado (bsky.app);
  - sin preferencia (bsky.app);
  - codificación de `{tag}`, `{did}` y `{rkey}`.

  Verificar que `deno task test` pasa
- [x] 2.2 Añadir a `src/i18n.ts` las claves `commentIn`, `replyIn`, `pickerNote`, `close` y `lastUsed` en `en` y `pt` (design, decisión 8; textos en el delta de `ui-localization`), y casos en `src/i18n.test.ts`, incluido `replyIn` con `{name}`. Verificar que `deno task test` pasa
- [x] 2.3 Actualizar la tabla de claves del README con las cinco claves nuevas. Verificar que `grep -c "commentIn\|replyIn\|pickerNote\|lastUsed\|\`close\`" README.md` encuentra las cinco

## 3. Enlaces con las rutas de cada app

- [x] 3.1 En `src/element.ts`, cambiar el `WeakMap` de enlaces a `AppLinkTarget` y sustituir `appBase`/`KNOWN_APPS` por `appUrl` en menciones, hashtags y «View more» (design, decisión 3). Adaptar `tests/browser/preference.mjs` a las rutas por app, con un escenario de hashtag con una app sin ruta de hashtag si alguna de la tarea 1.1 lo es. Verificar que `npx tsc --noEmit` pasa y que `npm run test:browser` pasa los escenarios de preferencia en Chromium y WebKit
- [x] 3.2 Enlazar el byline al perfil y la fecha al permalink (`.atproto-reply__permalink`), sin enlace cuando el autor no tiene DID, y mover el separador `· ` a `.atproto-reply__permalink::before` con los estilos de enlace de design, decisión 7. Añadir escenarios a `tests/browser/details.mjs`:
  - `href` del autor y de la fecha sin preferencia y con Deer;
  - preferencia cambiada después del render;
  - autor sin DID;
  - `innerText` del byline «Xulio Zé @xulioze.com»;
  - `title` de la fecha.

  Verificar que pasan en Chromium y WebKit, y con una captura de Chromium que la cabecera se ve como en 1.4.0 salvo el subrayado en hover
- [x] 3.3 Actualizar en el README «What is shown» (autor y fecha enlazados; menciones, hashtags y «View more» según las rutas de cada app) y el bloque «Markup» de la respuesta. Verificar que el bloque «Markup» coincide con el DOM que genera el componente en `tests/browser/manual/index.html`

## 4. Panel inferior

- [x] 4.1 Sustituir `buildAppPopover`, `buildAppButton`, `buildAppAction`, `supportsPopover`, `openFallback` y `popoverCounter` por el `<dialog>` por elemento de design, decisiones 1, 2 y 5:
  - creado al abrirse por primera vez, dentro del host y fuera de `#nodes`;
  - rellenado en cada apertura con `orderedApps`, las cadenas y el destino;
  - cierre con Escape, con el botón de cerrar, al pulsar el backdrop y al elegir una app;
  - foco devuelto al botón que lo abrió y `autofocus` en la primera app;
  - `#render()` y `disconnectedCallback()` lo cierran;
  - botón con `aria-haspopup="dialog"`;
  - campo «Other app» con `<label>` y la validación actual.

  Verificar que `npx tsc --noEmit` pasa y que `grep -n "popover\|Popover" src/element.ts` no da resultados
- [x] 4.2 Sustituir en `src/atproto-comments.css` las reglas `.atproto-app-popover*` por las del panel (design, decisión 6): anclado abajo a todo el ancho, columna centrada, `max-height` con scroll interno, safe area, backdrop, filas de app, `--last-used`, badge y animación solo con `prefers-reduced-motion: no-preference`. Fijar márgenes, padding, `list-style`, fuente y color de los elementos del panel. Verificar con capturas de Chromium y WebKit a 320 px y 1440 px, también en una página de prueba nueva en `tests/browser/manual/` con estilos globales agresivos (`p`, `ul`, `a`, `button`, `input`) y un ancestro con `transform` y `z-index`, que el panel se ve igual
- [x] 4.3 Reescribir `tests/browser/picker.mjs` con los escenarios del delta de `app-chooser`:
  - abrir desde «Comment» y desde «Reply» (cabecera con `commentIn` y `replyIn`);
  - orden de la lista sin preferencia, con preferencia y con dominio personalizado (prellenado);
  - preferencia guardada en `localStorage` antes de cargar (compatibilidad con 1.x);
  - elegir una app (`href`, preferencia guardada, panel cerrado);
  - dominio válido e inválido (`invalidDomain`, panel abierto);
  - cierre con Escape, con el botón de cerrar y al pulsar fuera, con el foco de vuelta en el botón;
  - sigue abierto tras scroll y resize;
  - clic en otro «Reply» con el panel abierto (solo cierra);
  - `pickerNote` vacía (sin `.atproto-app-sheet__note`) y personalizada;
  - nombre accesible del diálogo, de `close`, de `otherApp` y de `go`;
  - `aria-haspopup="dialog"` sin `aria-expanded`;
  - Tab no sale del panel;
  - se cierra al cambiar `thread-uri` y `lang`, y al quitar el elemento, y la página vuelve a responder;
  - almacenamiento bloqueado.

  Quitar el modo de respaldo. Adaptar `tests/browser/lifecycle.mjs` y `tests/browser/details.mjs`, que buscan `.atproto-app-popover`. Verificar que `npm run test:browser` pasa entero en Chromium y WebKit
- [x] 4.4 Actualizar en el README «How it works», el bloque «Markup» del panel y «Browser support»: fila de `<dialog>` (Chrome 37, Firefox 98, Safari 15.4) en lugar de Popover API, y sin el párrafo del panel de respaldo. Actualizar también `tests/browser/manual/picker.html` si depende del popover. Verificar que `grep -n "popover\|Popover\|fallback" README.md tests/browser/manual/*.html` no da resultados

## 5. Versión y documentación de la 2.0

- [x] 5.1 Ampliar `scripts/check-versions.js` para que compruebe que los pins de major del README (`atproto-comments@N/` y la prosa «`@N` gets every N.x…») coinciden con el major de `package.json` (design, decisión 9). Verificar que falla con un pin `@1` y la versión 2.0.0 en una copia temporal del README, y que pasa con el README correcto
- [x] 5.2 Añadir a `CHANGELOG.md` la sección `[Unreleased]` con «Removed», «Changed», «Added» y «Migrating from 1.x» (correspondencia de clases, byline como `<a>`, `.atproto-reply__permalink`, pins `@2`), según el plan de migración de `design.md`. Verificar que sigue el formato de las entradas anteriores y que cada clase quitada de la CSS aparece en la correspondencia
- [x] 5.3 Subir la versión a 2.0.0 en `package.json`, `package-lock.json` (raíz y `packages[""]`), `deno.json` y `tests/browser/package-lock.json`. Cambiar en el README los pins exactos y los de major (`@1` → `@2`, y la prosa «`@2` gets every 2.x fix and feature, never a breaking 3.0») y fechar la sección del CHANGELOG como `[2.0.0]`. Verificar que `npm run check:versions` y `node scripts/check-versions.js --tag v2.0.0` pasan

## 6. Verificación integrada

- [x] 6.1 Ejecutar `npx tsc --noEmit`, `deno task check`, `deno task test`, `npm run build`, `npm run check:versions`, `npm run test:browser` y `deno publish --dry-run --allow-dirty`, y verificar que pasan
- [x] 6.2 Verificar a mano con `tests/browser/server.mjs` en Firefox y Safari de escritorio, en iOS 16 y en iOS 17:
  - el panel se abre anclado abajo y se cierra con Escape, con el botón de cerrar y al tocar fuera;
  - escribir en «Other app» con el teclado virtual no lo cierra y el campo queda visible;
  - el foco vuelve al botón;
  - elegir una app abre el post en ella;
  - autor y fecha abren en la app elegida;
  - en iOS 16, VoiceOver anuncia el botón como que abre un diálogo y el panel con su cabecera;
  - con VoiceOver en iOS 16 y en macOS (Safari), `aria-haspopup="dialog"` no se anuncia como menú ni como «pop-up» genérico (escenario «Sin rol de menú»). Si WebKit lo lee como menú, decidir con el usuario si se quita `aria-haspopup`;
  - al cerrar el panel cambiando `lang` (`picker.html`, botón «lang → pt»), el foco queda en el nuevo «Comentar» y VoiceOver lo anuncia.

  Apuntar el resultado en esta tarea

  Resultado (2026-11-05), en Firefox y Safari de escritorio, iOS 16 e iOS 17:
  - ✅ `picker.html`: apertura, cierre (Escape, ×, fuera), foco de vuelta al botón, «Last used», «Other app», scroll y redimensionado, cambio de `lang`.
  - ✅ iOS 16 e iOS 17: «Other app» con el teclado virtual.
  - ✅ `links.html`: autor, fecha, mención, hashtag y «View more» abren en la app elegida; Anisota manda el hashtag a bsky.app.
  - ✅ `hostile.html`: el panel no hereda los estilos de la página y queda por encima del ancestro con `transform`/`z-index`.
  - ⏭️ VoiceOver (iOS 16 y Safari de macOS): sin verificar, por decisión del usuario. Siguen sin comprobar el anuncio de `aria-haspopup="dialog"` (escenario «Sin rol de menú») y el anuncio de «Comentar» tras el cambio de `lang`.

## Workflow follow-up

- Antes de fusionar, cambiar la fecha de `## [2.0.0] - 2026-11-05` en `CHANGELOG.md` por la del día de publicación.
- Tras fusionar, crear el tag `v2.0.0` en `main`. La release comprueba las versiones, ejecuta los tests, publica en JSR y crea la GitHub Release. npm se publica a mano con `npm run build && npm publish` y se comprueba con `npm view atproto-comments version`.
- Al archivar, editar el `## Purpose` de `openspec/specs/app-chooser/spec.md`, que todavía dice «tenga o no Popover API».
- Actualizar Parolas (`../atproto-comments-plugin`) a `^2.0.0` con sus `strings` para las claves nuevas, en un change de ese repo.
- Siguiente change: embeds y aviso de etiquetas «warn» (2.1).
