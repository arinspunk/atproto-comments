import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [svelte()],
  base: "./",
  logLevel: "warn",
  build: { outDir: "dist", emptyOutDir: true },
});
