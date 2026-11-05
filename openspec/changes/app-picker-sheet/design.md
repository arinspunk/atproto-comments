# Design

## Context

Motivación en `proposal.md`; comportamiento esperado en los deltas de `app-chooser`, `reply-rendering` y `ui-localization`. Estado actual (1.4.0, commit `ee59086`):

- `src/element.ts`:
  - `KNOWN_APPS` (Bluesky, Mu, Deer) solo tiene `label` y `domain`. Todas las URLs se construyen con las rutas de bsky.app: `/profile/<did>/post/<rkey>`, `/profile/<did>` y `/hashtag/<tag>`.
  - `buildAppAction` crea por cada botón un popover propio (`buildAppPopover`), con un id `atproto-pop-N`. Con Popover API lo abre `popovertarget`. Sin ella hay un modo alternativo con `hidden`, listeners en `document` y la variable de módulo `openFallback`. `onOpen` lo posiciona a mano y añade listeners de scroll y resize, que respetan el foco dentro del panel.
  - `appBase(anyApp)`, `setAppLink` y `refreshAppLink`, con un `WeakMap` de enlaces a `{ path, anyApp }`, resuelven menciones, hashtags y «View more» con la preferencia del momento en que se abren.
  - `renderReply` pinta el byline como `<span class="atproto-reply__byline"><b class="atproto-reply__author">` y la fecha como `<time class="atproto-reply__time">`, sin enlaces.
  - `#render()` sustituye solo los nodos de `#nodes`; el contenido que puso la web dentro del elemento se respeta.
- `src/pref.ts`: guarda un dominio en `localStorage["atproto-preferred-app"]`.
- `src/i18n.ts`: las claves salen de `EN`, y `translate()` sustituye marcadores `{name}`.
- Tests: Deno para los módulos sin DOM; `tests/browser` (Chromium y WebKit, solo en local) con `picker.mjs`, `preference.mjs`, `details.mjs` y `lifecycle.mjs`, que hoy buscan `.atproto-app-popover*`.
- El componente ya exige Safari/iOS 15.4 (`:has()`, `oklch()`), que es también la versión en la que llega `<dialog>`.

## Goals / Non-Goals

**Goals:**
- Un único punto que decide las URLs de cada app, sin DOM y probado en Deno.
- Quitar el modo alternativo sin Popover API, el posicionamiento a mano y los listeners de scroll y resize. El panel se apoya en el comportamiento nativo de `<dialog>`.
- Que las variables `--atproto-*` que la web define en el elemento sigan aplicándose al panel.

**Non-Goals:**
- Una lista de apps configurable por el integrador: la forma de cada entrada queda interna para poder cambiarla.
- Usar `closedby="any"`, que aún no está en Safari; el cierre al pulsar fuera se hace a mano.
- Variables CSS nuevas para el panel. Se estiliza con las existentes y con clases.
- Agrupar las apps o añadir un botón de copiar enlace.

## Decisions

### 1. Un `<dialog>` modal por elemento, creado al abrirlo

```
 [Comment] / [Reply] --click--> host.#openSheet({ kind, did, rkey, name })
                                     |
                                     v
                    dialog ya existe?  -- no --> crearlo y añadirlo al host
                                     |
                                     v
                    rellenarlo con loc() actual + destino + readPref()
                                     |
                                     v
                    dialog.showModal()   (top layer, resto de la página inerte)
```

- **Uno por elemento**, no uno por botón ni uno por página. Se crea la primera vez que se abre y se reutiliza. Así desaparecen los N popovers por hilo (el punto 4.1 de la auditoría).
- **Vive dentro del host**, como último hijo, fuera de `#nodes`, para que `#render()` no lo borre. En el top layer sigue siendo descendiente del host, así que hereda las variables `--atproto-*` y le aplica el selector `atproto-comments, :where(.atproto-comments)`.
- **Se rellena en cada apertura**, con las cadenas y la preferencia del momento. Así nunca muestra textos o una preferencia desactualizados.
- **`#render()` y `disconnectedCallback()` lo cierran** si está abierto: esto cubre el requisito «El panel se cierra si cambia lo que muestra el elemento». Quitar el elemento con el diálogo abierto lo sacaría del top layer pero dejaría `open`; cerrarlo antes evita que la página quede inerte.
- `showModal()` ya hace que solo haya un panel abierto a la vez, deja inerte el resto de la página (incluido otro `<atproto-comments>`) y atrapa el foco.
- *Alternativa descartada*: seguir con `popover`. No es modal, no deja inerte el resto de la página, y en iOS 16 seguiría necesitando el modo alternativo.
- *Alternativa descartada*: un único diálogo en `document.body` para toda la página. Perdería las variables `--atproto-*` definidas en cada elemento y los estilos que la web aplica dentro de él.

