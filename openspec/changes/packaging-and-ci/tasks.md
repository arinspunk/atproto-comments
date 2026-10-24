# Tasks

## 1. Puntos de entrada y SSR (package-distribution)

- [x] 1.1 Mover a `src/element.ts` todo el contenido de `src/index.ts` salvo el registro, con su propio `@module`, y dejar `index.ts` con `export * from "./element.ts"`, los `export type` y el registro protegido con `typeof customElements !== "undefined"` (design, decisión 1). Verificar que `npx tsc --noEmit`, `deno task check` y `deno task test` pasan
- [x] 1.2 Cambiar `SUPPORTS_POPOVER` por una función `supportsPopover()` cacheada y hacer que `AtprotoComments` extienda la base protegida con tipo explícito `typeof HTMLElement` (design, decisión 2). Verificar que `deno publish --dry-run --allow-dirty` no da avisos de *slow types*; si los da, probar la alternativa de la decisión 2
- [x] 1.3 Cambiar `exports` de `deno.json` a un mapa con `.` y `./element`. Verificar con `deno publish --dry-run --allow-dirty` que se listan los dos puntos de entrada
- [x] 1.4 Añadir `src/entrypoints.test.ts`: importar `./index.ts` y `./element.ts` sin DOM no lanza, `AtprotoComments` es una función y `globalThis.customElements` sigue siendo `undefined`. Verificar que `deno task test` pasa

## 2. Build, tipos y package.json

- [x] 2.1 En `scripts/build.js`, construir `dist/element.js` desde `src/element.ts` y `dist/index.js` desde `src/index.ts` con el plugin `element-external`, sin `splitting` ni chunks, y mantener `dist/index.umd.js` y el CSS (design, decisión 3). Eliminar `scripts/build.ts` y cambiar `deno task build` a `node scripts/build.js` (decisión 5). Verificar que:
  - `npm run build` y `deno task build` generan exactamente `dist/index.js`, `dist/element.js`, `dist/index.umd.js` y el CSS, y no existe `dist/chunks/`;
  - el único import de `dist/index.js` es `./element.js` (`grep -n "import\|from" dist/index.js`);
  - `dist/index.js` no contiene la definición de la clase, y `dist/element.js` la contiene una vez (esbuild la emite como `var AtprotoComments = class extends Base`, así que se busca `AtprotoComments = class`)
- [x] 2.2 Añadir `tsconfig.build.json` y el paso de `tsc` en `scripts/build.js` (decisión 4), con el reemplazo de extensiones en los `.d.ts` si `rewriteRelativeImportExtensions` no las cambia. Verificar que `dist/types/index.d.ts` y `dist/types/element.d.ts` existen y que ningún `.d.ts` importa rutas terminadas en `.ts`
- [x] 2.3 Actualizar `package.json`: `types`, `exports` con `types`, `import` y `default` para `.` y `./element`, sin `require`, y `./style.css` como estaba. Añadir los scripts `check:versions` y `test:browser`. Verificar con `npm pack --dry-run` que el paquete incluye `dist/index.js`, `dist/element.js`, `dist/index.umd.js`, `dist/types/` y el CSS, y ningún archivo en `dist/chunks/`
- [x] 2.4 Verificar los escenarios de tipos de la spec con un proyecto consumidor fuera del repo que instale el `.tgz` de `npm pack`: con `moduleResolution` `bundler` y `node16`, `import { AtprotoComments, type UiStrings } from "atproto-comments"` y el import desde `atproto-comments/element` pasan `tsc --noEmit`, y `const s: UiStrings = { comment: 1 }` da error
- [x] 2.5 Verificar en Node, con ese mismo proyecto, que `import "atproto-comments"` y `import { AtprotoComments } from "atproto-comments/element"` terminan sin errores y que `AtprotoComments` es una clase

## 3. Comprobación de versiones y CI

- [x] 3.1 Crear `scripts/check-versions.js` (design, decisión 6), que en el README solo lea los pins `atproto-comments@X.Y.Z`, `atproto-comments/X.Y.Z/` y `` `@X.Y.Z` ``. Verificar que:
  - `npm run check:versions` pasa con 1.2.0;
  - falla y lista los archivos si se cambia un pin del README o `packages[""].version` del lockfile;
  - `node scripts/check-versions.js --tag v9.9.9` falla;
  - añadir temporalmente al README una frase con «Svelte 5.0.0» no lo hace fallar;
  - un README sin ningún pin lo hace fallar
