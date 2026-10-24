# Design

## Context

Motivación en `proposal.md`; comportamiento esperado en el delta de `package-distribution`. Estado actual (commit `032c4e2`, versión 1.2.0):

- `src/index.ts` contiene la clase, los constructores de DOM y, al final, el registro (`if (!customElements.get(...)) customElements.define(...)`). Al cargarse evalúa `"popover" in HTMLElement.prototype` (`SUPPORTS_POPOVER`, línea 50) y `class AtprotoComments extends HTMLElement`. Fuera de esas dos expresiones, `document` y `window` solo se usan dentro de funciones.
- `package.json`: `main` y `module` apuntan a `dist/index.js`; `exports["."]` tiene `import` (`dist/index.js`) y `require` (`dist/index.umd.js`, un IIFE); `exports["./style.css"]`. No hay `types`. `files` publica `dist` y `CHANGELOG.md`.
- `deno.json`: `exports` es la cadena `./src/index.ts`; `deno task build` ejecuta `scripts/build.ts` y `deno task test` ejecuta `deno test src/`.
- `tsconfig.json`: `declaration: true`, `declarationDir: ./dist/types`, `noEmit: true` y `allowImportingTsExtensions: true`. TypeScript 5.9.3.
- `scripts/build.js` (Node) y `scripts/build.ts` (Deno) generan los mismos tres archivos: `dist/index.js` (ESM), `dist/index.umd.js` (IIFE minificado, se registra solo) y `dist/atproto-comments.css`.
- CI (según la skill `ci-workflows`, porque los workflows no se pueden leer directamente): `ci.yml` en push y PR a `main` ejecuta `npm ci`, `npx tsc --noEmit`, `deno task test` y `node scripts/build.js`. `release.yml`, al subir un tag `v*`, ejecuta `npm ci`, `deno task test`, `npm run build`, `deno publish` y crea la GitHub Release. npm se publica a mano.
- Todos los `x.y.z` del README son pins de la versión (líneas 76, 92, 98 y 106 en 1.2.0).
- La batería de Playwright de `component-lifecycle` está en el scratchpad de la sesión en que se escribió (`server.mjs`, `run.cjs`, `picker.cjs`, `svelte.cjs` y la app `sv/`). Hay además un script independiente con 17 escenarios de `element-lifecycle`, `ui-localization` y el modo de respaldo, escrito al revisar la 1.2.0 (`lifecycle-review-1.2.0.mjs`, entregado junto a este change). Si los primeros ya no están, se parte de ese script y de los escenarios de `openspec/specs/element-lifecycle/spec.md` y `ui-localization`.

## Goals / Non-Goals

**Goals:**
- Que un proyecto con npm, JSR o CDN use el componente igual que en 1.2.0, salvo `require()`, que no funcionaba.
- Que un descuadre de versiones falle en el CI antes de etiquetar.
- Que la batería de navegador se pueda repetir con un comando.

**Non-Goals:**
- Publicar en npm desde el CI. Sigue siendo manual.
- Un build CommonJS real. No tiene sentido para un custom element.
- Ejecutar la batería de navegador en el CI.
- Minificar `dist/index.js` o cambiar el target.

## Decisions

### 1. `src/element.ts` con la clase e `index.ts` que registra

```
 src/element.ts   clase AtprotoComments, constructores de DOM y tipos exportados (sin registrar)
     ^
     |  export * from "./element.ts"
 src/index.ts     reexporta todo y registra <atproto-comments> si hay customElements
```

- `element.ts` recibe todo el contenido actual de `index.ts` salvo el registro. Lleva su propio `@module` para la documentación de JSR.
- `index.ts` queda en unas líneas: `export * from "./element.ts"`, `export type` de `StringKey` y `UiStrings`, y el registro protegido con `typeof customElements !== "undefined" && !customElements.get("atproto-comments")`.
- `deno.json` pasa a `"exports": { ".": "./src/index.ts", "./element": "./src/element.ts" }`.
- *Alternativa descartada*: dejar la clase en `index.ts` y que `element.ts` la reexporte. Entonces importar `./element` cargaría `index.ts` y registraría la etiqueta, que es justo lo que hay que evitar.

### 2. Sin DOM, importar no hace nada

- `SUPPORTS_POPOVER` pasa a ser una función `supportsPopover()` que calcula el valor la primera vez y lo guarda. Se llama solo desde los constructores de DOM, que ya se ejecutan en el navegador.
- La clase extiende una base protegida:

  ```ts
  const Base: typeof HTMLElement =
    typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;
  export class AtprotoComments extends Base { ... }
  ```

  La anotación explícita `typeof HTMLElement` es necesaria para que `deno publish` no marque la superclase como *slow type*. Si aun así la marca, se comprueba la alternativa `extends (globalThis.HTMLElement ?? class {})` con el mismo tipo explícito.
