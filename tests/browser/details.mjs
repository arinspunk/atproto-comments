// Loading state, the accessible names of the picker buttons, and the new or
// changed strings (unknownAuthor, viewMore, dates over a year old).

import { MOD, replyView, threadView, U, withThread } from "./harness.mjs";

const busy = () => {
  const e = document.querySelector("atproto-comments");
  return { busy: e.getAttribute("aria-busy"), loadingClass: e.classList.contains("atproto-comments--loading") };
};
const BUSY = `window.busy = ${busy.toString()};`;
const on = { busy: "true", loadingClass: true };
const off = { busy: null, loadingClass: false };

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
      const go = document.querySelector("atproto-comments > .atproto-app-action .atproto-app-popover__go");
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
      const go = document.querySelector("atproto-comments > .atproto-app-action .atproto-app-popover__go");
      return { label: go.getAttribute("aria-label"), arrow: go.textContent };
    },
    expected: { label: "Ir", arrow: "→" },
  },
  {
    name: "ningún botón del selector lleva aria-haspopup",
    body: `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    evaluate: async () => {
      await sleep(200);
      const buttons = document.querySelectorAll(".atproto-app-btn");
      return { buttons: buttons.length > 1, haspopup: document.querySelectorAll("[aria-haspopup]").length };
    },
    expected: { buttons: true, haspopup: 0 },
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
];
