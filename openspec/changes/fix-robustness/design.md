# Design

## Context

Motivación en `proposal.md`; comportamiento esperado en los deltas de `reply-rendering` y `app-chooser`. Estado actual relevante (commit `460de08`):

- `src/index.ts` contiene los tipos, las funciones puras y todo el código DOM. Al importarlo se evalúa `HTMLElement.prototype` y se registra el elemento, así que no se puede importar desde `deno test`. Solo `i18n.ts` y `byline.ts` tienen tests.
- `hiddenUris` (`:167`) lee `hiddenReplies` como `{ uri }[]`. El lexicon define `string[]` con formato `at-uri` (máximo 300).
- `localStorage` se usa en cuatro sitios: lectura al construir el panel (`:279`), escritura al elegir app (`:302`) o dominio (`:334`) y lectura al abrir (`:381`).
- `getInitials` (`:138`) usa `new Intl.Segmenter` sin comprobar que exista.
- El input de «Otra app» (`:316`) solo tiene `placeholder`. `openCustom` (`:327`) pone `aria-invalid` y no muestra ningún mensaje.
- `ci.yml` ejecuta `npm ci`, `npx tsc --noEmit` y `node scripts/build.js`. `release.yml` ejecuta `npm ci`, `npm run build`, `deno publish` y crea la GitHub Release. Ninguno ejecuta `deno task test`.
- Restricción de parche: no se añaden atributos, propiedades, claves de `strings`, variables CSS, clases ni elementos al DOM documentado en el README.

## Goals / Non-Goals

**Goals:**
- Que todo lo que arregla este change quede cubierto por tests en Deno que se ejecutan en el CI.
- Que la salida visible no cambie salvo en lo que piden los deltas.

**Non-Goals:**
- Un entorno DOM de pruebas (jsdom, happy-dom). Lo que depende del DOM se prueba a mano.
- Extraer todo `index.ts`. Solo salen las funciones puras que este change toca o que necesitan tests, y la parte de cálculo de las facets.
- Cambiar el ciclo de vida del elemento (change `component-lifecycle`) o el empaquetado (change `packaging-and-ci`).

## Decisions

### 1. Módulos sin DOM

```
 src/index.ts  (DOM, clase, registro)
    |
    +--> src/types.ts   interfaces del AppView (Label, Facet, PostView, ThreadViewPost, Threadgate...)
    +--> src/thread.ts  hiddenUris, isHiddenByLabel, sortedReplies
    +--> src/text.ts    getInitials, normalizeDomain, facetSegments
    +--> src/pref.ts    readPref, writePref
    +--> src/i18n.ts, src/byline.ts   (ya existen)
```

- Ninguno de los módulos nuevos toca `document` ni `HTMLElement`, así que se pueden importar desde `deno test`.
- `index.ts` no reexporta nada nuevo. La API pública (`AtprotoComments`, `StringKey`, `UiStrings`) no cambia. `deno.json` ya publica `src/**/*.ts` en JSR, y el bundle de npm los incluye porque esbuild sigue los imports.
- Las funciones exportadas desde estos módulos llevan tipo de retorno explícito, para no generar avisos de *slow types* en `deno publish`.
- *Alternativa descartada*: un único `utils.ts`. Separar por tema deja tests pequeños y hace más fácil que `component-lifecycle` y `app-preference-consistency` toquen cada parte sin conflictos.

### 2. `hiddenUris` acepta `string[]` y descarta lo demás

```ts
interface Threadgate { record?: { hiddenReplies?: unknown[] } }
```

La lista se filtra con `typeof u === "string"`. El tipo `unknown[]` obliga a filtrar y protege frente a AppViews que devuelvan datos mal formados. `HiddenReply` desaparece. El resto de `renderReply` no cambia: si una respuesta está oculta devuelve `null`, y con ella desaparece su subárbol, como pide la spec.

### 3. `readPref` y `writePref` envuelven también el acceso a la propiedad

En Chrome con las cookies de terceros bloqueadas lo que lanza es el propio acceso a `window.localStorage`, no `getItem`. Por eso el `try` envuelve la expresión completa `localStorage.getItem(...)`. `readPref` devuelve `string | null` y `writePref` no hace nada si falla. Se sustituyen los cuatro accesos.

Para los tests, `pref.ts` lee el almacenamiento a través de `globalThis.localStorage`, y el test lo sustituye con `Object.defineProperty` por un getter que lanza `DOMException("", "SecurityError")`, restaurándolo en `finally`. Si en Deno la propiedad no fuera configurable, las funciones aceptarán un parámetro opcional con el almacenamiento (por defecto `globalThis.localStorage` dentro del `try`).

### 4. Iniciales sin `Intl.Segmenter`

`text.ts` tiene una función interna `words(src)`:

- Con `Intl.Segmenter`: igual que ahora, segmentos con `isWordLike`.
- Sin `Intl.Segmenter`: tramos de letras, dígitos y `_` con sus marcas combinantes, unidos a través de apóstrofos (`/[\p{L}\p{N}_][\p{L}\p{M}\p{N}_]*(?:['’][\p{L}\p{N}_][\p{L}\p{M}\p{N}_]*)*/gu`). Las marcas solo cuentan detrás de una letra o un dígito, para que el selector de variación de los emojis (U+FE0F) no forme una «palabra».

