// Scenarios of the package-distribution spec that need a browser.

import * as esbuild from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { MOD, ROOT, U } from "./harness.mjs";

// Another 1.x build of dist/element.js: same exports, different code. The banner
// marks that the browser really got this file.
const altDir = mkdtempSync(join(tmpdir(), "atproto-element-"));
const ALT_ELEMENT = join(altDir, "element.js");
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/element.ts")],
  outfile: ALT_ELEMENT,
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  banner: { js: "globalThis.__altElement = true;" },
  logLevel: "warning",
});

const shown = (x) => ({ replies: [`reply-of-${x}`], lists: 1, error: 0 });
const CSS = `<link rel="stylesheet" href="atproto-comments.css">`;

/** Computed styles that depend on the stylesheet's custom properties. */
const looks = (sel) => {
  const el = document.querySelector(sel);
  const avatar = getComputedStyle(el.querySelector(".atproto-reply__avatar--placeholder"));
  return { display: getComputedStyle(el).display, width: avatar.width, background: avatar.backgroundColor };
};

export const scenarios = [
  {
    name: "importar solo ./element no registra <atproto-comments>",
    body: `<script type="module">import { AtprotoComments } from "./element.js"; window.__C = AtprotoComments;</script>`,
    evaluate: async () => {
      await sleep(200);
      return { registered: customElements.get("atproto-comments") !== undefined, cls: typeof window.__C };
    },
    expected: { registered: false, cls: "function" },
  },
  {
    name: "registrar la clase de ./element como my-comments",
    body: `<my-comments thread-uri="${U("A")}"></my-comments>
      <script type="module">import { AtprotoComments } from "./element.js"; customElements.define("my-comments", AtprotoComments);</script>`,
    evaluate: async () => {
      await sleep(200);
      return { ...state("my-comments"), registered: customElements.get("atproto-comments") !== undefined };
    },
    expected: { ...shown("A"), registered: false },
  },
  {
    name: "<atproto-comments> y una subclase my-comments a la vez",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments><my-comments thread-uri="${U("B")}"></my-comments>
      <script type="module">import { AtprotoComments } from "./index.js"; customElements.define("my-comments", class extends AtprotoComments {});</script>`,
    evaluate: async () => {
      await sleep(200);
      return { a: state("atproto-comments"), b: state("my-comments") };
    },
    expected: { a: { ...shown("A"), mainBtn: ["Comment"] }, b: { ...shown("B"), mainBtn: ["Comment"] } },
  },
  {
    name: "estilos: <my-comments> se ve igual que <atproto-comments>",
    body: `${CSS}<atproto-comments thread-uri="${U("A")}"></atproto-comments><my-comments thread-uri="${U("B")}"></my-comments>
      <script type="module">import { AtprotoComments } from "./index.js"; customElements.define("my-comments", class extends AtprotoComments {});</script>`,
    evaluate: async () => {
      await sleep(200);
      const a = window.looks("atproto-comments"), b = window.looks("my-comments");
      return { same: JSON.stringify(a) === JSON.stringify(b), display: b.display, a, b };
    },
    init: `window.looks = ${looks.toString()};`,
    expected: { same: true, display: "block" },
  },
  {
    name: "estilos: el elemento conserva sus clases y añade atproto-comments",
    body: `<atproto-comments class="mine" thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    evaluate: async () => {
      await sleep(200);
      return { classes: [...document.querySelector("atproto-comments").classList].sort() };
    },
    expected: { classes: ["atproto-comments", "mine"] },
  },
  {
    name: "estilos: la personalización con el selector de etiqueta sigue ganando",
    body: `${CSS}<style>atproto-comments { --atproto-avatar-bg: red; }</style>
      <atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    evaluate: async () => {
      await sleep(200);
      return { background: window.looks("atproto-comments").background };
    },
    init: `window.looks = ${looks.toString()};`,
    expected: { background: "rgb(255, 0, 0)" },
  },
  {
    name: "importar el punto de entrada principal dos veces",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>
      <script type="module" src="index.js"></script><script type="module" src="index.js?again"></script>`,
    evaluate: async () => {
      await sleep(200);
      return { ...state(), calls: __calls };
    },
    expected: { ...shown("A"), calls: ["1:A"] },
  },
  {
    name: "los dos puntos de entrada dan la misma clase",
    body: `<script type="module">
      import "./index.js";
      import { AtprotoComments } from "./element.js";
      window.__same = customElements.get("atproto-comments") === AtprotoComments;
    </script>`,
    evaluate: async () => {
      await sleep(200);
      return { same: window.__same };
    },
    expected: { same: true },
  },
  {
    name: "index.js con un element.js de otra versión 1.x",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    files: { "/element.js": ALT_ELEMENT },
    evaluate: async () => {
      await sleep(200);
      return { ...state(), alt: globalThis.__altElement === true };
    },
    expected: { ...shown("A"), alt: true },
  },
  {
    name: "index.umd.js con <script> clásico",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments><script src="index.umd.js"></script>`,
    evaluate: async () => {
      await sleep(200);
      return state();
    },
    expected: shown("A"),
  },
];