- Los inicializadores de campos (`createScheduler(...)`) no tocan el DOM, así que la clase se puede evaluar en Node y Deno.
- Se cubre con un test de Deno (`src/entrypoints.test.ts`) que importa `./index.ts` y `./element.ts` y comprueba que `AtprotoComments` es una función y que `globalThis.customElements` sigue sin existir. Deno no tiene `HTMLElement` ni `customElements`, así que el test reproduce el servidor. Para el `dist` de npm se añade una comprobación en Node (decisión 6).

### 2b. Estilos con cualquier nombre de etiqueta

Hallado al probar a mano en Firefox y Safari: un `<my-comments>` se ve sin estilos, porque las variables `--atproto-*` y el `display: block` de `src/atproto-comments.css` van en el selector de etiqueta `atproto-comments`. Con otro nombre, todos los `var(--atproto-…)` quedan sin valor. Ya pasaba con la subclase que documentaba el README desde 1.1.x, pero `./element` hace que se note más.

- `connectedCallback` añade la clase `atproto-comments` al elemento con `classList.add`, que respeta las clases que ya tenga. No se hace en el constructor, porque un elemento creado por el parser no puede tener atributos nuevos durante su construcción.
- La regla pasa a `atproto-comments, :where(.atproto-comments)`. `:where()` deja la especificidad de la clase en 0, así que para `<atproto-comments>` la regla pesa exactamente lo mismo que en 1.2.0 y las personalizaciones con el selector de etiqueta siguen ganando. Con otro nombre, se personaliza con `my-comments { … }`, que también gana.
- *Alternativa descartada*: `atproto-comments, .atproto-comments`. La clase pesaría más que una etiqueta y las personalizaciones `atproto-comments { --atproto-… }` de las webs dejarían de aplicarse.
- *Alternativa descartada*: solo documentarlo. Obligaría a copiar las reglas a cada nombre de etiqueta.
- La clase `atproto-comments` es pública y se documenta en «Markup» del README.

### 3. Bundles con nombres fijos

`scripts/build.js` genera dos archivos ESM con nombre fijo, sin chunks:

```
 dist/element.js   bundle completo de src/element.ts: la clase, una sola vez, sin registrar
     ^
     |  import ... from "./element.js"   (único import de index.js)
 dist/index.js     generado desde src/index.ts: reexporta ./element.js y registra
```

- `dist/element.js` se construye con esbuild desde `src/element.ts` (`bundle: true`, `format: "esm"`).
- `dist/index.js` se construye desde `src/index.ts` con un plugin de esbuild que resuelve `./element.ts` como externo con la ruta `./element.js`:

  ```js
  const elementExternal = {
    name: "element-external",
    setup(build) {
      build.onResolve({ filter: /^\.\/element\.ts$/ }, () => ({ path: "./element.js", external: true }));
    },
  };
  ```

- Si una página importa los dos puntos de entrada, la clase existe una vez, porque `index.js` la toma de `element.js`. Con dos bundles independientes habría dos clases distintas, e `instanceof` y las subclases fallarían de forma confusa.
- **Motivo de los nombres fijos:** el README recomienda `https://cdn.jsdelivr.net/npm/atproto-comments@1/dist/index.js`. jsDelivr sirve las URLs con rango de versión sin redirigir a la versión exacta, así que los imports relativos también se resuelven contra `@1`. Con un chunk con hash (`chunks/element-<hash>.js`), un `index.js` de la 1.3.0 en caché pediría un chunk que no existe en la 1.3.1 y daría un 404: el componente dejaría de cargar. Con nombres fijos, en el peor caso se combinan `index.js` y `element.js` de dos versiones 1.x, y eso funciona mientras `element.js` exporte `AtprotoComments`, que forma parte de la API pública. unpkg no tiene este problema, porque redirige a la versión exacta.
- `dist/index.umd.js` se sigue generando aparte desde `src/index.ts` (IIFE con `globalName`, todo en un archivo), con el mismo nombre para no romper a quien ya lo enlaza.
- *Alternativa descartada*: `splitting: true` con chunks. No necesita plugin, pero los nombres con hash rompen el caso de jsDelivr con rango de versión.

### 4. Tipos

