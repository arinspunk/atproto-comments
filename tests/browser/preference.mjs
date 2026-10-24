// Scenarios of the reply-rendering spec: links that open in the preferred app,
// replies hidden by author labels, and no empty lists.

import { MOD, replyView, threadView, U, withThread } from "./harness.mjs";

const PREF = "atproto-preferred-app";
const BOB = "did:plc:bob";
const text = "hi @bob #tag";
const enc = new TextEncoder();
const range = (part) => {
  const start = enc.encode(text.slice(0, text.indexOf(part))).length;
  return { byteStart: start, byteEnd: start + enc.encode(part).length };
};

// One reply with a mention, a hashtag and more replies than loaded ("View more").
const LINKS = threadView("L", [
  replyView("r1", {
    replyCount: 3,
    record: {
      text,
      facets: [
        { index: range("@bob"), features: [{ $type: "app.bsky.richtext.facet#mention", did: BOB }] },
        { index: range("#tag"), features: [{ $type: "app.bsky.richtext.facet#tag", tag: "tag" }] },
      ],
    },
  }),
]);
const BODY = `<atproto-comments thread-uri="${U("L")}"></atproto-comments>${MOD}`;
const pref = (domain) => `try { localStorage.setItem(${JSON.stringify(PREF)}, ${JSON.stringify(domain)}); } catch {}`;

/** The href a link has when the visitor opens it: read on a real click, navigation prevented. */
async function hrefOnClick(page, selector) {
  await page.evaluate(() => {
    document.addEventListener("click", (e) => {
      window.__opened = e.target.closest("a")?.href;
      e.preventDefault();
    }, { once: true });
  });
  await page.click(selector);
  return page.evaluate(() => window.__opened);
}

const MENTION = ".atproto-reply__text a[href*='/profile/']";
const TAG = ".atproto-reply__text a[href*='/hashtag/']";
const MORE = ".atproto-reply__more";

export const scenarios = [
  {
    name: "sin preferencia: mención y «View more» en bsky.app",
    body: BODY,
    init: withThread("L", LINKS),
    run: async (page) => {
      await page.waitForTimeout(200);
      return { mention: await hrefOnClick(page, MENTION), more: await hrefOnClick(page, MORE) };
    },
    expected: {
      mention: `https://bsky.app/profile/${BOB}`,
      more: "https://bsky.app/profile/did:plc:r1/post/r1",
    },
  },
  {
    name: "preferencia elegida antes: «View more» en Deer",
    body: BODY,
    init: withThread("L", LINKS) + pref("deer.social"),
    run: async (page) => {
      await page.waitForTimeout(200);
      return { more: await hrefOnClick(page, MORE) };
    },
    expected: { more: "https://deer.social/profile/did:plc:r1/post/r1" },
  },
  {
    name: "preferencia cambiada después del render: la mención abre en Mu",
    body: BODY,
    init: withThread("L", LINKS),
    run: async (page) => {
      await page.waitForTimeout(200);
      const before = await page.getAttribute(MENTION, "href");
      // Choose Mu in the picker, keeping its link from navigating.
      await page.click("atproto-comments > .atproto-app-action .atproto-app-btn--xl");
      await page.waitForTimeout(100);
      await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), { once: true }));
      await page.click("atproto-comments > .atproto-app-action .atproto-app-popover__link:has-text('Mu')");
      await page.waitForTimeout(100);
      return { before, mention: await hrefOnClick(page, MENTION) };
    },
    expected: { before: `https://bsky.app/profile/${BOB}`, mention: `https://mu.social/profile/${BOB}` },
  },
  {
    name: "dominio personalizado",
    body: BODY,
    init: withThread("L", LINKS) + pref("app.example"),
    run: async (page) => {
      await page.waitForTimeout(200);
      return { mention: await hrefOnClick(page, MENTION) };
    },
    expected: { mention: `https://app.example/profile/${BOB}` },
  },
  {
    name: "hashtag en bsky.app aunque haya preferencia",
    body: BODY,
    init: withThread("L", LINKS) + pref("deer.social"),
    run: async (page) => {
      await page.waitForTimeout(200);
      return { tag: await hrefOnClick(page, TAG) };
    },
    expected: { tag: "https://bsky.app/hashtag/tag" },
  },
  {
    name: "etiquetas del autor: de cuenta oculta, de perfil no",
    body: `<atproto-comments thread-uri="${U("M")}"></atproto-comments>${MOD}`,
    init: withThread("M", threadView("M", [
      replyView("ok"),
      replyView("acct", { author: { did: "did:plc:acct", labels: [{ val: "!hide", uri: "did:plc:acct" }] } }),
      replyView("prof", {
        author: { did: "did:plc:prof", labels: [{ val: "nudity", uri: "at://did:plc:prof/app.bsky.actor.profile/self" }] },
      }),
    ])),
    evaluate: async () => {
      await sleep(200);
      return state();
    },
    expected: { replies: ["reply-of-ok", "reply-of-prof"], lists: 1, mainBtn: ["Comment"] },
  },
  {
    name: "todas las respuestas ocultas: solo el botón, sin lista",
    body: `<atproto-comments thread-uri="${U("H")}"></atproto-comments>${MOD}`,
    init: withThread("H", threadView("H", [
      replyView("gated"),
      replyView("labeled", { labels: [{ val: "!hide" }] }),
    ], ["at://did:plc:gated/app.bsky.feed.post/gated"])),
    evaluate: async () => {
      await sleep(200);
      return state();
    },
    expected: { replies: [], lists: 0, mainBtn: ["Comment"], error: 0 },
  },
  {
    name: "subrespuestas todas ocultas: sin lista anidada vacía",
    body: `<atproto-comments thread-uri="${U("N")}"></atproto-comments>${MOD}`,
    init: withThread("N", threadView("N", [
      replyView("parent", {}, [replyView("child", { labels: [{ val: "!hide" }] })]),
    ])),
    evaluate: async () => {
      await sleep(200);
      return { ...state(), nested: document.querySelectorAll(".atproto-reply__replies").length };
    },
    expected: { replies: ["reply-of-parent"], lists: 1, nested: 0 },
  },
];
