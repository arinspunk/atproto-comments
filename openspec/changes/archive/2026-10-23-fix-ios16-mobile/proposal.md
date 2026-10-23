# Proposal

## Why

En un iPhone real con iOS 16.7.x (Safari y Chrome, que en iOS usan el mismo motor WebKit) aparecen dos fallos que no se reproducen al simular un móvil en las DevTools de escritorio:

1. **"Responder"/"Comentar" lleva directamente a bsky.app** sin dejar elegir Mu, Deer u otra app. iOS 16 no tiene Popover API, y en ese caso el componente sustituye el selector de apps por un enlace fijo a Bluesky. iOS 16.7.x es la última versión disponible para iPhone 8 y X, así que esos usuarios nunca tendrán popover nativo.
2. **El handle aparece subrayado y al tocarlo se abre el correo.** El nombre y el handle se renderizan sin ningún espacio en el texto (el hueco visual lo pone el `gap` de flexbox), así que los Data Detectors de iOS leen `Nombre@handle.dominio` como una dirección de email y lo convierten en `mailto:`.

## What Changes

- Cuando el navegador no soporta la Popover API, el botón de la acción abre el mismo selector de apps (apps conocidas + dominio personalizado), mostrado y ocultado por el propio componente, en lugar de enlazar directamente a bsky.app. Donde hay Popover API se mantiene el popover nativo sin cambios.
- El selector de respaldo se cierra al pulsar fuera, con Escape, al hacer scroll o redimensionar la ventana, y al elegir una app. El botón expone su estado abierto/cerrado a tecnologías de asistencia.
- En ambos modos, el scroll o el redimensionado que provoca el teclado virtual al escribir en "Otra app" ya no cierran el selector. Hoy ocurre en iOS 17+ con el popover nativo y, sin este ajuste, el respaldo lo trasladaría a iOS 16.
- La cabecera de cada respuesta incluye un espacio de texto real entre el nombre y el handle, para que el texto no forme un email. El aspecto visual no cambia.
- Versión de parche (1.1.2). Sin cambios en la API pública (atributos, propiedades, claves de `strings`, variables CSS).

## Capabilities

### New Capabilities
- `app-chooser`: el selector que permite al visitante abrir el post en la app AT Protocol que elija (apps conocidas, dominio personalizado, preferencia recordada), incluido su comportamiento en navegadores sin Popover API. Gran parte de lo que describe ya existe en 1.1.1 y no tenía spec; se documenta aquí para tener una base completa. Lo nuevo es el modo de respaldo, `aria-expanded` y la excepción de cierre mientras se escribe.
- `reply-rendering`: cómo se presenta cada respuesta (autor, handle, fecha, texto), incluido que su texto no se pueda interpretar erróneamente como datos autodetectables.

### Modified Capabilities

## Impact

- `src/index.ts`: `buildAppAction`, `buildAppPopover` (cierre independiente de `hidePopover`), `buildAppButton` (`popovertarget` solo en modo nativo; `aria-controls` y `aria-expanded`) y la cabecera en `renderReply`.
- `src/atproto-comments.css`: estilos del panel abierto en modo de respaldo, sin depender de `:popover-open`.
- `README.md`: nota sobre compatibilidad de navegadores.
- Navegadores afectados: iOS/iPadOS < 17 (todos los navegadores en iOS) y cualquier navegador sin Popover API (p. ej. Firefox < 125).
- Webs que ya usan el componente: sin cambios de integración. Quien sobrescriba `.atproto-app-popover` debe comprobar que su CSS no dependa solo de `:popover-open`.
