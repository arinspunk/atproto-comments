import { assertEquals } from "jsr:@std/assert@^1.0.0";
import {
  buildStrings,
  I18N,
  parseStringsAttr,
  resolveLang,
  resolveLocale,
  translate,
} from "./i18n.ts";

Deno.test("resolveLang uses attribute, then document language, then en", () => {
  assertEquals(resolveLang("pt-BR", "en"), "pt");
  assertEquals(resolveLang(null, "pt"), "pt");
  assertEquals(resolveLang(null, "es"), "en");
  assertEquals(resolveLang(null, undefined), "en");
});

Deno.test("parseStringsAttr ignores malformed JSON", () => {
  assertEquals(parseStringsAttr("{comment:"), {});
});

Deno.test("parseStringsAttr ignores non-object JSON", () => {
  assertEquals(parseStringsAttr('["Comentar"]'), {});
  assertEquals(parseStringsAttr("null"), {});
  assertEquals(parseStringsAttr('"Comentar"'), {});
});

Deno.test("parseStringsAttr drops non-string values and unknown keys", () => {
  assertEquals(
    parseStringsAttr('{"comment": 42, "reply": "Responder", "nope": "x"}'),
    { reply: "Responder" },
  );
});

Deno.test("parseStringsAttr handles empty attribute", () => {
  assertEquals(parseStringsAttr(null), {});
  assertEquals(parseStringsAttr(""), {});
});

Deno.test("buildStrings applies a partial override over the bundled dictionary", () => {
  const s = buildStrings("en", { comment: "Comentar", reply: "Responder" });
  assertEquals(s.comment, "Comentar");
  assertEquals(s.reply, "Responder");
  assertEquals(s.error, I18N.en.error);
});

Deno.test("buildStrings gives the property priority over the attribute", () => {
  const s = buildStrings("en", { comment: "A" }, { comment: "B" });
  assertEquals(s.comment, "B");
});

Deno.test("buildStrings sanitizes property values", () => {
  const s = buildStrings("pt", {}, { comment: 1, reply: "R" });
  assertEquals(s.comment, I18N.pt.comment);
  assertEquals(s.reply, "R");
  assertEquals(buildStrings("en", {}, "not an object").comment, I18N.en.comment);
});

Deno.test("buildStrings uses the bundled pt dictionary", () => {
  assertEquals(buildStrings("pt").comment, "Comentar");
});

Deno.test("translate substitutes placeholders in supplied strings", () => {
  const s = buildStrings("en", { replyTo: "Responder a {name}" });
  assertEquals(translate(s, "replyTo", { name: "Ana" }), "Responder a Ana");
});

Deno.test("resolveLocale keeps valid tags and falls back otherwise", () => {
  assertEquals(resolveLocale("es-ES", "en"), "es-ES");
  assertEquals(resolveLocale("not a locale!", "en"), "en");
  assertEquals(resolveLocale("", "pt"), "pt");
  assertEquals(resolveLocale(null, "pt"), "pt");
});
