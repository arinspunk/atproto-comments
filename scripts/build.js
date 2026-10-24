import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

// The class lives only in dist/element.js; dist/index.js imports it by a fixed
// name, so a CDN serving a version range never asks for a file that is gone.
const elementExternal = {
  name: "element-external",
  setup(build) {
    build.onResolve({ filter: /^\.\/element\.ts$/ }, () => ({ path: "./element.js", external: true }));
  },
};

await esbuild.build({
  entryPoints: ["src/element.ts"],
  outfile: "dist/element.js",
  bundle: true,
  format: "esm",
  target: "es2022",
});

await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  plugins: [elementExternal],
});

// Classic <script>: everything in one file, registers itself.
await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.umd.js",
  bundle: true,
  format: "iife",
  globalName: "AtprotoComments",
  target: "es2022",
  minify: true,
});

cpSync("src/atproto-comments.css", "dist/atproto-comments.css");

// Type declarations. tsc keeps the `.ts` extensions of relative imports in
// `.d.ts` files, which `moduleResolution: node16` can't resolve, so rewrite them.
const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { stdio: "inherit" });
for (const file of readdirSync("dist/types")) {
  const path = `dist/types/${file}`;
  writeFileSync(path, readFileSync(path, "utf8").replace(/(from\s+["']\.{1,2}\/[^"']+)\.ts(["'])/g, "$1.js$2"));
}

await esbuild.stop();
console.log("Build complete.");