- `tsconfig.build.json` extiende `tsconfig.json` con `noEmit: false`, `emitDeclarationOnly: true` y `declarationDir: ./dist/types`, e incluye `src/index.ts` y `src/element.ts`. `scripts/build.js` ejecuta `tsc -p tsconfig.build.json` después de esbuild.
- Los `.d.ts` no pueden quedar con imports a `./element.ts`: un consumidor con `moduleResolution: node16` no los resolvería. Con TypeScript 5.9.3, `rewriteRelativeImportExtensions` solo reescribe la salida JavaScript, no las declaraciones (comprobado al implementar), así que `build.js` reemplaza `from "./x.ts"` por `from "./x.js"` en `dist/types/*.d.ts`. La tarea 2.4 lo verifica con un proyecto consumidor real.
- `package.json`:

  ```json
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".":         { "types": "./dist/types/index.d.ts",   "import": "./dist/index.js",   "default": "./dist/index.js" },
    "./element": { "types": "./dist/types/element.d.ts", "import": "./dist/element.js", "default": "./dist/element.js" },
    "./style.css": "./dist/atproto-comments.css"
  }
  ```

  `types` va primero en cada entrada, como pide TypeScript. Desaparece `require`.
- `npx tsc --noEmit` y `deno task check` no cambian, porque siguen usando `tsconfig.json`.

### 5. Un solo script de build

Se elimina `scripts/build.ts`. `deno task build` pasa a `node scripts/build.js`, igual que `npm run build`. El CI y la release ya usan el de Node.

*Alternativa descartada*: que `build.js` funcione con Node y Deno a la vez (`npm:esbuild`, imports `node:`). Funciona, pero añade una forma de ejecutar el build que nadie usa en el CI.

### 6. Comprobaciones en el CI

`scripts/check-versions.js` (Node, sin dependencias):

- Lee la versión de `package.json`, `package-lock.json` (`version` y `packages[""].version`), `deno.json` y `tests/browser/package-lock.json` (`packages["../.."].version`, la versión del paquete enlazado con `file:../..`, que npm guarda y no actualiza solo), y los pins de `README.md`. Si falla por el lockfile de los tests, el mensaje indica cómo actualizarlo. Falla con un mensaje que lista cada archivo y su valor si alguna no coincide con la de `package.json`.
- En el README solo cuenta como pin una versión pegada al nombre del paquete o al ejemplo de la sección CDN:
  - `atproto-comments@X.Y.Z` (import de JSR y URLs de CDN con versión exacta);
  - `atproto-comments/X.Y.Z/` (URLs de `jsr.io` del CSS);
  - `` `@X.Y.Z` `` (la frase «Use an exact version» de la sección CDN).

  Buscar cualquier `\d+\.\d+\.\d+` daría falsos positivos en cuanto el README mencione otra herramienta, por ejemplo «Svelte 5.0.0» o «TypeScript 5.9.3».
- Si no encuentra ningún pin en el README, también falla. Así, un cambio de redacción que rompa los patrones no deja la comprobación sin efecto sin que nadie lo note.
- Con `--tag <ref>` compara también el tag sin la `v` inicial. Cualquier otro argumento, o `--tag` sin valor, termina con código 2: un argumento mal pasado desde el workflow no puede saltarse en silencio la comprobación del tag.
- `npm run check:versions` lo ejecuta sin tag.

Pasos nuevos en los workflows (se editan por la copia `github-copy/`, skill `ci-workflows`):

- `ci.yml`: `node scripts/check-versions.js` después de `npm ci`, y después del build una importación en Node de `dist/index.js` y `dist/element.js` (`node --input-type=module -e "await import('./dist/index.js'); await import('./dist/element.js')"`), que cubre el requisito de importar sin DOM para el paquete npm.
- `release.yml`: `node scripts/check-versions.js --tag "${{ github.ref_name }}"` antes de los tests y de cualquier publicación.

*Alternativa descartada*: comprobar solo en la release. Un descuadre se descubriría al publicar y obligaría a borrar y repetir el tag.

### 7. Batería de navegador en `tests/browser/`

```
 tests/browser/
   package.json     playwright-core, svelte, vite, @sveltejs/vite-plugin-svelte y "atproto-comments": "file:../.." (y su lockfile)
   harness.mjs      AppView simulado dentro de la página, page.route para servir dist/ y las páginas, comparación por subconjunto
   lifecycle.mjs    escenarios de element-lifecycle y ui-localization (a partir de lifecycle-review-1.2.0.mjs)
   picker.mjs       selector con Popover API y modo de respaldo, antes y después de un re-render, con clics reales
   entrypoints.mjs  escenarios de package-distribution en el navegador
   svelte.mjs       escenario de la app de Svelte 5
   svelte/          app de Svelte 5 (lista con clave, {#key}, atributo enlazado), que importa el paquete por su nombre
   run.mjs          construye la app, ejecuta todo en Chromium y WebKit y sale con 1 si algo falla
   server.mjs       solo para pruebas a mano: sirve dist/, manual/ y un AppView simulado por HTTP
   manual/          páginas que muestran PASS o FAIL, para Firefox, Safari e iOS
```

