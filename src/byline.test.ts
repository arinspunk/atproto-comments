import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { bylineParts } from "./byline.ts";

function text(p: ReturnType<typeof bylineParts>): string {
  return p.handle === null ? p.name : p.name + p.separator + p.handle;
}

Deno.test("bylineParts separates display name and handle with a space", () => {
  const p = bylineParts({ displayName: "Xulio Zé", handle: "xulioze.com" }, "Unknown");
  assertEquals(p, { name: "Xulio Zé", handle: "@xulioze.com", separator: " " });
  assertEquals(text(p), "Xulio Zé @xulioze.com");
});

Deno.test("bylineParts falls back to the handle as name", () => {
  assertEquals(text(bylineParts({ handle: "xulioze.com" }, "Unknown")), "xulioze.com @xulioze.com");
});

Deno.test("bylineParts omits the handle when missing", () => {
  assertEquals(bylineParts({ displayName: "Xulio Zé" }, "Unknown").handle, null);
});

Deno.test("bylineParts uses the unknown text when there is no name or handle", () => {
  assertEquals(bylineParts({}, "Desconhecido").name, "Desconhecido");
  assertEquals(bylineParts({}, "Desconhecido").handle, null);
});

Deno.test("bylineParts separator is whitespace", () => {
  assertEquals(/^\s+$/.test(bylineParts({ handle: "a.b" }, "Unknown").separator), true);
});
