# Proposal

## Why

La auditoría de la versión 1.1.2 (punto 1.3) encontró que el elemento solo funciona bien si se inserta una vez y no se toca más. Esto es lo que ocurre hoy:

1. **Mover el elemento duplica el contenido.** `connectedCallback` añade la lista y el botón con `appendChild` sin quitar lo anterior. Cada vez que el elemento se desconecta y se vuelve a conectar (al reordenar el DOM, o con frameworks que mueven nodos), se hace otra petición y aparece otra copia del hilo.
2. **Cambiar un atributo después de insertar no tiene efecto.** `observedAttributes` declara `thread-uri`, `appview`, `lang`, `max-depth` y `strings`, pero no hay `attributeChangedCallback`. Una SPA que reutiliza el elemento para otro post sigue mostrando el hilo anterior. Lo mismo ocurre con la propiedad `strings` asignada después de conectar.
3. **Una carga en curso puede escribir donde ya no toca.** `#load` no se cancela, así que si el elemento se desconecta o cambia de hilo mientras espera la respuesta, el resultado se añade igualmente. Puede quedar el hilo viejo junto al nuevo, o aparecer contenido en un elemento que ya no está en la página.

Los frameworks de la sección «Framework usage» del README (Astro, Next.js, Svelte) reutilizan y mueven elementos con frecuencia, así que estos fallos aparecen en integraciones normales.

## What Changes

- Un único punto de entrada para renderizar. `connectedCallback`, `attributeChangedCallback` y el setter de `strings` solo piden un render, y las peticiones que llegan en la misma tarea se agrupan en una microtarea. Hacer upgrade de un elemento con N atributos produce exactamente una petición, tanto si el script se carga antes que el HTML como después.
- Mientras el elemento está desconectado no se renderiza ni se pide nada. La conexión se vuelve a comprobar dentro de la microtarea.
- **Cambios después de insertar.** Cambiar `thread-uri`, `appview` o `max-depth` vuelve a pedir el hilo. Cambiar `lang`, `strings` (atributo o propiedad) vuelve a renderizar con los datos ya cargados, sin red.
- Cada render sustituye solo los nodos que insertó el render anterior. El contenido que la web haya puesto dentro del elemento se conserva, como hasta ahora.
- Si se desconecta el elemento con una carga en curso, esa carga se cancela y se repite al reconectar. Empezar una carga nueva, o pasar a un `thread-uri` inválido o ausente, cancela la anterior. Solo se acepta la respuesta de la última petición, aunque el valor vuelva a uno anterior.
- Al cambiar de hilo, el contenido del hilo anterior se quita en cuanto empieza la carga nueva. Así no quedan botones «Reply» que apunten al post anterior mientras llega el nuevo.
- Si al reconectar nada cambió y la carga ya había terminado, el contenido se deja como estaba y no se hace ninguna petición.
- README: «Attributes are read once» pasa a describir que los atributos y la propiedad `strings` se pueden cambiar en cualquier momento. Desaparece la obligación de asignar `strings` antes de insertar.
- Versión minor (1.2.0), porque cambia el comportamiento documentado. No se añaden atributos, propiedades, claves de `strings`, variables CSS, clases ni elementos al DOM.

Fuera de este change: el punto de entrada `./element` y el empaquetado (`packaging-and-ci`), y la clave `go`, `aria-haspopup` y la coherencia de la preferencia de app (`app-preference-consistency`).

## Capabilities

### New Capabilities
- `element-lifecycle`: cuándo el elemento pide el hilo, cuándo vuelve a renderizar y qué hace al conectarse, desconectarse, reconectarse y cuando cambian sus atributos.

### Modified Capabilities
- `ui-localization`: la propiedad `strings` y los atributos `lang` y `strings` también se aplican cuando cambian después de insertar el elemento, no solo si se asignan antes.

## Impact

- `src/index.ts`: la clase `AtprotoComments` (`connectedCallback`, nuevo `attributeChangedCallback` y `disconnectedCallback`, setter de `strings`, `#load` separado en carga y render, seguimiento de los nodos insertados, `AbortController`).
- Un módulo nuevo sin DOM en `src/` con la lógica de agrupación y decisión (si hay que pedir, renderizar o no hacer nada), con sus tests en Deno.
- `README.md`: la frase bajo la tabla de atributos y el párrafo de la propiedad `strings`.
- `CHANGELOG.md`, y versión 1.2.0 en `package.json`, `package-lock.json`, `deno.json` y los pins del README al publicar.
- Webs que ya usan el componente: sin cambios de integración. Las que mueven el elemento dejan de ver el hilo duplicado, y las que cambian atributos ven el cambio aplicado.
