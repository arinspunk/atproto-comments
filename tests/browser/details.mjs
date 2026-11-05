// Loading state, the accessible names of the picker buttons, and the new or
// changed strings (unknownAuthor, viewMore, dates over a year old).

import { CSS_LINK, MOD, replyView, threadView, U, withThread } from "./harness.mjs";

const busy = () => {
  const e = document.querySelector("atproto-comments");
  return { busy: e.getAttribute("aria-busy"), loadingClass: e.classList.contains("atproto-comments--loading") };
};
const BUSY = `window.busy = ${busy.toString()};`;
const on = { busy: "true", loadingClass: true };
const off = { busy: null, loadingClass: false };

const PREF = "atproto-preferred-app";
const pref = (domain) => `try { localStorage.setItem(${JSON.stringify(PREF)}, ${JSON.stringify(domain)}); } catch {}`;
const BYLINE = ".atproto-reply__byline";
const PERMALINK = ".atproto-reply__permalink";

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

const AUTHOR = threadView("A", [replyView("ana", { author: { did: "did:plc:ana", handle: "xulioze.com", displayName: "Xulio Zé" } })]);
const AUTHOR_BODY = `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`;

export const scenarios = [
  {
    name: "carga: aria-busy y la clase mientras carga, y fuera al terminar",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    init: BUSY + "window.__delay = { A: 300 };",
    evaluate: async () => {
      await customElements.whenDefined("atproto-comments");
      __delay.A = 300;
      await sleep(100);
      const during = busy();
      await sleep(400);
      return { during, after: busy(), lists: state().lists };
    },
    expected: { during: on, after: off, lists: 1 },
  },
  {
    name: "carga: fuera también si el AppView responde con error",
    body: `<atproto-comments thread-uri="${U("E")}"></atproto-comments>${MOD}`,
    init: BUSY + withThread("E", 500),
    evaluate: async () => {
      await sleep(200);
      return { ...busy(), error: state().error };
    },
    expected: { ...off, error: 1 },
  },
  {
    name: "carga: fuera al desconectar durante la carga",
    body: `<div id="h"></div>${MOD}`,
    evaluate: async () => {
      await customElements.whenDefined("atproto-comments");
      __delay.A = 300;
      const e = document.createElement("atproto-comments");
      e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/A");
      document.getElementById("h").append(e);
      await sleep(60);
      const read = () => ({ busy: e.getAttribute("aria-busy"), loadingClass: e.classList.contains("atproto-comments--loading") });
      const during = read();
      e.remove();
      return { during, after: read(), aborted: __aborted.length };
    },
    expected: { during: on, after: off, aborted: 1 },
  },
  {
    name: "carga: fuera al pasar a un thread-uri inválido",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    init: BUSY,
    evaluate: async () => {
      await customElements.whenDefined("atproto-comments");
      __delay.A = 300;
      document.querySelector("atproto-comments").setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/A");
      await sleep(30);
      document.querySelector("atproto-comments").setAttribute("thread-uri", "nope");
      await sleep(50);
      return { ...busy(), error: state().error };
    },
    expected: { ...off, error: 1 },
  },
  {
    name: "carga: cambiar lang no pone aria-busy",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    init: BUSY,
    evaluate: async () => {
      await sleep(200);
      const e = document.querySelector("atproto-comments");
      const seen = [];
      new MutationObserver((m) => m.forEach((r) => seen.push(r.attributeName))).observe(e, { attributes: true });
      e.setAttribute("lang", "pt");
      await sleep(100);
      return { seen: seen.filter((a) => a === "aria-busy").length, mainBtn: state().mainBtn };
    },
    expected: { seen: 0, mainBtn: ["Comentar"] },
  },
  {
    name: "botón «→»: nombre accesible «Open» y flecha oculta",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    evaluate: async () => {
      await sleep(200);
      document.querySelector("atproto-comments > .atproto-app-action .atproto-app-btn").click();
      const go = document.querySelector("atproto-comments .atproto-app-sheet__go");
      const arrow = go.querySelector("span");
      return { label: go.getAttribute("aria-label"), arrow: arrow.textContent, hidden: arrow.getAttribute("aria-hidden") };
    },
    expected: { label: "Open", arrow: "→", hidden: "true" },
  },
  {
    name: "botón «→»: nombre personalizado con strings",
    body: `<atproto-comments thread-uri="${U("A")}" strings='{"go":"Ir"}'></atproto-comments>${MOD}`,
    evaluate: async () => {
      await sleep(200);
      document.querySelector("atproto-comments > .atproto-app-action .atproto-app-btn").click();
      const go = document.querySelector("atproto-comments .atproto-app-sheet__go");
      return { label: go.getAttribute("aria-label"), arrow: go.textContent };
    },
    expected: { label: "Ir", arrow: "→" },
  },
  {
    name: "solo los botones del selector llevan aria-haspopup, y es \"dialog\"",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    evaluate: async () => {
      await sleep(200);
      const buttons = document.querySelectorAll(".atproto-app-btn");
      const haspopup = [...document.querySelectorAll("[aria-haspopup]")];
      return {
        buttons: buttons.length > 1,
        same: haspopup.length === buttons.length && haspopup.every((b) => b.matches(".atproto-app-btn")),
        values: [...new Set(haspopup.map((b) => b.getAttribute("aria-haspopup")))],
      };
    },
    expected: { buttons: true, same: true, values: ["dialog"] },
  },
  {
    name: "autor sin nombre ni handle: «Desconhecido» con lang=pt",
    body: `<atproto-comments lang="pt" thread-uri="${U("X")}"></atproto-comments>${MOD}`,
    init: withThread("X", threadView("X", [replyView("anon", { author: { did: "did:plc:anon", handle: undefined } })])),
    evaluate: async () => {
      await sleep(200);
      return { name: document.querySelector(".atproto-reply__author").textContent };
    },
    expected: { name: "Desconhecido" },
  },
  {
    name: "fecha de más de un año con lang=pt-PT",
    body: `<atproto-comments lang="pt-PT" thread-uri="${U("D")}"></atproto-comments>${MOD}`,
    timezoneId: "Europe/Lisbon",
    init: withThread("D", threadView("D", [replyView("old", { record: { createdAt: "2020-01-02T12:00:00Z" } })])),
    evaluate: async () => {
      await sleep(200);
      return { time: document.querySelector(".atproto-reply__time").textContent };
    },
    expected: { time: "02/01/20" },
  },
  {
    name: "«View more replies» como texto por defecto",
    body: `<atproto-comments thread-uri="${U("V")}"></atproto-comments>${MOD}`,
    init: withThread("V", threadView("V", [replyView("busy", { replyCount: 4 })])),
    evaluate: async () => {
      await sleep(200);
      return { more: document.querySelector(".atproto-reply__more").textContent };
    },
    expected: { more: "View more replies" },
  },
  {
    name: "autor y fecha enlazados sin preferencia: en bsky.app",
    body: AUTHOR_BODY,
    init: withThread("A", AUTHOR),
    run: async (page) => {
      await page.waitForTimeout(200);
      return {
        author: await hrefOnClick(page, BYLINE),
        date: await hrefOnClick(page, PERMALINK),
        target: await page.$$eval(`${BYLINE}, ${PERMALINK}`, (els) => els.map((a) => `${a.tagName} ${a.target} ${a.rel}`)),
        timeInLink: await page.$eval(PERMALINK, (a) => a.firstElementChild?.tagName),
      };
    },
    expected: {
      author: "https://bsky.app/profile/did:plc:ana",
      date: "https://bsky.app/profile/did:plc:ana/post/ana",
      target: ["A _blank noopener noreferrer", "A _blank noopener noreferrer"],
      timeInLink: "TIME",
    },
  },
  {
    name: "autor y fecha enlazados con Deer",
    body: AUTHOR_BODY,
    init: withThread("A", AUTHOR) + pref("deer.social"),
    run: async (page) => {
      await page.waitForTimeout(200);
      return { author: await hrefOnClick(page, BYLINE), date: await hrefOnClick(page, PERMALINK) };
    },
    expected: {
      author: "https://deer.social/profile/did:plc:ana",
      date: "https://deer.social/profile/did:plc:ana/post/ana",
    },
  },
  {
    name: "autor y fecha: preferencia cambiada después del render",
    body: AUTHOR_BODY,
    init: withThread("A", AUTHOR),
    run: async (page) => {
      await page.waitForTimeout(200);
      await page.evaluate(() => localStorage.setItem("atproto-preferred-app", "mu.social"));
      return { author: await hrefOnClick(page, BYLINE), date: await hrefOnClick(page, PERMALINK) };
    },
    expected: {
      author: "https://mu.social/profile/did:plc:ana",
      date: "https://mu.social/profile/did:plc:ana/post/ana",
    },
  },
  {
    name: "autor sin DID: byline y fecha sin enlace, sin «Reply» ni «View more»",
    body: `${CSS_LINK}<atproto-comments thread-uri="${U("N")}"></atproto-comments>${MOD}`,
    init: withThread("N", threadView("N", [{
      ...replyView("nodid"),
      post: { ...replyView("nodid").post, replyCount: 3, author: { handle: "nodid.example" } },
    }])),
    evaluate: async () => {
      await sleep(200);
      return {
        replyBtn: document.querySelectorAll(".atproto-reply .atproto-app-btn").length,
        more: document.querySelectorAll(".atproto-reply__more").length,
        byline: document.querySelector(".atproto-reply__byline").tagName,
        links: document.querySelectorAll(".atproto-reply__header a").length,
        time: !!document.querySelector(".atproto-reply__header > .atproto-reply__time"),
        separator: getComputedStyle(document.querySelector(".atproto-reply__time"), "::before").content,
      };
    },
    expected: { replyBtn: 0, more: 0, byline: "SPAN", links: 0, time: true, separator: '"·\u00a0"' },
  },
  {
    name: "texto del byline enlazado: «Xulio Zé @xulioze.com»",
    body: AUTHOR_BODY,
    init: withThread("A", AUTHOR),
    evaluate: async () => {
      await sleep(200);
      return { text: document.querySelector(".atproto-reply__byline").innerText };
    },
    expected: { text: "Xulio Zé @xulioze.com" },
  },
  {
    name: "fecha enlazada: conserva el title con la fecha completa",
    body: `${CSS_LINK}<atproto-comments lang="en-GB" thread-uri="${U("T")}"></atproto-comments>${MOD}`,
    timezoneId: "Europe/Lisbon",
    init: withThread("T", threadView("T", [replyView("old", { record: { createdAt: "2020-01-02T12:00:00Z" } })])),
    evaluate: async () => {
      await sleep(200);
      const time = document.querySelector(".atproto-reply__permalink > .atproto-reply__time");
      return { title: time.title, separator: getComputedStyle(time.parentElement, "::before").content };
    },
    expected: { title: "02/01/2020, 12:00", separator: '"·\u00a0"' },
  },
];
