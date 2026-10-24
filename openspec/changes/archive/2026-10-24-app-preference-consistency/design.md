# Design

## Context

Motivación en `proposal.md`; comportamiento esperado en los deltas de `app-chooser`, `reply-rendering`, `ui-localization` y `element-lifecycle`. Estado actual (versión 1.3.0, commit `5dc6fe8`):

- `src/text.ts`, `facetSegments`: los enlaces de las facets llevan la URL ya hecha. Las menciones van a `https://bsky.app/profile/<did>` y los hashtags a `https://bsky.app/hashtag/<tag>`.
- `src/element.ts`:
  - `renderReply` construye «View more» con `https://bsky.app/profile/<did>/post/<rkey>` y descarta las respuestas `blockedPost`, `hiddenUris` e `isHiddenByLabel(post.labels)`;
  - `buildAppPopover` crea el botón con `textContent = "→"` y sin nombre accesible;
  - `buildAppButton` pone `aria-haspopup="true"`;
  - `formatRelativeTime` devuelve `dd/mm/yyyy` fijo para más de un año, y `formatAbsoluteDate` ya usa `Intl.DateTimeFormat(loc.locale)`.
- `src/byline.ts`, `bylineParts`: usa «Unknown» fijo.
- `src/pref.ts`: `readPref()` devuelve el dominio preferido o `null`, protegido frente a un `localStorage` bloqueado.
- `src/thread.ts`: `sortedReplies` ya deja solo los `threadViewPost`, y `isHiddenByLabel(labels)` decide con la lista de etiquetas.
- `src/types.ts`: `ProfileViewBasic` no tiene `labels`, y `Label` solo declara `val`.
- `renderThread` en `src/element.ts` devuelve `[list, comment()]` en cuanto hay alguna respuesta de tipo `threadViewPost`, aunque `renderReply` las descarte todas: la lista puede quedar vacía.
- Tests: Deno sin DOM para los módulos puros y `tests/browser` (Chromium y WebKit) para el DOM.

## Goals / Non-Goals

**Goals:**
- Que cada cambio de comportamiento tenga test: los puros en Deno y los de DOM en `tests/browser`.
- Que la salida visible no cambie salvo en lo que piden los deltas.

**Non-Goals:**
- Crear el panel del selector al abrirlo (4.1): cambia el DOM documentado y se descartó.
- `Intl.RelativeTimeFormat` para las unidades relativas.
- Un texto o esqueleto de carga por defecto.

## Decisions

### 1. Enlaces a la app preferida, resueltos al abrirlos

```
 render:  <a href="https://<pref o bsky.app>/profile/<did>">   +  WeakMap enlace → "/profile/<did>"
 abrir:   pointerdown / focusin / click en el elemento  ──>  si el enlace está en el WeakMap,
                                                              href = https://<readPref() ?? "bsky.app"><ruta>
```

- `appBase(anyApp)` devuelve `https://<preferencia>` o `https://bsky.app`. Con `anyApp` en `true` (menciones y «View more») vale cualquier preferencia; con `false` (hashtags) solo una de `KNOWN_APPS`, y un dominio personalizado cae en bsky.app. `readPref` ya cubre el almacenamiento bloqueado.
- **Hashtags:** las rutas `/profile/<did>` y `/profile/<did>/post/<rkey>` ya las usa el selector en todas las apps, pero `/hashtag/<tag>` no. Se comprobó a mano que Mu la tiene; Bluesky es la referencia, y Deer es un fork de la app de Bluesky (confirmado en la verificación manual, tarea 5.2). Un dominio personalizado puede no tenerla, y un 404 es peor que abrir el hashtag en bsky.app. Por eso los hashtags solo siguen la preferencia si es una app conocida.
- Las menciones, los hashtags y «View more» se crean con el `href` calculado en el render, para que funcionen sin JavaScript extra y se vean bien al pasar el ratón. La ruta y si admite cualquier app se guardan en un `WeakMap<HTMLAnchorElement, { path, anyApp }>` a nivel de módulo, sin atributos nuevos en el DOM.
- El elemento escucha `pointerdown`, `focusin` y `click` en fase de captura y, si el destino está en el `WeakMap`, vuelve a calcular el `href`. Así un cambio de preferencia posterior al render se aplica antes de cualquier forma de abrir el enlace: clic, clic central, menú contextual («copiar enlace») o Enter con el teclado. Los listeners se añaden en el constructor, una vez por elemento.
- `facetSegments` deja de construir la URL de las menciones y los hashtags: devuelve `{ text, mention: did }` y `{ text, tag }`, y `{ text, href }` para los enlaces, que no cambian. `buildFacetedText` construye esas URLs con `appBase()` y registra su ruta; el tag se codifica con `encodeURIComponent` al construir la ruta, como antes.
- *Alternativa descartada*: calcular el `href` solo en el render. Un visitante que elige app y luego pulsa una mención abriría bsky.app hasta el siguiente render.
- *Alternativa descartada*: re-renderizar todos los elementos al cambiar la preferencia. Necesita un evento global entre instancias y cerraría los selectores abiertos.

### 2. Fechas en un módulo sin DOM

`src/date.ts` recibe `isValidDate`, `formatRelativeTime` y `formatAbsoluteDate` de `element.ts`, con firma pura:

```ts
export function formatRelativeTime(iso: string, strings: ResolvedStrings, locale: string, now?: number): string;
```