- [x] 3.2 Siguiendo la skill `ci-workflows` (recordar al usuario que la copia esquiva la regla de la organización y pedirle `! cp -R .github github-copy`), añadir en `ci.yml` la comprobación de versiones tras `npm ci` y la importación en Node de `dist/index.js` y `dist/element.js` tras el build, y en `release.yml` la comprobación con `--tag` antes de los tests. Validar el YAML con el comando de la skill y pedir al usuario que devuelva los archivos y borre la copia. Verificar con `git status --short` que solo cambian los dos workflows y que `github-copy/` no existe
- [ ] 3.3 Verificar en GitHub que el CI de la rama pasa, y que un commit temporal con un pin del README descuadrado lo hace fallar en el paso de versiones. Revertir el commit temporal

## 4. Batería de navegador (tests/browser)

- [x] 4.1 Crear `tests/browser/` con su `package.json` y lockfile, `server.mjs` (sirve `dist/` del repo y el AppView simulado, puerto configurable) y `run.mjs` (design, decisión 7), a partir de los scripts del scratchpad de `component-lifecycle` o, si ya no están, de `lifecycle-review-1.2.0.mjs` (17 escenarios con `fetch` simulado y aserciones) y de las specs. Añadir `tests/browser/node_modules` y la salida de la app de Svelte a `.gitignore`. Verificar que `npm run test:browser` arranca y para el servidor y sale con 0
- [x] 4.2 Portar a `lifecycle.mjs` y `picker.mjs` los escenarios de `element-lifecycle`, `ui-localization` y del selector, y a `svelte/` la app de Svelte 5. Verificar que pasan en Chromium y WebKit y que `run.mjs` sale con 1 si se rompe a propósito un escenario (por ejemplo, quitando temporalmente `#removeNodes()` de `#render`)
- [x] 4.3 Añadir `entrypoints.mjs` con los escenarios de `package-distribution` en el navegador: importar solo `dist/element.js` no registra `<atproto-comments>`; registrar la clase como `my-comments` muestra el hilo; `<atproto-comments>` y una subclase `my-comments` a la vez; importar el punto de entrada principal dos veces sin errores; importar los dos puntos de entrada da la misma clase (`customElements.get("atproto-comments") === AtprotoComments`); mezcla de versiones simulada (el servidor entrega un `element.js` recompilado con un cambio interno inocuo, por ejemplo otro texto por defecto, junto al `index.js` original) y el hilo se muestra; y `dist/index.umd.js` con `<script>` clásico. Verificar que pasan en Chromium y WebKit

## 5. Documentación

- [x] 5.1 Actualizar el README según la decisión 8: «Install» (script clásico, `./element`, tipos), «Custom element name», «Framework usage» (importar en el servidor es seguro) y «Development» (`check:versions`, `test:browser`, instalación de navegadores, `deno task build`). Verificar que `grep -n "build.ts\|require" README.md` no da resultados que contradigan el cambio y que los ejemplos de código del README coinciden con los escenarios probados en 2.4, 2.5 y 4.3
- [x] 5.2 Añadir a `CHANGELOG.md` una sección `[Unreleased]` con «Added» (`./element`, tipos en npm, importar sin DOM es seguro) y «Changed» (se quita la condición `require` con la alternativa, y `dist/index.js` importa `dist/element.js`, así que una copia propia necesita los dos). Verificar que sigue el formato de las entradas anteriores. El script de build único no se anota: es interno y no cambia nada para quien usa el paquete

## 6. Verificación integrada y versión

- [x] 6.1 Ejecutar `npx tsc --noEmit`, `deno task check`, `deno task test`, `npm run build`, `npm run check:versions` y `npm run test:browser` y verificar que pasan
- [ ] 6.2 En Firefox y Safari de escritorio, verificar a mano con las páginas de `tests/browser` que `<atproto-comments>` y `<my-comments>` funcionan a la vez sin errores y que `index.umd.js` con `<script>` clásico muestra el hilo
- [ ] 6.3 Subir la versión a 1.3.0 en `package.json`, `package-lock.json` (raíz y `packages[""]`) y `deno.json`, cambiar los pins del README y fechar la sección del CHANGELOG como `[1.3.0]`. Verificar que `npm run check:versions` pasa y que `node scripts/check-versions.js --tag v1.3.0` también

## Workflow follow-up

- Tras fusionar, crear el tag `v1.3.0` en `main`. La release comprueba las versiones, ejecuta los tests, publica en JSR y crea la GitHub Release. npm se publica a mano con `npm run build && npm publish` y se comprueba con `npm view atproto-comments version`.
- Archivar el change con `/opsx:archive` cuando esté publicado.