### 2. Cierre y foco

- **Escape**: lo gestiona el navegador (evento `cancel`).
- **Pulsar fuera**: un clic sobre el `::backdrop` llega al diálogo con `event.target === dialog`. Como el diálogo ocupa todo el ancho y el contenido va en una columna centrada, un clic en las franjas vacías junto a la columna también llega con `event.target === dialog`. Por eso solo se cierra si, además, el punto del clic queda fuera del rectángulo del diálogo.
- **Enter en «Other app»**: el `keydown` llama a `preventDefault()`. Si no, en Chromium la misma pulsación activa el botón que abrió el panel, que recupera el foco al cerrarse, y lo vuelve a abrir.
- **Elegir una app**: el `click` del enlace guarda la preferencia y cierra el diálogo. El enlace abre la pestaña nueva por sí mismo (`target="_blank"`).
- **Foco al cerrar**: se guarda el botón que lo abrió y se le devuelve el foco en el evento `close`, sin depender de que cada navegador lo restaure (Safari 15.4–16 no es fiable en esto). Si el panel se cerró por un re-render, ese botón ya no existe. El evento `close` llega después del render, así que el foco pasa al botón principal nuevo. Si todavía no hay botón (mientras carga otro hilo), pasa al propio elemento con un `tabindex="-1"` temporal, que se quita al perder el foco.
- **Foco al abrir**: la primera app de la lista lleva `autofocus`. Es la usada la última vez, si la hay, o Bluesky. Abrir con el teclado y pulsar Enter repite la elección habitual.
- No hay listeners de scroll ni resize: el teclado virtual ya no puede cerrar el panel.

### 3. Lista de apps y rutas en `src/apps.ts`

Un módulo sin DOM, probado en Deno, sustituye a `KNOWN_APPS` y a `appBase`:

```ts
interface AppDef {
  name: string;                    // nombre visible
  domain: string;                  // identidad de la app y valor guardado en la preferencia
  routes: {
    post: string;                  // p. ej. "/profile/{did}/post/{rkey}"
    profile: string;               // p. ej. "/profile/{did}"
    hashtag: string | null;        // null = la app no tiene ruta de hashtag
  };
}

export const APPS: readonly AppDef[];
export function findApp(domain: string | null): AppDef | undefined;  // la app de ese dominio, si está en la lista
export function orderedApps(pref: string | null): { app: AppDef; lastUsed: boolean }[];
export function appUrl(pref: string | null, link: AppLinkTarget): string;
// AppLinkTarget = { kind: "post", did, rkey } | { kind: "profile", did } | { kind: "hashtag", tag }
```

- Las rutas son plantillas con `{did}`, `{rkey}` y `{tag}`. Cada valor se codifica con `encodeURIComponent` al sustituirlo, salvo `:`, que es válido en un segmento de ruta: así un DID queda como `/profile/did:plc:…` y no como `did%3Aplc%3A…`, que es lo que piden los escenarios.
- `appUrl` aplica las reglas de los deltas:
  - preferencia que está en `APPS`: sus rutas; si `hashtag` es `null`, el hashtag va a bsky.app;
  - dominio personalizado: rutas de bsky.app para post y perfil, y bsky.app para el hashtag;
  - sin preferencia: bsky.app.
- `orderedApps` pone Bluesky la primera y el resto por orden alfabético con `localeCompare`. Si la preferencia está en la lista, la saca de su sitio y la pone delante con `lastUsed: true`.
- El `WeakMap` de `element.ts` pasa a guardar un `AppLinkTarget` en lugar de `{ path, anyApp }`. `refreshAppLink` llama a `appUrl(readPref(), target)`. Menciones, hashtags, «View more», autor y fecha usan el mismo mecanismo.
- La preferencia sigue siendo un dominio con la misma clave, así que `src/pref.ts` no cambia y las preferencias de 1.x se reconocen.
- *Alternativa descartada*: guardar en la preferencia un id de app en lugar del dominio. Rompería las preferencias guardadas por 1.x y no aporta nada mientras cada app tenga un dominio.

