# Design

## Context

Motivación en `proposal.md`. Estado actual relevante:

- `SUPPORTS_POPOVER = "popover" in HTMLElement.prototype` (`src/index.ts:105`). Si es `false`, `buildAppAction` devuelve un `<a href="https://bsky.app/...">` y no se construye ningún selector.
- `buildAppPopover` crea un `<div popover>` con los enlaces y el campo de dominio personalizado. Lo cierra con `hidePopover?.()` (al elegir app o enviar dominio).
- El posicionamiento (`top`/`left` calculados desde `btn.getBoundingClientRect()`, encima si no cabe debajo, recortado a la ventana) y el cierre por scroll/resize viven en el listener `toggle` de `buildAppAction` (`src/index.ts:375-411`).
- CSS: `.atproto-app-popover` no define `display`. Lo oculta la hoja de estilos del navegador mediante el atributo `popover`, y `.atproto-app-popover:popover-open` lo muestra como flex.
- Cabecera de respuesta: `<header>` flex con `gap`, que contiene `<b>` (nombre), `<span>` (handle) y `<time>`, sin texto entre ellos.
- Los tests (`deno test`) solo cubren lógica sin DOM (`src/i18n.test.ts`). No hay entorno DOM de pruebas.

## Goals / Non-Goals

**Goals:**
- Mismo selector y misma lógica de elección en navegadores con y sin Popover API.
- Un único punto de verdad para abrir, cerrar, posicionar y sincronizar el estado.

**Non-Goals:**
- Sustituir el popover nativo donde existe: se mantiene por su *top layer*, que es inmune a `overflow`/`z-index` de la página anfitriona.
- Polyfill general de la Popover API o soporte de `popovertarget` declarativo.
- Gestión completa del foco tipo menú (flechas, trampa de foco).

## Decisions

### 1. Dos modos con la misma interfaz interna `open()`/`close()`/`isOpen()`

`buildAppAction` crea el botón y el panel siempre. Según `SUPPORTS_POPOVER`:

```
            buildAppAction
                 |
     +-----------+------------+
     | nativo                 | respaldo
     | panel[popover]         | panel[hidden] + clase --fallback
     | btn[popovertarget]     | btn[aria-controls], click -> toggle()
     | evento "toggle"        | open()/close() llaman a onOpen/onClose
     +-----------+------------+
                 |
       onOpen(): sincronizar preferida, posicionar,
                 escuchar scroll/resize,
                 aria-expanded="true"         (código actual, extraído)
       onClose(): quitar listeners, aria-expanded="false"
```

- `buildAppButton` recibe el modo: en nativo pone `popovertarget={id}`; en respaldo pone `aria-controls={id}` (sin `popovertarget` se pierde la relación accesible que da el navegador) y el listener `click` que llama a `toggle()`.
- Orden en `open()` del respaldo: primero `panel.hidden = false` y después `onOpen()`. `onOpen` mide `offsetHeight`/`offsetWidth`, que valen 0 con `hidden`; con el orden inverso el cálculo "encima si no cabe debajo" falla en silencio. En modo nativo no aplica, porque `toggle` llega con el panel ya visible.
- `buildAppPopover` se construye antes de que exista `close`, así que `close` se define como función que lee el panel por clausura (o se pasa un callback que delega en una variable asignada después).

- `buildAppPopover` recibe un callback `close` en lugar de llamar a `hidePopover` directamente, para que elegir app o dominio cierre en ambos modos.
- Lo que hoy hace el listener `toggle` se extrae a `onOpen`/`onClose` compartidas. En modo nativo las invoca el evento `toggle`; en modo de respaldo, `open()`/`close()`.
- *Alternativa descartada*: toggle manual para todos. Se pierde el *top layer* y aparecen problemas de apilamiento en webs ajenas para la mayoría de usuarios, a cambio de beneficiar solo a una minoría.
- *Alternativa descartada*: `<details>/<summary>`. Su posicionamiento es distinto y habría que mantener dos estructuras de marcado.

### 2. Modo de respaldo: oculto con `hidden`, mostrado con clase

- En modo de respaldo NO se pone el atributo `popover`. En iOS 16 es desconocido y el panel quedaría visible siempre. Se usa `panel.hidden = true/false`.
- El panel en modo de respaldo lleva la clase `atproto-app-popover--fallback`: `position: fixed; z-index: 2147483647;` y `display: flex` cuando no está `[hidden]`. El `top`/`left` inline ya calculados funcionan igual con `fixed`, porque se calculan respecto al viewport.
- CSS: no se añade la clase nueva a la lista de selectores de `:popover-open`. En navegadores que no conocen `:popover-open`, ese pseudo invalida la regla entera. Se escribe una regla independiente.

### 3. Cierre en modo de respaldo

