// The app picker (a modal <dialog> per element), driven with real clicks and
// keys. Scenarios of the app-chooser spec.

import { CSS_LINK, MOD, replyView, threadView, U, withThread } from "./harness.mjs";

const PREF = "atproto-preferred-app";
const pref = (domain) => `try { localStorage.setItem(${JSON.stringify(PREF)}, ${JSON.stringify(domain)}); } catch {}`;
const ANA = threadView("P", [
  replyView("ana", { author: { did: "did:plc:ana", handle: "ana.example", displayName: "Ana" } }),
  replyView("bea", { author: { did: "did:plc:bea", handle: "bea.example", displayName: "Bea" } }),
]);
const THREAD = withThread("P", ANA);
const BODY = (attrs = "") =>
  `${CSS_LINK}<div style="height:3000px"><atproto-comments thread-uri="${U("P")}" ${attrs}></atproto-comments></div>${MOD}`;

const ORDER = ["Bluesky", "Anisota", "Blacksky", "Deer", "Impro", "Mu", "Northsky", "Red Dwarf"];
const COMMENT = "atproto-comments > .atproto-app-action .atproto-app-btn--xl";
const REPLY = ".atproto-reply .atproto-app-btn";
const SHEET = "dialog.atproto-app-sheet";

/** Snapshot of the picker. */
const sheet = (page) =>
  page.evaluate((sel) => {
    const d = document.querySelector(sel);
    if (!d) return { exists: false, open: false };
    const q = (s) => d.querySelector(s);
    const input = q(".atproto-app-sheet__input");
    return {
      open: d.open,
      title: q(".atproto-app-sheet__title").textContent,
      apps: [...d.querySelectorAll(".atproto-app-sheet__name")].map((n) => n.textContent),
      lastUsed: [...d.querySelectorAll(".atproto-app-sheet__app--last-used .atproto-app-sheet__name")].map((n) => n.textContent),
      badges: [...d.querySelectorAll(".atproto-app-sheet__badge")].map((n) => n.textContent),
      input: input.value,
      note: q(".atproto-app-sheet__note")?.textContent ?? null,
      focusInside: d.contains(document.activeElement),
    };
  }, SHEET);