`getInitials` mantiene su firma y su lógica de dos iniciales por punto de código (`[...word][0]`) y `?`.

- *Alternativa descartada*: `src.split(/[\s._\-]+/u)`, la que proponía la auditoría. Con `Intl.Segmenter`, ICU ya separa por `.`, `-` y `:` (`xulioze.com` da «XC»), pero no por `_`, y descarta emojis y signos de puntuación. Partir por separadores daba iniciales distintas en 13 de 342 autores de un hilo real (emojis delante del nombre, banderas, comillas). Con la expresión elegida solo difiere 1: un nombre formado solo por un emoji (🆈), que sin `Segmenter` muestra `?`.
- Diferencia aceptada: en escrituras sin espacios (chino, japonés, tailandés) el fallback devuelve un único tramo y muestra una inicial en vez de dos. Solo pasa en navegadores sin `Intl.Segmenter`.
- La comprobación es `typeof Intl.Segmenter === "function"` en cada llamada, sin cachear, para que el test pueda quitar `Intl.Segmenter` y restaurarlo en `finally`.

### 5. Facets: cálculo puro en `facetSegments`, DOM en `index.ts`

`facetSegments(record): Array<{ text: string; href?: string }>` hace lo que hoy hace `buildFacetedText` antes de crear nodos: codificar en UTF-8, construir los enlaces (link `http(s)`, mention, tag), ordenarlos, descartar rangos solapados o fuera de límites y decodificar cada tramo. `buildFacetedText` queda como un bucle que crea un `Text` o un `<a>` por segmento, con los mismos atributos que ahora.

Las URLs de mención y hashtag siguen yendo a `bsky.app`. Cambiarlas es cosa de `app-preference-consistency`. Los tests cubren offsets en bytes con emojis, acentos, rangos solapados, rangos fuera del texto y enlaces que no son `http(s)`.

### 6. Accesibilidad del campo «Otra app» sin API nueva

- **Nombre accesible:** `input.setAttribute("aria-label", t("otherApp"))`. *Alternativa descartada*: `aria-labelledby` hacia el separador. Exige darle un `id`, y el separador es un elemento documentado en el README.
- Se añaden `inputMode = "url"`, `autocapitalize = "off"`, `autocomplete = "off"` y `spellcheck = false`. No son API, y evitan que el teclado móvil ponga mayúsculas o corrija el dominio.
- **Dominio inválido:** validación nativa.

```
 enviar (Enter o "→")
    |
    v
 input.setCustomValidity("")          <-- siempre primero, para no arrastrar el error anterior
 domain = normalizeDomain(value)
    |
    +-- inválido --> setCustomValidity(t("invalidDomain"))
    |                aria-invalid="true"
    |                input.reportValidity()   --> globo del navegador, anunciado por el lector
    |                (el panel sigue abierto: el foco queda en el input)
    |
    +-- válido ----> aria-invalid quitado, writePref, window.open, close()

 evento "input" --> setCustomValidity(""), quitar aria-invalid
```

- El input no está dentro de un `<form>`, así que no hay envío que bloquear. `reportValidity()` funciona igual sobre un control suelto.
- `reportValidity()` lleva el foco al input. Como el foco queda dentro del panel, el scroll o el redimensionado que provoque no lo cierran (requisito «Cierre del selector»).

## Risks / Trade-offs

- [iOS 16 no muestra el globo de validación o VoiceOver no lo anuncia] → Probarlo a mano en iOS 16 y en iOS 17 o posterior con VoiceOver antes de publicar. Si falla en alguno, el 2.3 sale de este change hacia `app-preference-consistency` con un elemento de error propio, y aquí solo queda el nombre accesible.
- [El globo de validación se pinta debajo del panel nativo, que está en el *top layer*] → Comprobarlo en Chrome, Firefox y Safari con Popover API. Si queda tapado, se aplica la misma salida que en el riesgo anterior.
- [`facetSegments` cambia sin querer la salida del texto] → Tests con casos reales (emojis, acentos, varias facets) y comparación a mano de un hilo largo antes y después.
- [Respuestas que antes se veían dejan de verse] → Es el comportamiento correcto. Se menciona en las notas de la release.
- [Los tests de `jsr:@std/assert` descargan dependencias en el CI] → `setup-deno` con caché. Un fallo de red hace fallar el job, no publica nada.

## Migration Plan

1. Implementar en una rama, con `npx tsc --noEmit` y `deno task test` en verde en local y en el CI.
2. Pruebas manuales (ver `tasks.md`).
3. Subir la versión a 1.1.3 en `package.json`, `package-lock.json` (raíz y `packages[""]`), `deno.json` y los pins de 1.1.2 del README (tres de JSR y la frase de la línea 76).
4. Tag `v1.1.3`: la release publica en JSR y crea la GitHub Release, con los tests ejecutándose antes. npm se publica a mano.

Rollback: los integradores con `@1` vuelven a 1.1.2 fijando la versión. No hay datos ni formato persistente nuevo (la clave de `localStorage` no cambia).