- Un solo juego de listeners por documento, registrado al abrir y retirado al cerrar: `pointerdown` en `document` (captura) cierra si el objetivo no está dentro del panel ni del botón; `keydown` Escape cierra y devuelve el foco al botón.
- Scroll/resize: se reutiliza `onOpen`/`onClose`.
- Ningún listener de documento sobrevive a un panel desconectado: si el componente sale del DOM con un panel de respaldo abierto (p. ej. navegación SPA o view transitions de Astro), el siguiente evento recibido comprueba `panel.isConnected` y, si es `false`, llama a `close()`, que retira los listeners y limpia `openFallback`. El popover nativo no tiene este problema: el navegador lo cierra al quitarlo del DOM.
- Un solo panel abierto a la vez: una variable de módulo `openFallback` guarda el `close` del abierto; `open()` lo invoca antes de abrir otro. En modo nativo esto ya lo hace el *light dismiss* de `popover="auto"`.
- Se usa `pointerdown` y no `click` para que el toque que abre el panel no lo cierre en el mismo gesto (el botón está excluido igualmente) y para que funcione en iOS, donde `click` en zonas no interactivas no siempre se dispara.

### 4. Scroll y resize no cierran mientras se escribe

Hoy `onOpen` registra `scroll`/`resize` con `once: true` y cierra al primer evento. En iOS, enfocar el input "Otra app" hace que el navegador desplace la página para dejarlo sobre el teclado; en Android, el teclado redimensiona la ventana. Ambos eventos cierran el selector antes de que el visitante escriba. Ya pasa en iOS 17+ con el popover nativo, y el respaldo lo extendería a iOS 16.

- El manejador común de scroll/resize no cierra si `popover.contains(document.activeElement)`. Tampoco recoloca el panel: con el teclado abierto, el viewport visual y el de layout no coinciden en iOS, y recolocar daría resultados erráticos.
- Por eso los listeners dejan de ser `once` y se retiran explícitamente en `onClose` (como ya se hace).
- Cuando el foco sale del panel, el siguiente scroll/resize lo cierra con normalidad. Pulsar fuera y Escape siguen funcionando mientras se escribe.
- Aplica a los dos modos, porque vive en `onOpen`.

### 5. `aria-expanded` en ambos modos

`aria-haspopup="true"` ya existe. Se añade `aria-expanded="false"` al crear el botón, y `onOpen`/`onClose` lo actualizan, así que vale para los dos modos. El valor inicial es necesario: sin él, el botón no expone estado hasta la primera apertura.

### 6. Separador nombre/handle como texto renderizado

Un nodo de texto `" "` entre dos ítems flex **no se renderiza** (los ítems anónimos formados solo por espacios se descartan), así que no garantiza romper la detección. Por eso se agrupan nombre y handle en un `<span class="atproto-reply__byline">` inline (ítem flex), con un espacio de texto normal entre `<b>` y el `<span>` del handle. Ahí el espacio sí se renderiza. `<time>` sigue siendo ítem flex hermano.

- Efecto visual: el espacio (~0,25em) sustituye al `gap` de 0,25rem entre nombre y handle. Nombre y handle pasan a partirse como texto si no caben, en lugar de saltar como bloques.
- Un handle largo sin espacios (dominio largo) ya no puede saltar de línea como bloque y desbordaría en móvil estrecho. La byline lleva `overflow-wrap: anywhere`.
- El texto de la byline (nombre visible con respaldo al handle, `@handle`) se calcula en una función pura sin DOM, por ejemplo `bylineParts(author)`, para cubrir con `deno test` que siempre hay separador y los casos sin `displayName` o sin `handle`. `renderReply` solo crea los nodos.
- *Alternativa descartada*: `<meta name="format-detection" content="email=no">`. Depende de cada web y no lo controla el componente.

## Risks / Trade-offs

- [El panel con `position: fixed` puede quedar mal posicionado o recortado si un ancestro del host tiene `transform`/`filter` (crea un nuevo bloque contenedor)] → Afecta solo al modo de respaldo; se documenta. El popover nativo no está afectado.
- [El `z-index` alto no sale de un contexto de apilamiento creado por un ancestro de la web anfitriona (`position` + `z-index`, `opacity < 1`, `isolation`, etc.), que es más habitual que un `transform`] → Afecta solo al modo de respaldo; se documenta junto al anterior. Mover el panel a `<body>` lo evitaría, pero perdería las variables `--atproto-*`, definidas en el elemento; se descarta en esta versión.
- [Sobrescrituras CSS de terceros sobre `.atproto-app-popover:popover-open` no se aplican al modo de respaldo] → Se documenta la clase `--fallback` en el README.
- [Sin tests DOM automáticos] → Verificación manual en escritorio forzando el modo de respaldo (`delete HTMLElement.prototype.popover` antes de cargar el módulo) y en el iPhone con iOS 16.7.x real. El modo forzado valida el JavaScript, pero no el parseo de CSS de WebKit 16 ni el comportamiento de `position: fixed` y el scroll con el teclado virtual abierto, así que la prueba en el dispositivo es imprescindible. La parte del separador se extrae a una función pura testeable con `deno test`.
- [Los Data Detectors podrían reconocer otros patrones del texto de los comentarios] → Fuera de alcance: solo se corrige el que genera el propio componente.

## Migration Plan

Publicar 1.1.2 con el flujo habitual (tag → JSR + GitHub Release; npm manual). jsDelivr `@1` lo recoge solo. xulioze.com sirve `/vendor/atproto-comments.js`, así que hay que actualizar la copia local. Rollback: volver a fijar 1.1.1.