const ready = (page) => page.waitForSelector(".atproto-reply");
const settle = (page) => page.waitForTimeout(100);
/** The element focused, as a short description. */
const focused = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.tagName.toLowerCase()}.${[...a.classList].join(".")}` : null;
  });
/** Keeps the next link click from navigating; its handlers still run. */
const noNavigate = (page) =>
  page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), { once: true }));
const stored = (page) => page.evaluate((k) => { try { return localStorage.getItem(k); } catch { return "blocked"; } }, PREF);

async function open(page, selector = COMMENT) {
  await page.click(selector);
  await settle(page);
}

export const scenarios = [
  {
    name: "Comentar: cabecera «Comment in…», lista y campo; la página no navega",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      const url = page.url();
      await open(page);
      const s = await sheet(page);
      return { ...s, sameUrl: page.url() === url, hasInput: s.input === "" };
    },
    expected: { open: true, title: "Comment in…", apps: ORDER, lastUsed: [], badges: [], hasInput: true, note: null, focusInside: true, sameUrl: true },
  },
  {
    name: "Responder: cabecera «Reply to Ana in…»",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await open(page, REPLY);
      return sheet(page);
    },
    expected: { open: true, title: "Reply to Ana in…", apps: ORDER },
  },
  {
    name: "preferencia previa: Deer la primera, con «Last used», sin repetirse",
    body: BODY(),
    init: THREAD + pref("deer.social"),
    run: async (page) => {
      await ready(page);
      await open(page);
      return { ...(await sheet(page)), focus: await focused(page) };
    },
    expected: {
      apps: ["Deer", ...ORDER.filter((n) => n !== "Deer")],
      lastUsed: ["Deer"],
      badges: ["Last used"],
      input: "",
      focus: "a.atproto-app-sheet__app.atproto-app-sheet__app--last-used",
    },
  },
  {
    name: "preferencia de dominio personalizado: prellenado, orden habitual",
    body: BODY(),
    init: THREAD + pref("app.example"),
    run: async (page) => {
      await ready(page);
      await open(page);
      return sheet(page);
    },
    expected: { apps: ORDER, lastUsed: [], input: "app.example" },
  },
  {
    name: "preferencia guardada por la 1.x (Mu): la primera, con «Last used»",
    body: BODY(),
    init: THREAD + pref("mu.social"),
    run: async (page) => {
      await ready(page);
      await open(page);
      return sheet(page);
    },
    expected: { apps: ["Mu", ...ORDER.filter((n) => n !== "Mu")], lastUsed: ["Mu"] },
  },
  {
    name: "elegir una app: href, preferencia guardada, panel cerrado y foco en el botón",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await open(page, REPLY);
      const deer = page.locator(`${SHEET} .atproto-app-sheet__app`, { hasText: "Deer" });
      const href = await deer.getAttribute("href");
      const attrs = await deer.evaluate((a) => `${a.target} ${a.rel}`);
      await noNavigate(page);
      await deer.click();
      await settle(page);
      return { href, attrs, pref: await stored(page), open: (await sheet(page)).open, focus: await focused(page) };
    },
    expected: {
      href: "https://deer.social/profile/did:plc:ana/post/ana",
      attrs: "_blank noopener noreferrer",
      pref: "deer.social",
      open: false,
      focus: "button.atproto-app-btn",
    },
  },
  {
    name: "dominio válido con Enter: abre el post en él y cierra",
    body: BODY(),
    init: THREAD + "window.open = (...a) => { window.__opened = a; };",
    run: async (page) => {
      await ready(page);
      await open(page);
      await page.fill(`${SHEET} .atproto-app-sheet__input`, "  App.Example/ ");
      await page.press(`${SHEET} .atproto-app-sheet__input`, "Enter");
      await settle(page);
      return { opened: await page.evaluate(() => window.__opened), pref: await stored(page), open: (await sheet(page)).open };
    },
    expected: {
      opened: ["https://app.example/profile/did:plc:root/post/P", "_blank", "noopener,noreferrer"],
      pref: "app.example",
      open: false,
    },
  },
  {
    name: "dominio inválido: mensaje, aria-invalid y panel abierto; corregido, se abre",
    body: BODY(),
    init: THREAD + "window.open = (...a) => { window.__opened = a; };",
    run: async (page) => {
      await ready(page);
      await open(page);
      const input = `${SHEET} .atproto-app-sheet__input`;
      await page.fill(input, "not a domain");
      await page.click(`${SHEET} .atproto-app-sheet__go`);
      await settle(page);
      const invalid = await page.$eval(input, (i) => ({ msg: i.validationMessage, aria: i.getAttribute("aria-invalid") }));
      const stillOpen = (await sheet(page)).open;
      const openedBefore = await page.evaluate(() => window.__opened ?? null);
      await page.fill(input, "deer.social");
      const cleared = await page.$eval(input, (i) => ({ msg: i.validationMessage, aria: i.getAttribute("aria-invalid") }));
      await page.click(`${SHEET} .atproto-app-sheet__go`);
      await settle(page);
      return { invalid, stillOpen, openedBefore, cleared, opened: (await page.evaluate(() => window.__opened))[0] };
    },
    expected: {
      invalid: { msg: "Invalid domain", aria: "true" },
      stillOpen: true,
      openedBefore: null,
      cleared: { msg: "", aria: null },
      opened: "https://deer.social/profile/did:plc:root/post/P",
    },
  },
  {
    name: "cierre con Escape, con el botón de cerrar y al pulsar fuera; el foco vuelve al botón",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      const r = {};
      await open(page);
      await page.keyboard.press("Escape");
      await settle(page);
      r.escape = [(await sheet(page)).open, await focused(page)];
      await open(page, REPLY);
      await page.click(`${SHEET} .atproto-app-sheet__close`);
      await settle(page);
      r.close = [(await sheet(page)).open, await focused(page)];
      await open(page);
      // Top-left corner of the viewport: on the backdrop, above the panel.
      await page.mouse.click(5, 5);
      await settle(page);
      r.outside = [(await sheet(page)).open, await focused(page)];
      // A click inside the panel, beside the centred column, does not close it.
      await page.setViewportSize({ width: 1440, height: 800 });
      await open(page);
      const box = await page.locator(SHEET).boundingBox();
      await page.mouse.click(box.x + 5, box.y + box.height - 5);
      await settle(page);
      r.besideColumn = (await sheet(page)).open;
      return r;
    },
    expected: {
      escape: [false, "button.atproto-app-btn.atproto-app-btn--xl"],
      close: [false, "button.atproto-app-btn"],
      outside: [false, "button.atproto-app-btn.atproto-app-btn--xl"],
      besideColumn: true,
    },
  },
  {
    name: "sigue abierto tras scroll y resize",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await open(page);
      await page.evaluate(() => { window.scrollTo(0, 500); window.dispatchEvent(new Event("scroll")); });
      await settle(page);
      await page.setViewportSize({ width: 600, height: 500 });
      await settle(page);
      return sheet(page);
    },
    expected: { open: true },
  },
  {
    name: "clic en otro «Reply» con el panel abierto: solo cierra",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await open(page, REPLY);
      await page.locator(REPLY).nth(1).click({ force: true });
      await settle(page);
      const afterFirst = (await sheet(page)).open;
      await open(page, `${REPLY} >> nth=1`);
      const s = await sheet(page);
      return { afterFirst, open: s.open, title: s.title };
    },
    expected: { afterFirst: false, open: true, title: "Reply to Bea in…" },
  },
  {
    name: "un solo panel: con dos elementos, el otro no responde mientras está abierto",
    body: `${CSS_LINK}<atproto-comments id="a" thread-uri="${U("P")}"></atproto-comments><atproto-comments id="b" thread-uri="${U("P")}"></atproto-comments>${MOD}`,
    init: THREAD,
    run: async (page) => {
      // Tall enough for the panel to leave B's button uncovered, on the backdrop.
      await page.setViewportSize({ width: 800, height: 1600 });
      await page.waitForSelector("#b .atproto-reply");
      await open(page, "#a > .atproto-app-action .atproto-app-btn");
      const inert = await page.evaluate(() => {
        const b = document.querySelector("#b > .atproto-app-action .atproto-app-btn");
        const r = b.getBoundingClientRect();
        return document.elementFromPoint(r.x + 2, r.y + 2) !== b;
      });
      await page.click("#b > .atproto-app-action .atproto-app-btn", { force: true });
      await settle(page);
      const opened = await page.$$eval("dialog.atproto-app-sheet", (ds) => ds.filter((d) => d.open).length);
      return { inert, open: opened };
    },
    expected: { inert: true, open: 0 },
  },
  {
    name: "pickerNote vacía: sin nodo; personalizada: entre la cabecera y la lista",
    body: BODY(`strings='{"pickerNote":"Necesitas una cuenta para responder."}'`),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await open(page);
      const custom = await page.$eval(SHEET, (d) => {
        const note = d.querySelector(".atproto-app-sheet__note");
        return { text: note.textContent, before: note.previousElementSibling.className, after: note.nextElementSibling.className };
      });
      await page.keyboard.press("Escape");
      await page.evaluate(() => document.querySelector("atproto-comments").removeAttribute("strings"));
      await settle(page);
      await open(page);
      return { custom, empty: (await sheet(page)).note };
    },
    expected: {
      custom: { text: "Necesitas una cuenta para responder.", before: "atproto-app-sheet__header", after: "atproto-app-sheet__list" },
      empty: null,
    },
  },
  {
    name: "nombres accesibles: diálogo, cerrar, «Other app» y «Open»",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await open(page, REPLY);
      return {
        dialog: await page.getByRole("dialog", { name: "Reply to Ana in…" }).count(),
        modal: await page.$eval(SHEET, (d) => d.matches(":modal")),
        close: await page.getByRole("button", { name: "Close" }).count(),
        input: await page.getByRole("textbox", { name: "Other app" }).count(),
        go: await page.getByRole("button", { name: "Open" }).count(),
        inputAria: await page.$eval(`${SHEET} .atproto-app-sheet__input`, (i) => i.getAttribute("aria-label")),
      };
    },
    expected: { dialog: 1, modal: true, close: 1, input: 1, go: 1, inputAria: null },
  },
  {
    name: "botones: aria-haspopup=\"dialog\" y sin aria-expanded, antes y después de abrir",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      const attrs = () =>
        page.$$eval(".atproto-app-btn", (bs) => bs.map((b) => [b.getAttribute("aria-haspopup"), b.hasAttribute("aria-expanded"), b.hasAttribute("popovertarget") || b.hasAttribute("aria-controls")]));
      const before = await attrs();
      await open(page);
      const during = await attrs();
      return { before, during, count: before.length };
    },
    expected: {
      before: [["dialog", false, false], ["dialog", false, false], ["dialog", false, false]],
      during: [["dialog", false, false], ["dialog", false, false], ["dialog", false, false]],
    },
  },
  {
    name: "teclado: Enter abre, el foco entra y Tab no sale del panel",
    body: BODY(),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await page.focus(COMMENT);
      await page.keyboard.press("Enter");
      await settle(page);
      const first = await focused(page);
      const outside = [];
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate((sel) => document.querySelector(sel).contains(document.activeElement), SHEET);
        if (!inside) outside.push(await focused(page));
      }
      return { first, outside: outside.filter((f) => f !== "body.") };
    },
    expected: { first: "a.atproto-app-sheet__app", outside: [] },
  },
  {
    name: "se cierra al cambiar thread-uri y lang, y al quitar el elemento; la página vuelve a responder",
    body: `${BODY()}<button id="page-btn" style="position:fixed;top:0;left:0" onclick="window.__pageClicks=(window.__pageClicks||0)+1">page</button>`,
    init: THREAD + withThread("Q", threadView("Q", [replyView("q1")])),
    run: async (page) => {
      await ready(page);
      const r = {};
      await open(page);
      await page.evaluate((u) => document.querySelector("atproto-comments").setAttribute("thread-uri", u), U("Q"));
      await settle(page);
      r.threadUri = (await sheet(page)).open;
      await page.waitForSelector(".atproto-reply");
      await open(page);
      await page.evaluate(() => document.querySelector("atproto-comments").setAttribute("lang", "pt"));
      await settle(page);
      r.lang = (await sheet(page)).open;
      await open(page);
      r.ptTitle = (await sheet(page)).title;
      r.ptClose = await page.$eval(`${SHEET} .atproto-app-sheet__close`, (b) => b.getAttribute("aria-label"));
      const el = await page.evaluateHandle(() => document.querySelector("atproto-comments"));
      await page.evaluate((e) => e.remove(), el);
      await settle(page);
      r.removedOpen = await page.evaluate((e) => e.querySelector("dialog").open, el);
      await page.click("#page-btn", { timeout: 2000 });
      r.pageClicks = await page.evaluate(() => window.__pageClicks);
      // Inserted again, it does not come back open.
      await page.evaluate((e) => document.body.append(e), el);
      await settle(page);
      r.reinsertedOpen = await page.evaluate((e) => e.querySelector("dialog").open, el);
      return r;
    },
    expected: {
      threadUri: false,
      lang: false,
      ptTitle: "Comentar em…",
      ptClose: "Fechar",
      removedOpen: false,
      pageClicks: 1,
      reinsertedOpen: false,
    },
  },
  {
    name: "autor con nombre vacío y sin handle: «Reply to Unknown in…», como el byline",
    body: BODY(),
    init: withThread("P", threadView("P", [replyView("anon", { author: { did: "did:plc:anon", displayName: "", handle: undefined } })])),
    run: async (page) => {
      await ready(page);
      const aria = await page.getAttribute(REPLY, "aria-label");
      await open(page, REPLY);
      return { aria, title: (await sheet(page)).title, byline: await page.textContent(".atproto-reply__author") };
    },
    expected: { aria: "Reply to Unknown", title: "Reply to Unknown in…", byline: "Unknown" },
  },
  {
    name: "foco tras cerrar por re-render: al «Comment» nuevo, o al elemento mientras carga",
    body: BODY(),
    init: THREAD + withThread("Q", threadView("Q", [replyView("q1")])) + "window.__delay = { Q: 400 };",
    run: async (page) => {
      await ready(page);
      const r = {};
      await open(page, REPLY);
      await page.evaluate(() => document.querySelector("atproto-comments").setAttribute("lang", "pt"));
      await settle(page);
      r.afterLang = await focused(page);
      r.isNewMain = await page.evaluate(() => document.activeElement === document.querySelector("atproto-comments > .atproto-app-action .atproto-app-btn--xl"));
      await open(page);
      await page.evaluate((u) => document.querySelector("atproto-comments").setAttribute("thread-uri", u), U("Q"));
      await settle(page);
      r.whileLoading = await page.evaluate(() => {
        const e = document.querySelector("atproto-comments");
        return [document.activeElement === e, e.getAttribute("tabindex")];
      });
      await page.evaluate(() => document.activeElement.blur());
      r.tabindexAfterBlur = await page.getAttribute("atproto-comments", "tabindex");
      return r;
    },
    expected: {
      afterLang: "button.atproto-app-btn.atproto-app-btn--xl",
      isNewMain: true,
      whileLoading: [true, "-1"],
      tabindexAfterBlur: null,
    },
  },
  {
    name: "replyIn personalizado con {name}",
    body: BODY(`strings='{"replyIn":"Responder a {name} con&#8230;"}'`),
    init: THREAD,
    run: async (page) => {
      await ready(page);
      await open(page, REPLY);
      return sheet(page);
    },
    expected: { title: "Responder a Ana con…" },
  },
  {
    name: "almacenamiento bloqueado: el panel funciona y no recuerda la app",
    body: BODY(),
    init: THREAD + `Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });`,
    run: async (page) => {
      await ready(page);
      await open(page);
      const deer = page.locator(`${SHEET} .atproto-app-sheet__app`, { hasText: "Deer" });
      const href = await deer.getAttribute("href");
      await noNavigate(page);
      await deer.click();
      await settle(page);
      const closed = !(await sheet(page)).open;
      await open(page);
      const s = await sheet(page);
      return { href, closed, apps: s.apps, lastUsed: s.lastUsed };
    },
    expected: {
      href: "https://deer.social/profile/did:plc:root/post/P",
      closed: true,
      apps: ORDER,
      lastUsed: [],
    },
  },
];
