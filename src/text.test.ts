import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { facetSegments, getInitials, normalizeDomain } from "./text.ts";

Deno.test("normalizeDomain accepts a bare domain", () => {
  assertEquals(normalizeDomain("app.example"), "app.example");
  assertEquals(normalizeDomain("  App.Example  "), "app.example");
});

Deno.test("normalizeDomain strips the scheme and trailing slashes", () => {
  assertEquals(normalizeDomain("https://app.example/"), "app.example");
  assertEquals(normalizeDomain("http://app.example//"), "app.example");
});

Deno.test("normalizeDomain rejects values that are not a domain", () => {
  assertEquals(normalizeDomain(""), null);
  assertEquals(normalizeDomain("app example"), null);
  assertEquals(normalizeDomain("app.example/profile"), null);
  assertEquals(normalizeDomain("app.example?x=1"), null);
  assertEquals(normalizeDomain("localhost"), null);
});

const LINK = "app.bsky.richtext.facet#link";
const MENTION = "app.bsky.richtext.facet#mention";
const TAG = "app.bsky.richtext.facet#tag";

/** UTF-8 byte range of the first occurrence of `part` in `text`. */
function range(text: string, part: string): { byteStart: number; byteEnd: number } {
  const enc = new TextEncoder();
  const byteStart = enc.encode(text.slice(0, text.indexOf(part))).length;
  return { byteStart, byteEnd: byteStart + enc.encode(part).length };
}

Deno.test("facetSegments returns the whole text without facets", () => {
  assertEquals(facetSegments({ text: "Olá 👋" }), [{ text: "Olá 👋" }]);
  assertEquals(facetSegments({}), []);
});

Deno.test("facetSegments uses byte offsets with emojis and accents", () => {
  const text = "Olá 👋🏽 @xulioze.com, mira https://ex.example ✨ #Galiza";
  const segments = facetSegments({
    text,
    facets: [
      { index: range(text, "#Galiza"), features: [{ $type: TAG, tag: "Galiza" }] },
      { index: range(text, "@xulioze.com"), features: [{ $type: MENTION, did: "did:plc:x" }] },
      { index: range(text, "https://ex.example"), features: [{ $type: LINK, uri: "https://ex.example" }] },
    ],
  });
  assertEquals(segments, [
    { text: "Olá 👋🏽 " },
    { text: "@xulioze.com", mention: "did:plc:x" },
    { text: ", mira " },
    { text: "https://ex.example", href: "https://ex.example" },
    { text: " ✨ " },
    { text: "#Galiza", tag: "Galiza" },
  ]);
});

Deno.test("facetSegments keeps the hashtag as written, unencoded", () => {
  const text = "#café";
  const segments = facetSegments({ text, facets: [{ index: range(text, text), features: [{ $type: TAG, tag: "café" }] }] });
  assertEquals(segments, [{ text: "#café", tag: "café" }]);
});

Deno.test("facetSegments skips overlapping facets", () => {
  const text = "uno dos tres";
  const segments = facetSegments({
    text,
    facets: [
      { index: range(text, "uno dos"), features: [{ $type: LINK, uri: "https://a.example" }] },
      { index: range(text, "dos tres"), features: [{ $type: LINK, uri: "https://b.example" }] },
    ],
  });
  assertEquals(segments, [{ text: "uno dos", href: "https://a.example" }, { text: " tres" }]);
});

Deno.test("facetSegments skips empty and out-of-range facets", () => {
  const text = "hola";
  const segments = facetSegments({
    text,
    facets: [
      { index: { byteStart: 2, byteEnd: 2 }, features: [{ $type: LINK, uri: "https://a.example" }] },
      { index: { byteStart: 2, byteEnd: 99 }, features: [{ $type: LINK, uri: "https://b.example" }] },
    ],
  });
  assertEquals(segments, [{ text: "hola" }]);
});

Deno.test("facetSegments ignores links that are not http(s) and unknown features", () => {
  const text = "a b";
  const segments = facetSegments({
    text,
    facets: [
      { index: range(text, "a"), features: [{ $type: LINK, uri: "javascript:alert(1)" }] },
      { index: range(text, "b"), features: [{ $type: "app.example.unknown" }] },
    ],
  });
  assertEquals(segments, [{ text: "a b" }]);
});

/** Runs `fn` with `Intl.Segmenter` removed, restoring it afterwards. */
function withoutSegmenter(fn: () => void): void {
  const intl = Intl as { Segmenter?: typeof Intl.Segmenter };
  const original = intl.Segmenter;
  delete intl.Segmenter;
  try {
    fn();
  } finally {
    intl.Segmenter = original;
  }
}

Deno.test("getInitials takes two initials from the display name", () => {
  assertEquals(getInitials("Xulio Zé", "xulioze.com"), "XZ");
  assertEquals(getInitials("élan", undefined), "É");
});

Deno.test("getInitials falls back to the handle and to ?", () => {
  assertEquals(getInitials("  ", "xulioze.com"), "XC");
  assertEquals(getInitials(undefined, undefined), "?");
  assertEquals(getInitials("", ""), "?");
});

const SAMPLES: Array<[string | undefined, string | undefined]> = [
  ["Xulio Zé", "xulioze.com"],
  [undefined, "xulio.ze.example"],
  [undefined, "ana-maria.bsky.social"],
  ["😀 Ana", undefined],
  ["Maria 🇱🇧🏳️‍🌈", undefined],
  ["🏳️‍🌈Queen Beryl’s Nail Tech🏳️‍🌈", undefined],
  ["O’Neil Smith", undefined],
  ["Ana (she/her)", undefined],
  ["jean_luc", undefined],
  [" - ", undefined],
  [undefined, undefined],
];

Deno.test("getInitials works without Intl.Segmenter", () => {
  withoutSegmenter(() => {
    assertEquals(typeof Intl.Segmenter, "undefined");
    assertEquals(getInitials("Xulio Zé", "xulioze.com"), "XZ");
    assertEquals(getInitials(undefined, "xulioze.com"), "XC");
    assertEquals(getInitials(undefined, undefined), "?");
    assertEquals(getInitials(" - ", undefined), "?");
  });
  assertEquals(typeof Intl.Segmenter, "function");
});

Deno.test("getInitials gives the same result with and without Intl.Segmenter", () => {
  const withSegmenter = SAMPLES.map(([n, h]) => getInitials(n, h));
  let without: string[] = [];
  withoutSegmenter(() => {
    without = SAMPLES.map(([n, h]) => getInitials(n, h));
  });
  assertEquals(without, withSegmenter);
});
