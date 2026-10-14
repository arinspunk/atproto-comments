# Design

## Context

Todo vive en `src/index.ts`. `resolveLang` reduce el idioma a `"pt" | "en"`, y ese valor se usa tanto para elegir el diccionario como para `Intl.DateTimeFormat`. Por eso, en una página `es-ES` la fecha absoluta sale en formato inglés. `translate(lang, key, vars)` recibe el `Lang` y lo pasan como parámetro todos los constructores de DOM (`buildAppPopover`, `buildAppAction`, `renderReply`, `renderError`, `formatRelativeTime`).

El componente lee sus atributos una sola vez, en `connectedCallback`. Declara `observedAttributes`, pero no implementa `attributeChangedCallback`.

No hay tests. `deno test --allow-env src/` está configurado, pero importar `src/index.ts` fuera del navegador falla porque al cargar el módulo accede a `HTMLElement.prototype` y a `customElements`.

Por qué hace falta el cambio: ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Una sola estructura de "contexto de localización" que viaje por los constructores de DOM en vez de `lang`.
- Lógica de cadenas probable con `deno test`, sin DOM.

**Non-Goals:**
- Volver a renderizar cuando cambien `strings` o `lang` después de la carga (hoy tampoco ocurre con ningún atributo).
- Añadir nuevos diccionarios incluidos.
- Pluralización o formatos ICU. Las unidades de tiempo siguen siendo sufijos simples (`5 m`).

## Decisions

### 1. Atributo JSON + propiedad JS, no slots ni atributos por clave

- **Atributo `strings` (JSON):** es lo que puede generar cualquier HTML renderizado en el servidor, incluido PHP con `esc_attr( wp_json_encode( $strings ) )`. Es el caso del plugin.
- **Propiedad `strings`:** es lo natural en React, Svelte o Vue, donde construir un JSON a mano es incómodo.
- **Alternativas descartadas:**
  - Un atributo por clave (`label-comment`, `label-reply`…): son 13 atributos y la API crece con cada cadena nueva.
  - Slots: no cubren el `aria-label` con `{name}` ni los textos internos del popover.
  - Una configuración global (`AtprotoComments.strings = …`): no permite dos instancias con textos distintos y depende del orden de carga.

### 2. Combinación por capas, resuelta una vez por carga

```
I18N.en  <-  I18N[lang resuelto]  <-  atributo strings  <-  propiedad strings
(base)       (si existe)              (claves válidas)      (claves válidas)
```

El resultado es un `Record<StringKey, string>` completo, calculado en `#load`/`connectedCallback`. `translate` pasa a leer de ese objeto, en vez de un `Lang`, y aplica la sustitución de `{var}`, igual que ahora.

### 3. Contexto de localización `{ strings, locale }` en lugar de `lang`

Los constructores reciben un `Locale = { strings: Record<StringKey,string>; locale: string }`.

- `strings` es el diccionario ya combinado.
- `locale` es la etiqueta BCP 47 original (`es-ES`) para `Intl`. Se valida con `Intl.DateTimeFormat.supportedLocalesOf`; si no es válida, se usa el idioma resuelto.

`resolveLang` se mantiene solo para elegir el diccionario incluido.

### 4. Validación estricta pero silenciosa

- `JSON.parse` dentro de `try`; si el resultado no es un objeto plano, se descarta entero.
- Se copian solo las claves que existen en `I18N.en` y cuyo valor es `typeof "string"`.
- No hay `console.warn`, para no ensuciar la consola de sitios en producción. Si hace falta depurar, se mira el atributo.

### 5. Lógica de cadenas en un módulo puro `src/i18n.ts`

Se mueven `I18N`, `Lang`, `StringKey`, `resolveLang`, la combinación por capas, `translate` y `resolveLocale` a un módulo sin acceso al DOM global. `index.ts` lo importa y esbuild lo empaqueta igual. Esto permite `src/i18n.test.ts` con `deno test`.

`resolveLang` hoy lee `document.documentElement.lang`. Pasará a recibir ese valor como argumento, y lo leerá `index.ts`.

### 6. Exportar el tipo de las claves

`index.ts` exporta `type StringKey` y `type UiStrings = Partial<Record<StringKey, string>>`, para que quien use TypeScript tenga autocompletado y se compruebe la propiedad. Se publica en JSR junto al código.

## Risks / Trade-offs

- [Las claves se vuelven API pública; renombrarlas rompe integraciones] → Documentarlas en el README como contrato. Cualquier renombrado futuro va en una versión mayor.
- [`invalidDomain` está en los diccionarios pero hoy no se usa en el DOM (`openCustom` solo pone `aria-invalid`)] → Se mantiene en el contrato para no romper nada después. Usarla como mensaje visible queda fuera de este cambio.
- [JSON en un atributo HTML exige escapar comillas] → En el README se muestra el ejemplo con comillas simples por fuera y el de PHP con `esc_attr( wp_json_encode() )`.
- [Asignar la propiedad después de conectar no tiene efecto] → Igual que los atributos actuales. Se documenta que `strings` debe estar disponible antes de insertar el elemento.

## Migration Plan

Sin migración: sin `strings`, la salida es idéntica a la actual. Se publica como 1.1.0 (cambio menor) en npm y JSR con el flujo de release existente.
