# Proposal

## Why

La auditoría de la versión 1.1.2 (apartado 5 y punto 1.2) encontró problemas en cómo se empaqueta y publica el componente:

1. **La condición `"require"` de `exports` es engañosa (5.2).** Apunta a `dist/index.umd.js`, que es un IIFE, no CommonJS. Un `require()` devuelve `{}`, y en Node además falla porque no existe `HTMLElement`.
2. **El paquete npm no trae tipos (5.3).** `tsconfig.json` tiene `declaration: true` y `noEmit: true` a la vez, así que nunca se generan, y `package.json` no declara `types`. Quien usa TypeScript con npm no ve `AtprotoComments`, `StringKey` ni `UiStrings`.
3. **Las versiones se sincronizan a mano (5.4).** El tag, `package.json`, `package-lock.json` (en dos sitios), `deno.json` y los pins del README deben coincidir, y nada lo comprueba. Un descuadre se descubre al publicar.
4. **Hay dos scripts de build (5.5).** `scripts/build.js` (Node, el que usan el CI y la release) y `scripts/build.ts` (Deno, el de `deno task build`) hacen lo mismo y pueden divergir.
5. **Importar el módulo en el servidor rompe (5.6).** Al cargarlo se evalúan `HTMLElement.prototype` y `class extends HTMLElement`, y se llama a `customElements.define`. En SSR (Astro, Next.js, SvelteKit) el import falla, y por eso el README obliga a importarlo dentro de `useEffect` u `onMount`.
6. **No se puede obtener la clase sin registrar `<atproto-comments>` (1.2).** El README ya explica cómo registrar una subclase con otro nombre, pero el import siempre registra también `<atproto-comments>`.

Además, la verificación en el navegador de `component-lifecycle` se hizo con una batería de Playwright que solo existe fuera del repo. Sin ella no se puede repetir.

## What Changes

- **Nuevo punto de entrada `./element`** en npm (`atproto-comments/element`) y en JSR (`jsr:@arinspunk/atproto-comments/element`). Exporta la clase y los tipos sin registrar ninguna etiqueta. El punto de entrada principal sigue registrando `<atproto-comments>` como hasta ahora.
- **BREAKING (menor):** se quita la condición `"require"` de `exports["."]`. Quien usara `require('atproto-comments')` obtenía `{}`, así que en la práctica no funcionaba. `dist/index.umd.js` se sigue publicando con el mismo nombre, para usarlo con `<script>` clásico, y se documenta en el README.
- **Tipos en npm:** el build genera las declaraciones en `dist/types/`, y `package.json` declara `types` y la condición `types` en cada entrada de `exports`.
- **Importar sin DOM es seguro:** en el servidor, importar cualquiera de los dos puntos de entrada no lanza errores y no registra nada. El README lo documenta y simplifica los ejemplos de frameworks que lo permitan.
- **Comprobación de versiones:** un script compara las versiones de `package.json`, `package-lock.json` (raíz y `packages[""]`), `deno.json` y los pins `1.x.y` del README, incluido el ejemplo en prosa. Se ejecuta en el CI en cada push y PR, y en la release compara además con el tag. La publicación en npm sigue siendo manual.
- **Un solo script de build:** se elimina `scripts/build.ts` y `deno task build` ejecuta `scripts/build.js`.
- **Tests en navegador en el repo:** la batería de Playwright de `component-lifecycle` (ciclo de vida, selector y Svelte 5) pasa al repo con un comando local. No se ejecuta en el CI.
- Versión minor (1.3.0): entrada nueva y retirada de la condición `require`.

Fuera de este change: los puntos 2.2, 2.4, 2.5, 3.x y 4.x de la auditoría (change `app-preference-consistency`), y publicar en npm desde el CI.

## Capabilities

### New Capabilities
- `package-distribution`: cómo se importa y distribuye el componente: puntos de entrada y qué registra cada uno, comportamiento al importarlo sin DOM, tipos incluidos y archivo para `<script>` clásico.

### Modified Capabilities

## Impact

- `src/index.ts` se divide: la clase pasa a `src/element.ts` y `index.ts` la reexporta y registra la etiqueta. Detección perezosa de la Popover API y base de la clase protegida para entornos sin DOM.
- `package.json`: `exports` (sin `require`, con `./element` y `types`), `types`, scripts `build`, `check:versions` y `test:browser`. `deno.json`: `exports` como mapa con `.` y `./element`, y `deno task build`.
- `tsconfig.json` o un `tsconfig.build.json` para emitir solo declaraciones.
- `scripts/build.js` (también genera los tipos), `scripts/build.ts` eliminado, `scripts/check-versions.js` nuevo.
- `.github/workflows/ci.yml` y `release.yml`: paso de comprobación de versiones. Se editan a través de la copia `github-copy/` (skill `ci-workflows`).
- `tests/browser/`: servidor con AppView simulado, escenarios de Playwright y app de Svelte 5, con su propio `package.json` (`playwright-core`, `svelte`, `vite`, `@sveltejs/vite-plugin-svelte`). Las dependencias del paquete raíz no cambian.
- `src/`: un test de Deno que importa los dos puntos de entrada sin DOM.
- `README.md`: instalación (IIFE, `./element`, tipos), «Custom element name», «Framework usage» (SSR) y «Development». `CHANGELOG.md`.
- Webs que ya usan el componente: sin cambios si importan con `import` o cargan `index.js` o `index.umd.js`. Solo cambia algo para quien usara `require()`, que ya no funcionaba.
