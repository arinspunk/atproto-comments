import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  target: "es2022",
});

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

await esbuild.stop();
console.log("Build complete.");