### 4. Investigación de apps (primera tarea)

La lista definitiva sale de comprobar cada candidata (Anisota, Red Dwarf, Impro, Blacksky y Northsky; además se revisan Bluesky, Mu y Deer). Para cada una:

1. **¿Se puede iniciar sesión con una cuenta de cualquier PDS?** Se prueba con una cuenta que no esté en bsky.social (p. ej. Eurosky).
2. **¿Se puede responder a un post abriendo su URL?** Se comprueba con un post real.
3. **¿Cuál es la ruta de un post, de un perfil y de un hashtag?** Tienen que funcionar con el DID: el componente no conoce el handle del autor del post ancla. El handle del autor de una respuesta sí lo conoce, pero no se usa para mantener una sola regla.
4. **¿Es una app web con un dominio estable?** Quedan fuera las que solo existen como app móvil.

El resultado se apunta en una tabla en este mismo documento (sección «Apps comprobadas»), con la fecha de la comprobación. Una app que no cumple 1–4 queda fuera, aunque salga en dame.is.

### 5. DOM del panel

```html
<dialog class="atproto-app-sheet" aria-labelledby="atproto-sheet-N-title">
  <div class="atproto-app-sheet__body">
    <div class="atproto-app-sheet__header">
      <p class="atproto-app-sheet__title" id="atproto-sheet-N-title">Reply to Ana in…</p>
      <button type="button" class="atproto-app-sheet__close" aria-label="Close"><span aria-hidden="true">×</span></button>
    </div>
    <p class="atproto-app-sheet__note">…</p>                  <!-- solo si pickerNote no está vacía -->
    <ul class="atproto-app-sheet__list">
      <li><a class="atproto-app-sheet__app atproto-app-sheet__app--last-used" href="…" target="_blank" rel="noopener noreferrer" autofocus>
        <span class="atproto-app-sheet__name">Deer</span>
        <span class="atproto-app-sheet__badge">Last used</span>
        <span class="atproto-app-sheet__arrow" aria-hidden="true">↗</span>
      </a></li>
      …
    </ul>
    <div class="atproto-app-sheet__custom">
      <label class="atproto-app-sheet__label" for="atproto-sheet-N-input">Other app</label>
      <input class="atproto-app-sheet__input" id="atproto-sheet-N-input" …>
      <button type="button" class="atproto-app-sheet__go" aria-label="Open"><span aria-hidden="true">→</span></button>
    </div>
  </div>
</dialog>
```

- **El título es un `<p>`, no un `<h2>`.** El componente renderiza en el light DOM y los estilos de `h2` de la web se le aplicarían. El nombre accesible del diálogo sale de `aria-labelledby`.
- **«Other app» pasa de separador a `<label>` del campo.** El nombre accesible sigue siendo `otherApp`, como pide el requisito existente, y ya no hace falta `aria-label` en el input. Se mantienen `inputMode="url"`, `autocapitalize="off"`, la validación nativa con `invalidDomain` y el resto del comportamiento del campo.
- **El botón que abre el panel** conserva `.atproto-app-action > .atproto-app-btn(--xl)`, para que los estilos que la web tenga sobre él sigan sirviendo. Pierde `popovertarget`/`aria-controls` y `aria-expanded`, y gana `aria-haspopup="dialog"`.
- Los ids usan un contador por módulo, como `atproto-pop-N` ahora.

### 6. Estilos del panel

- `.atproto-app-sheet`: `position: fixed`, `inset: auto 0 0 0`, `margin: 0`, `width: 100%`, `max-width: 100%`, `max-height: 85vh` (y `85dvh` donde exista), `overflow: auto`, `border: 0` con `border-top` de `--atproto-color-border`, fondo `Canvas` y texto `CanvasText`, como el popover actual. También `padding-bottom: env(safe-area-inset-bottom)`.
- `.atproto-app-sheet__body`: columna centrada con `max-width: 36rem` y `margin-inline: auto`.
- `::backdrop`: `oklch(0% 0 0 / 40%)`.
- Las apps son filas a todo el ancho de la columna, con el borde de `--atproto-color-border` y `--atproto-color-surface` en hover y foco, como en la captura de referencia. `--last-used` lleva el mismo fondo que el hover.
- **Animación**: el panel entra deslizándose desde abajo con `@starting-style` y `transition`, solo con `prefers-reduced-motion: no-preference`. En navegadores sin `@starting-style` aparece sin animación.
- Se borran todas las reglas `.atproto-app-popover*`.

