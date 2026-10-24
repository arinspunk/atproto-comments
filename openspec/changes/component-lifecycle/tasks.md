# Tasks

## 1. Lógica pura del ciclo de vida

- [x] 1.1 Crear `src/lifecycle.ts` con `createScheduler(run, isConnected, enqueue = queueMicrotask)` y `nextStep(...)` (design, decisión 2), con tipos de retorno explícitos. Verificar que `deno task check` pasa y que `deno publish --dry-run` no da avisos de *slow types*
- [x] 1.2 Añadir `src/lifecycle.test.ts` con una cola falsa. Para `createScheduler`: N llamadas dan una ejecución, desconectado no da ninguna, desconectar entre la llamada y la microtarea no da ninguna, y una llamada después de ejecutar vuelve a encolar. Para `nextStep`: primera conexión, reconexión sin cambios, reconexión tras abortar, cambio de clave con y sin petición en curso, paso a una clave `invalid` con y sin petición en curso (da `load`), vuelta a una clave anterior (A → B → A) y cambio de vista con datos y durante la carga. Verificar que `deno task test` pasa

## 2. Componente (element-lifecycle)

- [x] 2.1 Separar el `#load` actual en `#abort()`, `#load(key)`, `#fetch` y `#render()` (design, decisiones 3, 5 y 6):
  - `#load(key)` empieza siempre con `#abort()` y resuelve las claves `invalid` (`thread-uri` ausente o sin `at://`) de forma síncrona;
  - `#fetch` crea un `AbortController` nuevo en `#controller`, quita el contenido si la clave es distinta de `loadedKey`, y acepta la respuesta solo si `controller === this.#controller`, comprobando `controller.signal.aborted` tras cada `await`;
  - `#render()` es síncrono, calcula `#loc()` en el momento y sustituye solo los nodos de `#nodes`. Verificar que `npx tsc --noEmit` pasa y que un hilo real se ve igual que en 1.1.3 (hilo con respuestas, hilo sin respuestas, `thread-uri` inválido y AppView que devuelve 500)
- [x] 2.2 Añadir `#schedule()` con `createScheduler` y `#run()` con `nextStep`. `connectedCallback` solo llama a `#schedule()`. Añadir `attributeChangedCallback` (ignora `oldValue === newValue` y marca `viewDirty` para `lang` y `strings`) y `disconnectedCallback` (llama a `#abort()`) (design, decisiones 1 y 4). Verificar que `npx tsc --noEmit` y `deno task test` pasan
- [x] 2.3 Preparar una página de prueba local, fuera del repo, que envuelva `window.fetch` para contar peticiones y cargue `dist/index.js` tras `npm run build`. Verificar en Chrome cada escenario de `specs/element-lifecycle/spec.md`:
  - upgrade con cinco atributos con el script antes y después del HTML (1 petición), también en Firefox y Safari, porque la agrupación depende del orden de callbacks y microtareas de cada motor;
  - elemento creado desde JS (1), y nunca insertado o quitado en la misma tarea (0);
  - desconectar durante la carga (petición cancelada en la pestaña Network y sin contenido) y reconectar tras cancelar (1 y sin duplicados);
  - mover con el hilo cargado (0 y sin duplicados);
  - cambiar `thread-uri` (1, el hilo anterior desaparece al empezar la carga y luego solo se ve el nuevo);
  - respuesta tardía (con *throttling* y dos cambios seguidos) y A → B → A durante la carga (las dos primeras peticiones canceladas y el hilo A una sola vez);
  - `thread-uri` inválido tras uno válido, inválido durante la carga (el error se mantiene después de que llegara la respuesta) y quitar el atributo `thread-uri`;
  - cambiar `lang` (0 y textos en portugués) y cambiar `strings` durante la carga (1);
  - un `<p>` propio de la página que se conserva
  - Resultado: los 29 escenarios de esta tarea y de la 3.2, automatizados con Playwright contra un AppView simulado, pasan en Chromium y WebKit. El upgrade con el script antes y después del HTML da 1 petición y 1 lista en Safari y Firefox de escritorio, comprobado a mano

