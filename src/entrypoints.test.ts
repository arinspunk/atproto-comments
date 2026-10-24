/// <reference lib="dom" />
// The DOM types are only for type-checking element.ts; at runtime Deno has no
// `HTMLElement` or `customElements`, like a server rendering the page.

import { assertEquals } from "jsr:@std/assert@^1.0.0";

Deno.test("importing the package root without the DOM registers nothing", async () => {
  const { AtprotoComments } = await import("./index.ts");
  assertEquals(typeof AtprotoComments, "function");
  assertEquals("customElements" in globalThis, false);
});

Deno.test("importing ./element without the DOM loads the class", async () => {
  const { AtprotoComments } = await import("./element.ts");
  assertEquals(typeof AtprotoComments, "function");
});

Deno.test("both entry points export the same class", async () => {
  const root = await import("./index.ts");
  const element = await import("./element.ts");
  assertEquals(root.AtprotoComments, element.AtprotoComments);
});