### 7. Autor y fecha enlazados

```html
<header class="atproto-reply__header">
  <a class="atproto-reply__byline" href="…/profile/<did>" target="_blank" rel="noopener noreferrer">
    <b class="atproto-reply__author">Ana</b> <span class="atproto-reply__handle">@ana.example</span>
  </a>
  <a class="atproto-reply__permalink" href="…/profile/<did>/post/<rkey>" target="_blank" rel="noopener noreferrer">
    <time class="atproto-reply__time" datetime="…" title="…">3 d</time>
  </a>
</header>
```

- El byline pasa de `<span>` a `<a>`, con la misma clase. El espacio entre nombre y handle sigue siendo texto, así que el requisito de los Data Detectors de iOS se mantiene, y dentro de un enlace iOS ya no detecta nada.
- Sin DID del autor, el byline sigue siendo `<span>` y la fecha va sin enlace, porque no hay a dónde enlazar. Por lo mismo, esa respuesta no tiene botón «Reply» ni enlace «View more» (en 1.x abrían `/profile//post/…`).
- Los dos enlaces usan el `WeakMap` de la decisión 3, con `{ kind: "profile" }` y `{ kind: "post" }`.
- CSS: `color: inherit` y sin subrayado, con subrayado en hover y foco. El separador `· ` pasa de `.atproto-reply__time::before` a `.atproto-reply__permalink::before`, para que quede fuera del `<time>` pero dentro de la misma caja.
- *Alternativa descartada*: enlazar también el avatar. Añade un tercer destino de tabulación por respuesta sin aportar nada.

### 8. Claves nuevas

`commentIn`, `replyIn` (con `{name}`), `pickerNote` (vacía), `close` y `lastUsed`, en `EN` y en `pt` (textos en el delta de `ui-localization`). Entran solas en `StringKey`/`UiStrings`. `replyTo`, que es el nombre accesible del botón «Reply», no cambia. `{name}` en `replyIn` y en `replyTo` es el mismo nombre que muestra el byline (`bylineParts`): `displayName`, o `handle`, o `unknownAuthor`. Un `displayName` o un `handle` vacíos cuentan como ausentes, así que nunca sale «Reply to  in…».

### 9. Pins de versión major

`scripts/check-versions.js` comprueba hoy los pins exactos (`@1.4.0`), no los de major (`@1/` en las URLs de CDN y «`@1` gets every 1.x fix…»). Se amplía para que también fallen si el major de esos pins no coincide con el de `package.json`. Así no se publica una 2.0 cuyo README siga recomendando `@1`.

## Risks / Trade-offs

- [Las apps de terceros cambian de rutas o desaparecen] → La lista se fija con la fecha de la comprobación (decisión 4). Cambiarla es un patch o una minor, y mientras tanto el visitante tiene el campo «Other app». Una lista configurable queda para 2.x.
- [Un clic fuera del panel que el visitante quería que llegara a la página (p. ej. «Reply» en otra respuesta)] → Con un diálogo modal es lo esperado: el primer clic cierra el panel. Se documenta en el escenario «Abrir otro selector».
- [Safari 15.4–16 con `<dialog>`: foco, `autofocus` y `::backdrop`] → El foco se devuelve a mano (decisión 2). Se verifica a mano en iOS 16 con VoiceOver.
- [Estilos de la web que se cuelan en el panel (light DOM): `p`, `ul`, `a`, `button`, `input`] → Las reglas del panel fijan márgenes, padding, `list-style`, fuente y color de sus elementos. Se revisa con una página de prueba que tenga estilos globales agresivos.
- [Integradores con CSS para `.atproto-app-popover*` o para `span.atproto-reply__byline`] → Es una 2.0: el CHANGELOG lleva una sección de migración con la correspondencia de clases. `@1` en el CDN y `^1` en npm no reciben la 2.0 automáticamente.
- [El top layer y `position: fixed` con el teclado virtual en iOS] → El panel se desplaza por dentro (`max-height` + `overflow: auto`). Se verifica a mano escribiendo en «Other app» en iOS 16 y 17.

