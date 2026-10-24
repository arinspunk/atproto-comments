# Design

## Context

Motivación en `proposal.md`; comportamiento esperado en los deltas de `element-lifecycle` y `ui-localization`. Estado actual de `src/index.ts` (commit `5187c40`):

- `connectedCallback` reaplica una propiedad `strings` asignada antes del upgrade, calcula `#loc()` y llama a `#load(threadUri, loc)`, o añade el error si `thread-uri` no empieza por `at://`.
- `#load` hace `fetch` sin `signal`, y todas sus salidas terminan en `this.appendChild(...)`: el error, el botón solo o la lista más el botón. El `Loc` se calcula antes de la petición, así que un cambio de textos durante la carga no se aplicaría.
- `observedAttributes` declara cinco atributos, pero la clase no tiene `attributeChangedCallback` ni `disconnectedCallback`.
- El setter de `strings` solo guarda el valor.
- Los paneles del selector cuelgan del propio elemento. En modo de respaldo, un panel que se quita del DOM estando abierto se cierra con el siguiente evento que recibe (`onPointerDown` y `onKeyDown` comprueban `popover.isConnected`). Los paneles nativos se cierran solos al quitarlos.
- Los tests son de Deno sin DOM (`deno task test`). Lo que depende del DOM se prueba a mano en el navegador.

## Goals / Non-Goals

**Goals:**
- Que la lógica que decide cuándo pedir y cuándo renderizar sea pura y tenga tests en Deno.
- Que el render sea una función síncrona de (datos, `Loc`), para poder repetirlo sin red.

**Non-Goals:**
- Un entorno DOM de pruebas (jsdom, happy-dom). Se mantiene la decisión de `fix-robustness`.
- Observar mutaciones internas del objeto `strings` (`el.strings.comment = "x"`). Solo una asignación a la propiedad provoca un render.
- Reaccionar a cambios de `<html lang>` cuando el elemento no tiene `lang`. Se lee en cada render, pero un cambio en `<html lang>` no lo provoca.
- Reintentar automáticamente una carga que falló.

## Decisions

### 1. Un solo punto de entrada: `#schedule()`

```
 connectedCallback ───────┐
 attributeChangedCallback ┼──> #schedule() ──queueMicrotask──> #run()
 set strings ─────────────┘     (si ya hay uno                  │
                                 pendiente, no hace nada)       ├─ !isConnected → nada
                                                                └─ nextStep(...) → none | render | load
```

- `#schedule()` pone un flag `pending` y encola una microtarea. Las llamadas siguientes ven el flag y no encolan otra. La microtarea quita el flag, comprueba `isConnected` y ejecuta el paso que toque.
- Con el script cargado antes del HTML, el parser crea el elemento, llama a `attributeChangedCallback` por cada atributo y después a `connectedCallback`. Con el script cargado después, el upgrade hace lo mismo. En ambos casos todo ocurre en la misma tarea y se agrupa en una microtarea, así que hay una sola petición. Comprobado en Chromium: con el parser, los `attributeChangedCallback` llegan con `isConnected === false` y las microtareas se ejecutan después de `connectedCallback`; en el upgrade, los tres callbacks llegan con `isConnected === true`. Por eso la comprobación de conexión va dentro de la microtarea y nunca en los callbacks. Firefox y Safari se comprueban a mano (tarea 2.3).
- `attributeChangedCallback` ignora las llamadas en las que `oldValue === newValue`.
- *Alternativa descartada*: `requestAnimationFrame`. Retrasa la petición un frame y no se ejecuta en pestañas en segundo plano. Una microtarea basta para agrupar lo que pasa en la misma tarea.
- *Alternativa descartada*: decidir en cada callback si hay que pedir o renderizar. Repartiría la lógica en tres sitios. Aquí los callbacks solo marcan qué cambió y la decisión se toma en un único sitio.

### 2. Decisión pura en `src/lifecycle.ts`

El módulo no toca el DOM. Exporta el planificador y la decisión, y además `dataKey(threadUri, appview, maxDepth)`, que construye la clave de datos, e `isInvalidKey(key)`, que reconoce la de un `thread-uri` ausente o inválido:

