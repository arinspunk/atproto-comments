// Shared test harness. No server: Playwright answers http://t.local/ itself,
// serving the scenario's HTML and the files of the repo's dist/, and `fetch`
// is replaced in the page by a mock AppView.
//
// A scenario is { name, body, expected, evaluate | run, init?, files? }:
// - body: HTML inside <body>; `<script src="index.js">` loads dist/index.js.
// - evaluate: function run in the page; run: async (page) => result, for real input.
// - expected: subset of the result to compare.
// - init: extra init script, run before the page's scripts.
// - files: { "/path": absolutePath } overriding what is served.
// - dirs: { "/prefix/": absoluteDir } serving a directory under a prefix.
// - url: page to open instead of the scenario body.

import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
export const DIST = resolve(ROOT, "dist");
export const ORIGIN = "http://t.local";

/** Mock AppView. Delay per post rkey in window.__delay; requests in __calls ("n:rkey"), aborts in __aborted. */
export const MOCK = () => {
  window.__calls = [];
  window.__aborted = [];
  window.__delay = {};
  const mk = (uri) => ({
    thread: {
      $type: "app.bsky.feed.defs#threadViewPost",
      post: { uri },
      replies: [{
        $type: "app.bsky.feed.defs#threadViewPost",
        post: {
          uri: uri + "/r",
          author: { did: "did:plc:a", handle: "a.example" },
          record: { text: "reply-of-" + uri.split("/").pop(), createdAt: "2026-10-20T10:00:00Z" },
        },
      }],
    },
  });
  let n = 0;
  window.fetch = (url, opts = {}) => {
    const u = new URL(url);
    const uri = u.searchParams.get("uri");
    const id = ++n + ":" + uri.split("/").pop();
    __calls.push(id);
    (window.__urls ??= []).push(String(url));
    const d = __delay[uri.split("/").pop()] ?? 50;
    return new Promise((res, rej) => {
      const t = setTimeout(() => res(new Response(JSON.stringify(mk(uri)), { status: 200 })), d);
      opts.signal?.addEventListener("abort", () => {
        clearTimeout(t);
        __aborted.push(id);
        rej(new DOMException("aborted", "AbortError"));
      });
    });
  };
  window.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.state = (sel = "atproto-comments") => {
    const e = document.querySelector(sel);
    return {
      replies: [...e.querySelectorAll(".atproto-reply__text")].map((x) => x.textContent),
      lists: e.querySelectorAll(".atproto-comments__list").length,
      mainBtn: [...e.querySelectorAll(".atproto-app-btn--xl")].map((b) => b.textContent),
      error: e.querySelectorAll(".atproto-comments__error").length,
    };
  };
};

export const U = (x) => `at://did:plc:root/app.bsky.feed.post/${x}`;
export const MOD = `<script type="module" src="index.js"></script>`;

const TYPES = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml" };
const typeOf = (f) => TYPES[f.slice(f.lastIndexOf("."))] ?? "application/octet-stream";

/** Opens a page for `scenario`, returns { page, errors }. */
export async function openPage(browser, scenario) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(`${ORIGIN}/**`, (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path === "/") {
      return r.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="en"><body>${scenario.body ?? ""}</body></html>` });
    }
    const dir = Object.entries(scenario.dirs ?? {}).find(([prefix]) => path.startsWith(prefix));
    const file = scenario.files?.[path] ?? (dir ? resolve(dir[1], path.slice(dir[0].length)) : resolve(DIST, path.slice(1)));
    return r.fulfill({ path: file, contentType: typeOf(file) });
  });
  await page.addInitScript(MOCK);
  if (scenario.init) await page.addInitScript(scenario.init);
  await page.goto(scenario.url ?? `${ORIGIN}/`);
  return { page, errors };
}

/** `expected` is a subset: only its keys are compared. */
export function matches(actual, expected) {
  return Object.entries(expected).every(([k, v]) => isDeepStrictEqual(actual?.[k], v));
}
