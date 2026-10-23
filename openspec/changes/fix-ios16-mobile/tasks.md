# Tasks

## 1. Separador nombre/handle (reply-rendering)

- [x] 1.1 Extraer a una función pura (p. ej. `bylineParts(author)`) el cálculo del nombre visible (con respaldo a handle y a "Unknown") y del texto `@handle`, y cubrirla en `deno test`: con `displayName`, sin `displayName` y sin `handle`. Verificar que `deno task test` pasa
- [x] 1.2 En `renderReply`, agrupar `<b class="atproto-reply__author">` y `<span class="atproto-reply__handle">` en un `<span class="atproto-reply__byline">` con un nodo de texto `" "` entre ambos; `<time>` sigue como hijo directo del `<header>`. Verificar en el navegador que `header.innerText` contiene "Nombre @handle" con espacio
- [x] 1.3 Ajustar `src/atproto-comments.css` para que la byline mantenga los estilos actuales de autor y handle (color y tamaño del handle), una separación equivalente con `<time>` y `overflow-wrap: anywhere`. Verificar visualmente en xulioze.com en local que la cabecera se ve de forma equivalente a 1.1.1 (el espacio sustituye al `gap` entre nombre y handle) y, a 320 px de ancho, que un handle largo no desborda

## 2. Selector de apps con respaldo sin Popover API (app-chooser)

- [x] 2.1 Extraer el cuerpo del listener `toggle` de `buildAppAction` a `onOpen`/`onClose` (sincronizar preferida, posicionar, scroll/resize). Añadir `aria-expanded="false"` al crear el botón y actualizarlo en `onOpen`/`onClose`. Verificar en Chrome de escritorio que el popover nativo se comporta igual que antes, que el botón tiene `aria-expanded="false"` antes de la primera apertura y que alterna al abrir y cerrar
- [x] 2.2 En el manejador común de scroll/resize, no cerrar si `popover.contains(document.activeElement)`; quitar `once: true` y retirar los listeners en `onClose`. Verificar en Chrome de escritorio (modo nativo) que, con el foco en "Otra app", hacer scroll no cierra el selector y que, sin foco en el panel, sí lo cierra
- [x] 2.3 Cambiar `buildAppPopover` para que reciba un callback `close` en lugar de llamar a `hidePopover`, y para que solo ponga el atributo `popover` en modo nativo. Cambiar `buildAppButton` para que solo ponga `popovertarget` en modo nativo y, en respaldo, `aria-controls={id}`. Verificar que elegir app o enviar dominio cierra el popover nativo y que en modo forzado el botón no tiene `popovertarget`
- [x] 2.4 Implementar el modo de respaldo en `buildAppAction` cuando `!SUPPORTS_POPOVER`: panel con `hidden` y clase `atproto-app-popover--fallback`; botón que alterna `open()`/`close()`; en `open()`, quitar `hidden` antes de llamar a `onOpen`; un solo panel abierto a la vez (`openFallback`); cierre con `pointerdown` fuera (captura) y con Escape (devolviendo el foco al botón); cierre y retirada de listeners si el panel ya no está conectado (`isConnected`); y eliminación del enlace directo a bsky.app. Verificar en escritorio forzando el modo (`delete HTMLElement.prototype.popover` en un script clásico antes de cargar el módulo) cada escenario de `specs/app-chooser/spec.md`, y que al quitar el componente del DOM con un panel abierto no quedan listeners activos (`getEventListeners(document)` en DevTools)
- [x] 2.5 Añadir en `src/atproto-comments.css` una regla independiente (sin `:popover-open` en la misma lista de selectores) para `.atproto-app-popover--fallback`: `position: fixed`, `z-index` alto, `display: flex; flex-direction: column; gap` cuando no está `[hidden]`. Verificar en modo forzado que el panel queda por encima del contenido, se abre encima del botón cerca del borde inferior y no se sale horizontalmente
- [x] 2.6 Documentar en `README.md` la compatibilidad (Popover API nativa; respaldo en iOS < 17 y navegadores sin soporte), la clase `.atproto-app-popover--fallback` para quien sobrescriba estilos y la limitación del respaldo con ancestros que crean bloque contenedor (`transform`, `filter`) o contexto de apilamiento (`z-index`, `opacity`, `isolation`). Verificar que el README lo menciona en la sección de theming o en una sección de compatibilidad

## 3. Verificación integrada

- [x] 3.1 Ejecutar `deno task check`, `deno task test` y `deno task build` y verificar que pasan sin errores
- [x] 3.2 En el iPhone con iOS 16.7.x (Safari y Chrome), con una página que cargue el build local, verificar:
  - "Responder" y "Comentar" abren el selector con Bluesky, Mu, Deer y "Otra app"
  - elegir Mu abre mu.social
  - tocar "Otra app" abre el teclado sin cerrar el selector; escribir un dominio inválido lo marca como inválido y el selector sigue abierto; escribir uno válido y pulsar Ir lo abre
  - con el selector abierto, tocar fuera lo cierra y abrir el de otra respuesta cierra el primero
  - el selector abierto cerca del borde inferior aparece encima del botón
  - el handle ya no aparece subrayado ni abre el correo
- [x] 3.3 En un navegador con Popover API (Chrome/Safari de escritorio y, si es posible, iOS 17+), verificar que no hay regresiones: el popover se abre, se cierra al pulsar fuera y con Escape, la cabecera se ve como antes y, en iOS 17+, escribir en "Otra app" ya no cierra el selector

## 4. Versión 1.1.2

- [x] 4.1 Subir la versión a 1.1.2 en `package.json`, `package-lock.json` y `deno.json`, y las URLs con versión del README. Verificar con `grep -n "1\.1\.1" README.md deno.json package.json package-lock.json` que solo quedan coincidencias ajenas a la versión del paquete (p. ej. dependencias)

## Workflow follow-up

- Abrir la PR, que fusiona el usuario; después, push del tag `v1.1.2` (JSR + GitHub Release) y `npm publish` manual por el usuario.
- Actualizar `/vendor/atproto-comments.js` y `.css` en xulioze.com; usoritual.com lo recibe vía jsDelivr `@1` (posible retraso de caché).
- Archivar el change tras verificar 1.1.2 en producción.