```ts
/** Agrupa llamadas en una microtarea y no ejecuta `run` si `isConnected()` es falso. */
export function createScheduler(
  run: () => void,
  isConnected: () => boolean,
  enqueue: (cb: () => void) => void = queueMicrotask,
): () => void;

export type Step = "none" | "render" | "load";

export function nextStep(s: {
  wantedKey: string;          // clave de datos según los atributos actuales
  loadedKey: string | null;   // clave de los datos que ya hay (null si no hay)
  inFlightKey: string | null; // clave de la petición en curso
  viewDirty: boolean;         // cambió lang o strings desde el último render
}): Step;
```

- La clave de datos es `appview`, `thread-uri` y `max-depth` ya normalizados (`#appview` sin barra final, `#maxDepth` con su valor por defecto), unidos con un separador que no puede aparecer en ellos. Así, cambiar `max-depth` de `""` a `"6"` no provoca otra petición.
- Reglas de `nextStep`: si `wantedKey === inFlightKey`, `none` (al llegar la respuesta se renderiza con el `Loc` de ese momento). Si `wantedKey !== loadedKey`, `load`. Si `viewDirty`, `render`. En otro caso, `none`. La última regla cubre la reconexión sin cambios.
- `load` significa «resolver los datos de `wantedKey`», no necesariamente hacer una petición. `#run` lo resuelve en `#load(key)` (decisión 3), que primero cancela cualquier petición en curso.
- Un `thread-uri` ausente o que no empieza por `at://` no hace petición. Su clave lleva un prefijo propio (por ejemplo `invalid` más el valor crudo), y `#load` lo resuelve de forma síncrona como `{ kind: "invalid" }`: cancela la petición en curso, guarda los datos y la clave, y renderiza el error. Sin esa cancelación, una respuesta del valor válido anterior que llegara después sustituiría al error.
- Los tests usan una cola falsa como `enqueue` y un `isConnected` controlado: varias llamadas dan una ejecución, desconectado no da ninguna, una llamada después de ejecutar vuelve a encolar. `nextStep` se prueba con la tabla de casos de la spec.

### 3. Carga y render separados

```ts
type ThreadResult =
  | { kind: "invalid" }
  | { kind: "error" }
  | { kind: "thread"; thread: ThreadViewPost | undefined; rootDid: string; rootRkey: string };
```

- `#load(key)` empieza siempre con `#abort()`, que aborta `#controller` si existe y pone `#controller = null` e `inFlightKey = null`. Después:
  - si la clave es de tipo `invalid`, guarda `{ kind: "invalid" }` y `loadedKey`, y llama a `#render()`;
  - si no, llama a `#fetch(key, threadUri)`.
- `#fetch(key, threadUri)` crea un `AbortController` nuevo, lo guarda en `#controller` (en una constante local `controller`), guarda `inFlightKey` y hace la petición con su `signal`.
- La respuesta se acepta por identidad de la petición, no por clave: solo si `controller === this.#controller`. Comparar claves falla cuando el valor vuelve atrás (A → B → A): una respuesta tardía de la primera petición A coincidiría con la clave de la segunda. Si se acepta, guarda `#data` y `loadedKey`, pone `#controller = null` e `inFlightKey = null` y llama a `#render()`. Si no, descarta el resultado. No hace falta comprobar `isConnected`: desconectar llama a `#abort()` (decisión 4), así que la respuesta de un elemento desconectado ya no es la de la petición actual.
- Después de cada `await` (el de `fetch` y el de `res.json()`), si `controller.signal.aborted` o `controller !== this.#controller`, se sale sin guardar nada. Así se descartan también un abort que llega durante `res.json()` y un error de red posterior a un abort, sin depender del nombre del error.
- `#render()` es síncrono. Calcula `#loc()` en ese momento y construye los nodos a partir de `#data`. La lógica actual de `#load` (hilo vacío, `notFoundPost`, `blockedPost`, lista y botón) pasa aquí sin cambios visibles. Al terminar pone `viewDirty = false`.
- Un error de red o un `!res.ok` se guarda como `{ kind: "error" }` con su clave. Esto cumple «reconectar sin cambios reutiliza el contenido»: el error se queda y no se reintenta solo. Cambiar `lang` vuelve a renderizar el error en el idioma nuevo.
- Una petición abortada no se guarda ni se renderiza (ver la comprobación tras cada `await`).
- *Alternativa descartada*: un contador de generación sin `AbortController`. Descarta igual las respuestas tardías, pero no libera la conexión al desconectar el elemento.

