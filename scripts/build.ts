import * as esbuild from "npm:esbuild@^0.23.0";
import { copy } from "https://deno.land/std@0.224.0/fs/mod.ts";

const outdir = "dist";

await Deno.mkdir(outdir, { recursive: true });

// ESM
await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: `${outdir}/index.js`,
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: false,
});

// UMD (IIFE, self-registering)
await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: `${outdir}/index.umd.js`,
  bundle: true,
  format: "iife",
  globalName: "AtprotoComments",
  target: "es2022",
  minify: true,
});

// CSS
await copy("src/atproto-comments.css", `${outdir}/atproto-comments.css`, { overwrite: true });

await esbuild.stop();

console.log("Build complete.");