- El parámetro `now` (por defecto `Date.now()`) hace los tests deterministas.
- Para más de un año: `new Intl.DateTimeFormat(locale, { dateStyle: "short" })`, dentro de un `try` que cae en `toISOString().slice(0, 10)` si el locale no es válido. `Loc.locale` ya llega validado por `resolveLocale`, así que el `catch` es solo defensa.
- Las unidades relativas (`now`, `minutes`, `hours`, `days`, `months`) no cambian.

### 3. Claves nuevas y `viewMore`

- `go`: «Open» / «Abrir». `unknownAuthor`: «Unknown» / «Desconhecido». `viewMore`: «View more replies» / «Ver mais respostas».
- `bylineParts(author, unknown)` recibe el texto como parámetro y sigue siendo puro.
- Las claves nuevas entran en `StringKey` y en `UiStrings` porque se derivan de `EN`, así que los tipos públicos crecen sin tocar nada más.

### 4. Botón «→»

```html
<button type="button" class="atproto-app-popover__go" aria-label="Open"><span aria-hidden="true">→</span></button>
```

El estilo actual de `.atproto-app-popover__go` no depende de que la flecha sea texto directo; se comprueba con una captura antes y después.

### 5. Sin `aria-haspopup`

Se elimina la línea de `buildAppButton`. `aria-expanded` y `popovertarget` o `aria-controls` no cambian.

### 6. Etiquetas del autor

- `ProfileViewBasic` gana `labels?: Label[]`, y `Label` gana `uri?: string`.
- El campo `labels` de un perfil mezcla dos tipos de etiqueta, que se distinguen por su `uri`:
  - **de la cuenta**: `uri` es el DID del autor. Se aplican a todo lo que publica;
  - **del registro de perfil**: `uri` termina en `/app.bsky.actor.profile/self`. Se refieren al avatar y al banner. Bluesky las trata así en su librería de moderación: `nudity` sobre el perfil oculta el avatar, no los posts.
- El filtro de `renderReply` pasa a una función pura en `thread.ts`, `isReplyHidden(post, hidden)`, que junta la URI ocultada en el threadgate, las etiquetas del post y las etiquetas de cuenta del autor, es decir, las que cumplen `label.uri === post.author.did`. Si el autor no tiene `did`, no se tiene en cuenta ninguna de sus etiquetas. Así se prueba en Deno sin DOM.
- *Alternativa descartada*: usar todas las etiquetas del autor. Quien marcara su avatar como `nudity` desaparecería de todos los hilos.
- La comprobación de `blockedPost` en `renderReply` desaparece (4.2): `sortedReplies` ya la cubre.

### 7. Sin lista vacía

- `renderThread` construye la lista y, si al terminar no tiene hijos, devuelve solo `[comment()]`, igual que con `replies.length === 0`.
- Se decide después de `renderReply`, no antes, porque solo ahí se sabe si alguna respuesta sobrevive al threadgate y a las etiquetas.
- Lo mismo pasa un nivel más abajo: si todas las subrespuestas de una respuesta quedan ocultas, `renderReply` añadía un `<ol class="atproto-reply__replies">` vacío. Se aplica el mismo criterio (hallado al implementar).

### 8. Estado de carga

- `#setLoading(on)` pone o quita a la vez `aria-busy="true"` y la clase `atproto-comments--loading`.
- Se activa en `#fetch` al empezar la petición. Se desactiva en `#abort()`, que ya se llama al desconectar, al empezar otra carga y al pasar a un `thread-uri` inválido, y al aceptar la respuesta, antes de `#render()`.
- Cambiar `lang` o `strings` no pasa por `#fetch`, así que no activa el estado.
- La clase se documenta en el README como clase pública, junto a `atproto-comments`.

## Risks / Trade-offs

- [Un dominio personalizado sin la ruta `/profile/<did>`] → La misma ruta ya se usa para abrir el post en esa app desde el selector. Quien elige un dominio asume que entiende las rutas de Bluesky.
- [Los listeners de captura en cada elemento] → Son tres por elemento, no por enlace, y solo miran un `WeakMap`.
- [Webs que mostraban «View more on Bluesky» y ahora ven «View more replies»] → Se documenta en «Changed» del CHANGELOG. Quien quiera el texto anterior lo pone en `strings`.
- [Dejan de verse respuestas de autores etiquetados] → Es lo que piden las etiquetas de moderación sobre la cuenta; se documenta en «Moderation» del README y en el CHANGELOG. Las etiquetas del registro de perfil no ocultan nada, así que una etiqueta sobre el avatar no hace desaparecer a nadie.
- [Tests de fechas que dependen de la zona horaria] → La fecha se muestra en la hora local del visitante, y ninguna hora UTC cae en el mismo día en todas las zonas: van de UTC−12 a UTC+14 (al implementar, el mediodía UTC del 2 de enero salió como el 3 en `Pacific/Auckland`). Los tests de Deno construyen la fecha a mediodía local (`new Date(2020, 0, 2, 12)`) y se ejecutan también con `TZ` en `America/Los_Angeles`, `Pacific/Auckland`, `Pacific/Kiritimati` y `Etc/GMT+12`. El escenario de navegador fija la zona horaria de la página con Playwright (`timezoneId`).

## Migration Plan

Sin migración. Se publica como 1.4.0: tag `v1.4.0` en `main` (comprobación de versiones, tests, JSR y GitHub Release) y npm a mano.