## Migration Plan

- Se publica como **2.0.0**: tag `v2.0.0` en `main` (comprobación de versiones, tests, JSR y GitHub Release) y npm a mano.
- El CHANGELOG lleva «Removed», «Changed», «Added» y una sección «Migrating from 1.x»:
  - correspondencia de clases: `.atproto-app-popover` → `.atproto-app-sheet`, `__link` → `__app`, `__link--active` → `__app--last-used`, `__separator` → `__label`, `__custom`/`__input`/`__go` → mismo sufijo en `.atproto-app-sheet`, y `--fallback` desaparece sin sustituto;
  - el byline ahora es `<a>` y hay un enlace `.atproto-reply__permalink`;
  - cambio de pins a `@2`.
- README: «Markup», «Browser support» (fila de `<dialog>` en lugar de Popover API, sin el párrafo del modo alternativo), «How it works», «What is shown» y la tabla de claves.
- Después de publicar: actualizar Parolas (`../atproto-comments-plugin`) a `^2.0.0` y añadir sus `strings` traducidas para las claves nuevas. Es trabajo de ese repo.
- Vuelta atrás: quien tenga problemas fija `@1.4.0`; la 1.x no se toca.

## Open Questions

- Qué apps candidatas pasan la comprobación de la decisión 4 y con qué rutas. Se resuelve en la primera tarea; no cambia ni el enfoque ni las specs, que hablan de «apps de la lista» y de sus rutas.

## Apps comprobadas

Comprobación del 2026-11-05. DID de prueba `did:plc:cwf4mmm7mpzistinx3ox2zhj` (toni.bsky.team), post `3mzjmn67mak2z`, hashtag `bluesky`. Las rutas se abrieron en Chromium sin sesión y se comprobó que la página mostraba el perfil, el texto del post o el hashtag. El catálogo `@aturi.to/waypoints` 0.1.4 (el que usa dame.is) da las mismas rutas de post y perfil para las ocho apps.

| App | Dominio | Post | Perfil | Hashtag | Entra | Motivo |
|---|---|---|---|---|---|---|
| Bluesky | `bsky.app` | `/profile/{did}/post/{rkey}` | `/profile/{did}` | `/hashtag/{tag}` | sí | Referencia. |
| Mu | `mu.social` | ídem | ídem | `/hashtag/{tag}` | sí | Fork de social-app; inicio de sesión con proveedor de hosting elegible. |
| Deer | `deer.social` | ídem | ídem | `/hashtag/{tag}` | sí | Fork de social-app con OAuth. |
| Anisota | `anisota.net` | ídem | ídem | `null` | sí | OAuth. No tiene ruta `/hashtag/`: sus propios hashtags van a `/search?q=%23tag`, que sin sesión falla. |
| Red Dwarf | `reddwarf.app` | ídem | ídem | `null` | sí | OAuth; tiene compositor «Reply to @…». Router sin ruta de hashtag (solo `/search`). Versión preview (v0.0.2). |
| Impro | `impro.social` | ídem | ídem | `/hashtag/{tag}` | sí | OAuth; el compositor admite respuestas. `/hashtag/:tag` existe pero pide iniciar sesión. |
| Blacksky | `blacksky.community` | ídem | ídem | `/hashtag/{tag}` | sí | Fork de social-app con OAuth. |
| Northsky | `northsky.app` | ídem | ídem | `/hashtag/{tag}` | sí | Fork de social-app. `northsky.social` es el PDS, no la app. |

Criterios 1 (iniciar sesión con una cuenta de fuera de bsky.social) y 2 (responder desde la URL de un post): comprobados por el código de cada app (cliente OAuth con resolución de handle, o login de social-app con proveedor elegible; compositor de respuestas), no con una cuenta real.

Decisión del usuario (2026-11-05, tarea 1.2): entran las ocho. Anisota y Red Dwarf con hashtag `null` (bsky.app). Impro mantiene `/hashtag/{tag}` aunque pida sesión. Los criterios 1 y 2 se dan por cumplidos con la evidencia del código. Mu y Deer pasan, así que el escenario «Apps conocidas» no cambia.