- Un `package.json` propio mantiene esas dependencias fuera del paquete raíz: `npm ci` en el CI no cambia y el paquete publicado tampoco. La app de Svelte depende de `"atproto-comments": "file:../.."`, así que resuelve el paquete por su mapa de `exports`, igual que un proyecto real.
- La batería automática no levanta servidor: Playwright responde a `http://t.local/` con `page.route` y sustituye `fetch` dentro de la página por un AppView simulado con retraso configurable que registra peticiones y cancelaciones. Se tomó de `lifecycle-review-1.2.0.mjs`, que resultó más simple que el servidor de la batería original.
- `server.mjs` queda para los navegadores que Playwright no maneja aquí (Firefox) o que hay que probar en un dispositivo (Safari, iOS). Escucha en un puerto configurable (por defecto 8765) y sirve `dist/` del repo, así que se prueba exactamente lo que se publica.
- `npm run test:browser` en la raíz ejecuta `npm run build`, `npm ci --prefix tests/browser` y `node tests/browser/run.mjs`. La primera vez hay que instalar los navegadores con `npx --prefix tests/browser playwright-core install chromium webkit`; el README lo explica en «Development».
- Con la Popover API, el panel se prepara en el evento `toggle`, que el navegador lanza de forma asíncrona. `picker.mjs` espera 100 ms tras cada interacción; sin esa espera los resultados dependen de la carrera.
- Firefox queda fuera: Playwright no lo lanza en headless en el Mac donde se desarrolló. Se prueba a mano con `server.mjs`.
- La comparación de marcado con 1.1.3 de `component-lifecycle` no se conserva: era una comprobación puntual de ese change.

### 8. README

- «Install»: el script clásico (`dist/index.umd.js`), el punto de entrada `./element` y que el paquete incluye tipos.
- «Custom element name»: importar la clase desde `atproto-comments/element` para no registrar `<atproto-comments>`; la subclase sigue siendo la forma de tener las dos etiquetas.
- «Framework usage»: importar en el servidor es seguro y no hace nada. Los ejemplos de Astro y Svelte se dejan como están. En Next.js se mantiene el componente cliente, porque el elemento necesita el DOM para renderizar; solo cambia la explicación.
- «Development»: `npm run check:versions`, `npm run test:browser` y la instalación de navegadores. Se quita la mención a `scripts/build.ts` si la hay.

## Risks / Trade-offs

- [Alguien usaba `require('atproto-comments')` en un bundler que resuelve `require` y lo ejecutaba en el navegador] → Recibía `{}` pero el IIFE se registraba como efecto secundario. Al quitar la condición, ese `require` resuelve `dist/index.js` (ESM) o falla según el bundler. Se documenta en «Changed» del CHANGELOG con la alternativa: `import 'atproto-comments'` o el `<script>` con `index.umd.js`. Es el motivo de que sea minor.
- [Con una URL de CDN con rango (`@1`), `index.js` y `element.js` pueden venir de dos versiones 1.x distintas durante un rato] → Funciona mientras `element.js` exporte `AtprotoComments` con el mismo nombre, que es API pública y no cambia dentro de 1.x. Quien quiera descartarlo del todo usa una versión exacta, como ya recomienda el README.
- [El plugin de esbuild es código propio del build] → Son cinco líneas, y la tarea 2.1 verifica que `dist/index.js` solo importa `./element.js` y no contiene la clase.
- [El reemplazo de extensiones en los `.d.ts` no cubre alguna forma de import] → Solo hay `import`/`export ... from` relativos; la tarea 2.2 comprueba que no queda ninguna ruta `.ts` y la 2.4 lo prueba con un consumidor.
- [`deno publish` marca la superclase como *slow type*] → Plan B en la decisión 2. Se verifica con `deno publish --dry-run` antes de seguir.
- [La batería de navegador se queda desactualizada al no correr en el CI] → «Development» del README indica ejecutarla antes de publicar una versión que toque el componente, y los changes que lo modifiquen la incluyen en sus tareas de verificación.

## Migration Plan

Sin migración para quien usa `import`, JSR o CDN. Se publica como 1.3.0: tag `v1.3.0` en `main` (comprobación de versiones, tests, JSR y GitHub Release) y npm a mano.