## 3. Propiedad strings (ui-localization)

- [x] 3.1 Mover la reaplicación de una propiedad `strings` asignada antes del upgrade al `constructor`, y hacer que el setter marque `viewDirty` y llame a `#schedule()` (design, decisión 7). Verificar que `npx tsc --noEmit` pasa
- [x] 3.2 Verificar en la página de prueba los escenarios de `specs/ui-localization/spec.md`: asignada antes de conectar, junto con el atributo (gana la propiedad), asignada después de conectar, asignada antes de registrar el elemento (script cargado después) y `el.strings = undefined`. En todos los casos sin peticiones de más
- [x] 3.3 Actualizar el JSDoc de la clase y del accessor `strings` en `src/index.ts` («Read when the element connects», «Set it before the element is inserted»): atributos y propiedad se pueden cambiar en cualquier momento, y solo una asignación provoca un render, no mutar el objeto. Verificar con `grep -n "before the element\|when the element connects" src/index.ts` que no quedan las frases antiguas

## 4. Documentación

- [x] 4.1 En `README.md`, cambiar «Attributes are read once, when the element is inserted into the document.» por qué provoca cada cambio (`thread-uri`, `appview` y `max-depth` vuelven a cargar; `lang` y `strings` solo vuelven a renderizar) y qué pasa al mover el elemento. En «UI strings», quitar «Set it **before** the element is inserted» y «Strings are read once», y añadir que hay que asignar un objeto nuevo, no mutarlo. Verificar con `grep -n "read once\|before\*\* the element" README.md` que no quedan resultados
- [x] 4.2 Añadir a `CHANGELOG.md` una sección `[Unreleased]` con «Changed» (los atributos y `strings` se aplican cuando cambian, y un render sustituye su propio contenido) y «Fixed» (mover el elemento duplicaba el hilo, y una carga en curso podía escribir tras desconectar o cambiar de hilo). Verificar que sigue el formato de las entradas anteriores

## 5. Verificación integrada

- [x] 5.1 Ejecutar `npx tsc --noEmit`, `deno task check`, `deno task test` y `npm run build` y verificar que pasan sin errores
- [x] 5.2 En Chrome, Firefox y Safari de escritorio, y en iOS 16 (sin Popover API), verificar que no hay regresiones en el selector (abrir, elegir app, cerrar fuera y con Escape, app preferida resaltada) y que, tras cambiar `lang` con el hilo cargado, el selector de los nodos nuevos funciona y no quedan listeners de paneles viejos (en modo de respaldo, el siguiente clic fuera no da errores en consola). Resultado parcial: automatizado en Chromium y WebKit, con Popover API y con el modo de respaldo forzado, 22/22 sin errores de página. En Safari y Firefox de escritorio, comprobado a mano: abrir, elegir app, cerrar fuera y con Escape, preferida resaltada y selector tras cambiar `lang`, sin errores en consola. En iOS 16 (sin Popover API, modo de respaldo), comprobado a mano: 1 petición y 1 lista, selector, preferida resaltada y selector tras cambiar `lang`, sin errores
- [x] 5.3 Comprobar en una integración con un framework de la sección «Framework usage» (p. ej. Svelte 5 con un `{#key}` o una lista reordenable) que reordenar o cambiar el post no duplica el hilo ni hace peticiones de más

## 6. Versión 1.2.0

- [x] 6.1 Subir la versión a 1.2.0 en `package.json`, `package-lock.json` (raíz y `packages[""]`) y `deno.json`, cambiar todos los `1.1.3` del README (pins de JSR y la frase sobre la versión exacta) y fechar la sección del CHANGELOG como `[1.2.0]`. Verificar que `grep -rn "1\.1\.3" package.json package-lock.json deno.json README.md` no da resultados

## Workflow follow-up

- Tras fusionar, crear el tag `v1.2.0` en `main`. La release ejecuta los tests, publica en JSR y crea la GitHub Release. npm se publica a mano con `npm run build && npm publish` y se comprueba con `npm view atproto-comments version`.
- Archivar el change con `/opsx:archive` cuando esté publicado.
