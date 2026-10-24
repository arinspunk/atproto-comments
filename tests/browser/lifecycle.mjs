// Scenarios of the element-lifecycle and ui-localization specs, plus the app
// picker's fallback mode across a re-render. Ported from the 1.2.0 review script.

import { MOD, U } from "./harness.mjs";

const ATTRS = `thread-uri="${U("A")}" appview="https://x.example/" lang="pt" max-depth="4" strings='{"reply":"R"}'`;
const shownA = { replies: ["reply-of-A"], lists: 1, error: 0 };

const RAW = [
  ["parser, script antes del HTML (script clásico)", `<script src="index.umd.js"></script><atproto-comments ${ATTRS}></atproto-comments>`,
    async () => { await sleep(200); return { calls: __calls, ...state() }; },
    { calls: ["1:A"], ...shownA, mainBtn: ["Comentar"] }],
  ["upgrade, script después del HTML (módulo)", `<atproto-comments ${ATTRS}></atproto-comments>${MOD}`,
    async () => { await sleep(200); return { calls: __calls, ...state() }; },
    { calls: ["1:A"], ...shownA, mainBtn: ["Comentar"] }],
  ["creado desde JS con atributos y strings", MOD,
    async () => {
      await customElements.whenDefined("atproto-comments");
      const e = document.createElement("atproto-comments");
      e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/A");
      e.setAttribute("lang", "pt");
      e.strings = { comment: "K" };
      document.body.append(e);
      await sleep(200);
      return { calls: __calls, ...state() };
    },
    { calls: ["1:A"], ...shownA, mainBtn: ["K"] }],
  ["nunca insertado, e insertado y quitado en la misma tarea", MOD,
    async () => {
      await customElements.whenDefined("atproto-comments");
      const a = document.createElement("atproto-comments");
      a.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/A");
      const b = document.createElement("atproto-comments");
      b.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/B");
      document.body.append(b);
      b.remove();
      await sleep(200);
      return { calls: __calls };
    },
    { calls: [] }],
  ["desconectar durante la carga y reconectar", `<div id=h></div>${MOD}`,
    async () => {
      await customElements.whenDefined("atproto-comments");
      __delay.A = 300;
      const e = document.createElement("atproto-comments");
      e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/A");
      h.append(e);
      await sleep(50);
      e.remove();
      await sleep(400);
      const afterRemove = { calls: [...__calls], aborted: [...__aborted], children: e.childElementCount };
      __delay.A = 50;
      h.append(e);
      await sleep(200);
      return { afterRemove, calls: __calls, ...state() };
    },
    { afterRemove: { calls: ["1:A"], aborted: ["1:A"], children: 0 }, calls: ["1:A", "2:A"], ...shownA }],
  ["mover con el hilo cargado", `<div id=a></div><div id=b></div>${MOD}`,
    async () => {
      await customElements.whenDefined("atproto-comments");
      const e = document.createElement("atproto-comments");
      e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/A");
      a.append(e);
      await sleep(200);
      b.append(e);
      a.append(e);
      await sleep(200);
      return { calls: __calls, ...state() };
    },
    { calls: ["1:A"], ...shownA }],
  ["cambiar thread-uri: el hilo anterior desaparece al empezar la carga", `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    async () => {
      await sleep(200);
      __delay.B = 300;
      document.querySelector("atproto-comments").setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/B");
      await sleep(50);
      const during = state();
      await sleep(400);
      return { during, calls: __calls, ...state() };
    },
    { during: { replies: [], lists: 0, mainBtn: [], error: 0 }, calls: ["1:A", "2:B"], replies: ["reply-of-B"], lists: 1 }],
  ["respuesta tardía del hilo anterior", `<atproto-comments></atproto-comments>${MOD}`,
    async () => {
      await customElements.whenDefined("atproto-comments");
      __delay.A = 500;
      __delay.B = 50;
      const e = document.querySelector("atproto-comments");
      e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/A");
      await sleep(20);
      e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/B");
      await sleep(700);
      return { calls: __calls, aborted: __aborted, ...state() };
    },
    { calls: ["1:A", "2:B"], aborted: ["1:A"], replies: ["reply-of-B"], lists: 1 }],
  ["A → B → A durante la carga", `<atproto-comments></atproto-comments>${MOD}`,
    async () => {
      await customElements.whenDefined("atproto-comments");
      __delay.A = 400;
      __delay.B = 400;
      const e = document.querySelector("atproto-comments");
      const set = (x) => e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/" + x);
      set("A"); await sleep(20);
      set("B"); await sleep(20);
      set("A"); await sleep(700);
      return { calls: __calls, aborted: __aborted, ...state() };
    },
    { calls: ["1:A", "2:B", "3:A"], aborted: ["1:A", "2:B"], ...shownA }],
  ["thread-uri inválido durante la carga", `<atproto-comments thread-uri="${U("A")}"></atproto-comments>`,
    async () => {
      __delay.A = 300;
      const s = document.createElement("script");
      s.type = "module";
      s.src = "index.js";
      document.body.append(s);
      await customElements.whenDefined("atproto-comments");
      await sleep(30);
      document.querySelector("atproto-comments").setAttribute("thread-uri", "nada");
      await sleep(500);
      return { calls: __calls, aborted: __aborted, ...state() };
    },
    { calls: ["1:A"], aborted: ["1:A"], replies: [], lists: 0, mainBtn: [], error: 1 }],
  ["quitar thread-uri", `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    async () => {
      await sleep(200);
      document.querySelector("atproto-comments").removeAttribute("thread-uri");
      await sleep(100);
      return { calls: __calls, ...state() };
    },
    { calls: ["1:A"], replies: [], lists: 0, mainBtn: [], error: 1 }],
  ["cambiar lang de en a pt sin red", `<atproto-comments lang="en" thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    async () => {
      await sleep(200);
      const before = state().mainBtn;
      document.querySelector("atproto-comments").setAttribute("lang", "pt");
      await sleep(100);
      return { before, calls: __calls, ...state(), replyBtn: document.querySelector(".atproto-reply .atproto-app-btn").textContent };
    },
    { before: ["Comment"], calls: ["1:A"], ...shownA, mainBtn: ["Comentar"], replyBtn: "Responder" }],
  ["cambiar strings durante la carga", `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    async () => {
      __delay.A = 300;
      await customElements.whenDefined("atproto-comments");
      await sleep(30);
      document.querySelector("atproto-comments").strings = { comment: "NUEVO" };
      await sleep(500);
      return { calls: __calls, ...state() };
    },
    { calls: ["1:A"], ...shownA, mainBtn: ["NUEVO"] }],
  ["contenido propio de la página se conserva", `<atproto-comments thread-uri="${U("A")}"><p id=mine>mío</p></atproto-comments>${MOD}`,
    async () => {
      await sleep(200);
      const e = document.querySelector("atproto-comments");
      e.setAttribute("lang", "pt");
      await sleep(100);
      e.setAttribute("thread-uri", "at://did:plc:root/app.bsky.feed.post/B");
      await sleep(200);
      return { p: !!e.querySelector("#mine"), first: e.firstElementChild.id, ...state() };
    },
    { p: true, first: "mine", replies: ["reply-of-B"], lists: 1, mainBtn: ["Comentar"] }],
  ["strings asignada antes de registrar el elemento", `<atproto-comments thread-uri="${U("A")}"></atproto-comments><script>document.querySelector('atproto-comments').strings={comment:'Kommentieren'}</script>${MOD}`,
    async () => { await sleep(200); return { calls: __calls, ...state() }; },
    { calls: ["1:A"], ...shownA, mainBtn: ["Kommentieren"] }],
  ["la propiedad gana al atributo, y strings = undefined vuelve al atributo", `<atproto-comments thread-uri="${U("A")}" strings='{"comment":"A"}'></atproto-comments>${MOD}`,
    async () => {
      await customElements.whenDefined("atproto-comments");
      const e = document.querySelector("atproto-comments");
      e.strings = { comment: "B" };
      await sleep(200);
      const withProp = state().mainBtn;
      e.strings = undefined;
      await sleep(50);
      return { withProp, calls: __calls, ...state() };
    },
    { withProp: ["B"], calls: ["1:A"], mainBtn: ["A"] }],
  ["modo de respaldo: panel abierto, cambio de lang y clic fuera", `<atproto-comments thread-uri="${U("A")}"></atproto-comments>${MOD}`,
    async () => {
      await sleep(200);
      const e = document.querySelector("atproto-comments");
      const btn0 = e.querySelector(".atproto-app-btn--xl");
      const pop0 = btn0.parentElement.querySelector(".atproto-app-popover--fallback");
      btn0.click();
      const opened = !pop0.hidden;
      e.setAttribute("lang", "pt");
      await sleep(50);
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      const oldClosed = pop0.hidden && !pop0.isConnected;
      const btn = e.querySelector(".atproto-app-btn--xl");
      btn.click();
      const reopened = !btn.parentElement.querySelector(".atproto-app-popover--fallback").hidden;
      return { opened, oldClosed, reopened, btn: btn.textContent };
    },
    { opened: true, oldClosed: true, reopened: true, btn: "Comentar" },
    () => { delete HTMLElement.prototype.popover; }],

  ["URL de la petición: appview sin barra final y max-depth", `<atproto-comments ${ATTRS}></atproto-comments>${MOD}`,
    async () => { await sleep(200); return { urls: window.__urls }; },
    { urls: ["https://x.example/xrpc/app.bsky.feed.getPostThread?uri=at%3A%2F%2Fdid%3Aplc%3Aroot%2Fapp.bsky.feed.post%2FA&depth=4&parentHeight=0"] }],
];

export const scenarios = RAW.map(([name, body, evaluate, expected, init]) => ({ name, body, evaluate, expected, init }));
