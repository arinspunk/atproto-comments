# Proposal

## Why

El selector de apps es el momento clave del componente: es cuando el visitante sale de la web para ir a responder. Hoy es un popover pequeño anclado al botón, con solo tres apps (Bluesky, Mu, Deer). Eso tiene tres problemas:

1. **Pocas apps.** El ecosistema AT Protocol tiene más clientes web en los que se puede responder (forks de Bluesky como Blacksky o Northsky, clientes propios como Anisota o Red Dwarf). Un visitante que usa uno de ellos tiene que saberse su dominio y escribirlo.
2. **Poco espacio y poco contexto.** El popover no deja sitio para una lista más larga ni para un texto que explique qué va a pasar. Tampoco transmite que el visitante está a punto de ir a otro sitio.
3. **Mucho código frágil.** Para ser un panel pequeño, el popover necesita bastante código: se posiciona a mano encima o debajo del botón, tiene un modo alternativo para navegadores sin Popover API (iOS 16), se cierra al hacer scroll salvo mientras se escribe con el teclado virtual, y puede quedar mal colocado o tapado si un ancestro crea un bloque contenedor. Además se crea un panel por cada respuesta.

Otros sitios hechos sobre AT Protocol (p. ej. dame.is) usan un panel inferior a todo el ancho con la lista de apps, y funciona mejor. Cambiar el selector rompe su DOM documentado, así que es una versión major. Aprovechamos esa 2.0 para meter el otro cambio que rompe el DOM y que ya queríamos: enlazar el autor y la fecha de cada respuesta.

## What Changes

- **BREAKING. Panel inferior en lugar de popover.** «Comment» y «Reply» abren un panel modal anclado al borde inferior de la ventana, a todo el ancho, con el contenido en una columna centrada. Hay un único panel por elemento, que se rellena con el post de destino al abrirse. Tiene:
  - una cabecera con contexto («Comment in…» o «Reply to {name} in…») y un botón para cerrar;
  - un texto explicativo opcional, vacío por defecto, para que la web lo rellene con `strings`;
  - la lista de apps;
  - el campo «Other app» para escribir un dominio, como hasta ahora.

  Se cierra con Escape, con el botón de cerrar, al pulsar fuera del panel o al elegir una app, y el foco vuelve al botón que lo abrió. Ya no se cierra al hacer scroll ni al redimensionar la ventana.
- **BREAKING. Desaparecen el Popover API y su modo alternativo.** Desaparecen también las clases `.atproto-app-popover*`, incluida `--fallback`, y el posicionamiento junto al botón. El panel usa `<dialog>`, que funciona en todos los navegadores que el componente ya admite (Safari/iOS 15.4 o posterior).
- **BREAKING. Estado accesible del botón.** El botón anuncia que abre un diálogo (`aria-haspopup="dialog"`). Ya no expone `aria-expanded` ni `popovertarget`/`aria-controls`.
- **Lista de apps ampliada.** Solo entran apps web en las que cualquier cuenta AT Protocol puede iniciar sesión y responder a un post abriendo su URL; quedan fuera los lectores y las herramientas para desarrolladores. La lista definitiva sale de una investigación previa, que es la primera tarea del change. Candidatas: Bluesky, Mu y Deer (ya están), y Anisota, Red Dwarf, Impro, Blacksky y Northsky. Para cada app se comprueba qué rutas usa para un post, un perfil y un hashtag.
- **Lista plana.** Bluesky va primero y el resto por orden alfabético. Si el visitante ya eligió una app, esa aparece arriba con la etiqueta «Last used». Si eligió un dominio personalizado, aparece prellenado en «Other app».
- **Rutas por app.** El post, el perfil y el hashtag se abren con las rutas de cada app. Un dominio personalizado sigue usando las rutas de bsky.app, y sus hashtags abren en bsky.app, igual que ahora. Los hashtags siguen la preferencia si la app elegida está en la lista y tiene ruta de hashtag; si no, abren en bsky.app.
- **La preferencia guardada no cambia.** Se usan la misma clave de `localStorage` (`atproto-preferred-app`) y el mismo valor (un dominio), así que quien eligió Mu o Deer en 1.x lo sigue teniendo elegido.
- **BREAKING. Autor y fecha enlazados.** El nombre y el handle del autor enlazan a su perfil, y la fecha al permalink de la respuesta. Los dos abren en la app preferida, con la misma lógica que las menciones. `.atproto-reply__byline` pasa de `<span>` a `<a>`, y `<time>` queda dentro de un enlace nuevo, `.atproto-reply__permalink`.
- **Claves nuevas de `strings`:** `commentIn`, `replyIn` (con `{name}`), `pickerNote` (vacía por defecto), `close` y `lastUsed`, en `en` y `pt`. Las claves actuales no cambian de significado.
- README (el DOM documentado del panel, «Browser support» sin Popover API, «What is shown», la tabla de claves, los pins `@1` → `@2` y un enlace a la guía de migración) y CHANGELOG, con la guía «Migrating from 1.x». Versión **2.0.0**.

Fuera de este change, en releases posteriores: embeds y aviso en las etiquetas «warn» (2.1); y en 2.x, un tema oscuro opcional, `thread-uri` con URL web, eventos `load`/`error`, contadores del post ancla, diccionarios `es` y `gl`, y una lista de apps configurable por el integrador. También quedan fuera un botón para copiar el enlace (como el de dame.is) y agrupar las apps por categorías.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-chooser`: el selector pasa a ser un panel inferior modal y deja de depender del Popover API. Cambian qué apps muestra y cómo, cómo se cierra, cómo se coloca y el estado accesible del botón. Se añade el panel único por elemento, con cabecera y texto explicativo.
- `reply-rendering`: los hashtags siguen la preferencia según la lista de apps y sus rutas, no según «Bluesky, Mu o Deer». El autor y la fecha de cada respuesta pasan a ser enlaces a la app preferida.
- `ui-localization`: la tabla de claves documentadas incluye `commentIn`, `replyIn`, `pickerNote`, `close` y `lastUsed`.

## Impact

- `src/element.ts`:
  - `buildAppPopover`, `buildAppButton` y `buildAppAction` se sustituyen por un panel `<dialog>` por elemento y un botón que lo abre con el destino;
  - `KNOWN_APPS` pasa a ser una lista de apps con sus rutas;
  - `appBase`/`setAppLink` usan esas rutas;
  - `renderReply` enlaza el autor y la fecha.
- Un módulo sin DOM nuevo (p. ej. `src/apps.ts`) con la lista de apps, su orden y la construcción de URLs, probado en Deno.
- `src/i18n.ts`: las claves nuevas.
- `src/atproto-comments.css`: los estilos del panel sustituyen a los del popover; estilos de los enlaces de autor y fecha.
- `tests/browser/picker.mjs` se reescribe para el panel; otros escenarios que usan `.atproto-app-popover__link` (`preference.mjs`, `details.mjs`) se adaptan.
- `scripts/check-versions.js`: comprobar también los pins de versión major del README (`@2`), que hoy no comprueba.
- `README.md`, `CHANGELOG.md`, `package.json`, `deno.json` y los lockfiles a 2.0.0.
- **Webs que ya usan el componente:** con `@1` en el CDN o `^1` en npm no reciben la 2.0 hasta que cambien de versión. Al hacerlo, pierden los estilos que hayan escrito para `.atproto-app-popover*` y para `.atproto-reply__byline` como `<span>`. El plugin Parolas (`../atproto-comments-plugin`), que depende de `^1.1.0`, tendrá que actualizar la dependencia y sus `strings`.