### 4. Desconexión

`disconnectedCallback` llama a `#abort()`, que aborta la petición en curso y pone `#controller = null` e `inFlightKey = null`. Si después se reconecta, `nextStep` ve que `wantedKey !== loadedKey` y vuelve a pedir el hilo. Si la carga ya había terminado no hay nada que abortar, y al reconectar `nextStep` devuelve `none`.

### 5. Solo se sustituyen los nodos propios

`#nodes: Node[]` guarda lo que insertó el último render. `#render()` quita esos nodos, construye los nuevos y los añade al final con `this.append(...)`. Así quedan después del contenido de la página, como en 1.1.3. El contenido que la página haya puesto dentro del elemento no se toca.

Si la página mete nodos propios entre los del componente después del primer render, en el siguiente render los del componente se mueven al final. Este caso no está soportado y no se documenta.

### 6. Qué se ve mientras carga un hilo nuevo

Cuando `#fetch` empieza una petición para una clave distinta de la que hay en pantalla (`loadedKey !== null && key !== loadedKey`), quita los nodos de `#nodes` y vacía la lista, y pone `#data = null` y `loadedKey = null`. El elemento queda sin contenido propio hasta que llega la respuesta, igual que en la primera carga.

- Motivo: si el hilo anterior siguiera visible, sus botones «Reply» y «Comment» abrirían el post anterior mientras se carga el nuevo.
- Un cambio de `appview` o `max-depth` también vacía el contenido durante la carga. Es un parpadeo aceptable, porque son cambios raros.
- *Alternativa descartada*: mantener el hilo anterior hasta que llegue el nuevo. Evita el parpadeo, pero deja enlaces al post equivocado.
- Un indicador de carga (`aria-busy`) queda para `app-preference-consistency` (punto 2.5 de la auditoría).

### 7. Propiedad `strings`

- El setter guarda el valor, pone `viewDirty = true` y llama a `#schedule()`. No compara el objeto nuevo con el anterior.
- Una asignación anterior al upgrade queda como propiedad propia de la instancia y tapa el accessor. Hoy se reaplica en `connectedCallback`. Pasa al `constructor`: allí ya existe la propiedad propia, se borra y se reasigna a través del setter. Esto encola un render que se agrupa con los callbacks del upgrade.
- *Alternativa descartada*: mantener la reaplicación en `connectedCallback`. Funciona, pero cualquier lectura de `this.strings` en `attributeChangedCallback` vería el valor sin pasar por el setter, y la reaplicación se repetiría en cada reconexión.

## Risks / Trade-offs

- [Un framework asigna `strings` con un objeto nuevo en cada render, aunque tenga el mismo contenido] → Cada asignación provoca un render sin red. Las asignaciones de una misma tarea se agrupan, y el render solo reconstruye nodos sin pedir nada, así que el coste es bajo. Si se ve en la práctica, se puede comparar el JSON de las claves conocidas antes de marcar `viewDirty`.
- [Re-renderizar cierra un selector abierto] → Al cambiar `lang` o `strings` con un panel abierto, el panel desaparece con los nodos viejos. En modo de respaldo, `openFallback` sigue apuntando al `close` del panel quitado hasta el siguiente evento, que lo cierra y quita sus listeners (ya probado en 1.1.2). Se acepta: cambiar el idioma con el panel abierto es raro.
- [Los ids de los paneles siguen creciendo con cada render] → Son únicos y no se reutilizan. No hay fuga, porque los paneles viejos salen del DOM.
- [Un error de red se queda hasta que algo cambie] → Coincide con 1.1.3, donde no había reintento. Una web que quiera reintentar puede volver a asignar `thread-uri` o recrear el elemento. Un reintento automático queda fuera.
- [El comportamiento cambia para webs que contaban con que los atributos se leyeran una vez] → Es el motivo de que sea minor y no patch. Se documenta en `CHANGELOG.md` en «Changed».

## Migration Plan

Sin migración para las webs. Se publica como 1.2.0 con el flujo habitual: tag `v1.2.0` en `main` (JSR y GitHub Release) y npm a mano.
