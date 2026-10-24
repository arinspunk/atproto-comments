/**
 * @module
 * The `AtprotoComments` class without registering any tag. Use it to register
 * the element under another name; import the package root to get
 * `<atproto-comments>` registered for you.
 *
 * @example
 * ```js
 * import { AtprotoComments } from "atproto-comments/element";
 * customElements.define("my-comments", AtprotoComments);
 * ```
 */

import {
  buildStrings,
  parseStringsAttr,
  resolveLang,
  resolveLocale,
  type ResolvedStrings,
  type StringKey,
  translate,
  type UiStrings,
} from "./i18n.ts";

import { bylineParts } from "./byline.ts";
import { formatAbsoluteDate, formatRelativeTime, isValidDate } from "./date.ts";
import { createScheduler, dataKey, isInvalidKey, nextStep } from "./lifecycle.ts";
import { readPref, writePref } from "./pref.ts";
import { facetSegments, getInitials, normalizeDomain } from "./text.ts";
import { hiddenUris, isReplyHidden, sortedReplies } from "./thread.ts";
import type { PostRecord, ProfileViewBasic, ThreadViewPost } from "./types.ts";

export type { StringKey, UiStrings } from "./i18n.ts";

// --- i18n ---

/** Resolved UI strings plus the BCP 47 locale used for date formatting. */
interface Loc {
  strings: ResolvedStrings;
  locale: string;
}

const KNOWN_APPS = [
  { label: "Bluesky", domain: "bsky.app" },
  { label: "Mu", domain: "mu.social" },
  { label: "Deer", domain: "deer.social" },
];
const KNOWN_DOMAINS = new Set(KNOWN_APPS.map((a) => a.domain));
const DEFAULT_APPVIEW = "https://public.api.bsky.app";
const DEFAULT_MAX_DEPTH = 6;

let popoverSupport: boolean | undefined;

/** Whether the browser has the Popover API. Checked lazily so the module loads without the DOM. */
function supportsPopover(): boolean {
  return (popoverSupport ??= "popover" in HTMLElement.prototype);
}

/** A link that opens in the visitor's preferred app. */
interface AppLink {
  path: string;
  /** Any preferred app, custom domains included; otherwise only one of KNOWN_APPS. */
  anyApp: boolean;
}

const appLinks = new WeakMap<HTMLAnchorElement, AppLink>();

/**
 * Origin of the preferred app, or bsky.app without one. Routes that not every
 * app may have (hashtags) pass `anyApp = false`, so a custom domain falls back
 * to bsky.app too.
 */
function appBase(anyApp: boolean): string {
  const pref = readPref();
  return `https://${pref && (anyApp || KNOWN_DOMAINS.has(pref)) ? pref : "bsky.app"}`;
}

/** Points `a` at `link.path` in the preferred app, and keeps it up to date (see refreshAppLink). */
function setAppLink(a: HTMLAnchorElement, link: AppLink): void {
  appLinks.set(a, link);
  a.href = appBase(link.anyApp) + link.path;
}

/**
 * Re-resolves a preferred-app link right before it is used, since the visitor
 * may have picked another app after it was rendered. Runs on pointerdown (click,
 * middle click, context menu), focusin (keyboard) and click.
 */
function refreshAppLink(e: Event): void {
  const a = e.target instanceof Element ? e.target.closest("a") : null;
  const link = a ? appLinks.get(a) : undefined;
  if (a && link) a.href = appBase(link.anyApp) + link.path;
}

function buildFacetedText(record: PostRecord): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const segment of facetSegments(record)) {
    if (segment.href === undefined && segment.mention === undefined && segment.tag === undefined) {
      fragment.appendChild(document.createTextNode(segment.text));
      continue;
    }
    const a = document.createElement("a");
    if (segment.mention !== undefined) setAppLink(a, { path: `/profile/${segment.mention}`, anyApp: true });
    else if (segment.tag !== undefined) setAppLink(a, { path: `/hashtag/${encodeURIComponent(segment.tag)}`, anyApp: false });
    else a.href = segment.href!;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    a.textContent = segment.text;
    fragment.appendChild(a);
  }
  return fragment;
}

// --- DOM builders ---

function buildPlaceholder(author: ProfileViewBasic): HTMLElement {
  const div = document.createElement("div");
  div.className = "atproto-reply__avatar atproto-reply__avatar--placeholder";
  div.textContent = getInitials(author.displayName, author.handle);
  return div;
}

function buildAvatarWrap(author: ProfileViewBasic): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "atproto-reply__avatar-wrap";
  if (author.avatar) {
    const img = document.createElement("img");
    img.className = "atproto-reply__avatar";
    img.src = author.avatar;
    img.alt = "";
    img.loading = "lazy";
    img.width = 32;
    img.height = 32;
    img.onerror = () => img.replaceWith(buildPlaceholder(author));
    wrap.appendChild(img);
  } else {
    wrap.appendChild(buildPlaceholder(author));
  }
  return wrap;
}

let popoverCounter = 0;

/** `close` of the open fallback panel. At most one is open at a time. */
let openFallback: (() => void) | null = null;

function buildAppPopover(
  targetDid: string,
  targetRkey: string,
  popoverId: string,
  loc: Loc,
  close: () => void,
): HTMLElement {
  const preferred = readPref();
  const popover = document.createElement("div");
  popover.id = popoverId;
  popover.className = "atproto-app-popover";
  if (supportsPopover()) {
    popover.setAttribute("popover", "");
  } else {
    // Without the Popover API the attribute is unknown and would not hide the panel.
    popover.hidden = true;
    popover.classList.add("atproto-app-popover--fallback");
  }

  const t = (k: StringKey) => translate(loc.strings, k);

  for (const app of KNOWN_APPS) {
    const a = document.createElement("a");
    a.href = `https://${app.domain}/profile/${targetDid}/post/${targetRkey}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = app.label;
    a.className = "atproto-app-popover__link" +
      (preferred === app.domain ? " atproto-app-popover__link--active" : "");
    a.addEventListener("click", () => {
      writePref(app.domain);
      close();
    });
    popover.appendChild(a);
  }

  const separator = document.createElement("div");
  separator.className = "atproto-app-popover__separator";
  separator.textContent = t("otherApp");
  popover.appendChild(separator);

  const customWrap = document.createElement("div");
  customWrap.className = "atproto-app-popover__custom";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = t("inputPlaceholder");
  input.setAttribute("aria-label", t("otherApp"));
  // A domain, not prose: keep the mobile keyboard from capitalizing or correcting it.
  input.inputMode = "url";
  input.autocapitalize = "off";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.className = "atproto-app-popover__input";
  if (preferred && !KNOWN_DOMAINS.has(preferred)) input.value = preferred;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "atproto-app-popover__go";
  btn.setAttribute("aria-label", t("go"));
  // The arrow is decoration; the button's name comes from `go`.
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  btn.appendChild(arrow);

  function clearInvalid() {
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  }

  function openCustom() {
    clearInvalid();
    const domain = normalizeDomain(input.value);
    if (!domain) {
      // The browser shows and announces the message; reportValidity() also focuses
      // the input, so the panel stays open on scroll or resize.
      input.setCustomValidity(t("invalidDomain"));
      input.setAttribute("aria-invalid", "true");
      input.reportValidity();
      return;
    }
    writePref(domain);
    window.open(`https://${domain}/profile/${targetDid}/post/${targetRkey}`, "_blank", "noopener,noreferrer");
    close();
  }

  btn.addEventListener("click", openCustom);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") openCustom(); });
  input.addEventListener("input", clearInvalid);

  customWrap.appendChild(input);
  customWrap.appendChild(btn);
  popover.appendChild(customWrap);

  return popover;
}

function buildAppButton(label: string, popoverId: string, extraClass?: string, ariaLabel?: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute(supportsPopover() ? "popovertarget" : "aria-controls", popoverId);
  btn.setAttribute("aria-expanded", "false");
  btn.className = "atproto-app-btn" + (extraClass ? ` ${extraClass}` : "");
  btn.textContent = label;
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  return btn;
}

function buildAppAction(
  label: string,
  targetDid: string,
  targetRkey: string,
  loc: Loc,
  btnClass?: string,
  ariaLabel?: string,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "atproto-app-action";

  const id = `atproto-pop-${++popoverCounter}`;
  const btn = buildAppButton(label, id, btnClass, ariaLabel);
  let close: () => void;
  const popover = buildAppPopover(targetDid, targetRkey, id, loc, () => close());

  let onViewportChange: (() => void) | null = null;

  // Shared by both modes; the panel must already be visible so it can be measured.
  function onOpen() {
    const preferred = readPref();
    for (const a of popover.querySelectorAll<HTMLAnchorElement>(".atproto-app-popover__link")) {
      let hostname = "";
      try { hostname = new URL(a.href).hostname; } catch { /* ignore */ }
      a.classList.toggle("atproto-app-popover__link--active", hostname === preferred);
    }
    const input = popover.querySelector<HTMLInputElement>(".atproto-app-popover__input");
    if (input) {
      input.value = preferred && !KNOWN_DOMAINS.has(preferred) ? preferred : "";
      input.setCustomValidity("");
      input.removeAttribute("aria-invalid");
    }

    const rect = btn.getBoundingClientRect();
    const gap = 4;
    const height = popover.offsetHeight;
    const popoverWidth = popover.offsetWidth || 160;
    let top = rect.bottom + gap;
    if (rect.bottom + gap + height > window.innerHeight && rect.top - gap - height >= 0) {
      top = rect.top - gap - height;
    }
    popover.style.margin = "0";
    popover.style.top = `${top}px`;
    const left = Math.min(rect.left, window.innerWidth - popoverWidth - gap);
    popover.style.left = `${Math.max(gap, left)}px`;

    // The virtual keyboard scrolls or resizes the page when the input gets focus;
    // that must not close the panel while the visitor is typing.
    onViewportChange = () => {
      if (!popover.contains(document.activeElement)) close();
    };
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    btn.setAttribute("aria-expanded", "true");
  }

  function onClose() {
    if (onViewportChange) {
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    }
    onViewportChange = null;
    btn.setAttribute("aria-expanded", "false");
  }

  if (supportsPopover()) {
    close = () => (popover as HTMLElement & { hidePopover?: () => void }).hidePopover?.();
    popover.addEventListener("toggle", (e) => {
      const te = e as ToggleEvent;
      if (te.newState === "open") onOpen();
      else if (te.newState === "closed") onClose();
    });
  } else {
    // A panel removed from the DOM while open closes on the next event it receives,
    // so no document listener outlives it.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!popover.isConnected || (!popover.contains(target) && !btn.contains(target))) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!popover.isConnected) {
        close();
      } else if (e.key === "Escape") {
        close();
        btn.focus();
      }
    };

    const open = () => {
      openFallback?.();
      popover.hidden = false;
      onOpen();
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("keydown", onKeyDown, true);
      openFallback = close;
    };

    close = () => {
      if (popover.hidden) return;
      popover.hidden = true;
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      onClose();
      if (openFallback === close) openFallback = null;
    };

    btn.addEventListener("click", () => (popover.hidden ? open() : close()));
  }

  wrap.appendChild(btn);
  wrap.appendChild(popover);
  return wrap;
}

function renderError(loc: Loc): HTMLElement {
  const div = document.createElement("div");
  div.className = "atproto-comments__error";
  div.setAttribute("role", "status");
  div.textContent = translate(loc.strings, "error");
  return div;
}

function renderReply(view: ThreadViewPost, hidden: Set<string>, loc: Loc): HTMLElement | null {
  if (view.$type !== "app.bsky.feed.defs#threadViewPost") return null;
  if (isReplyHidden(view.post, hidden)) return null;

  const post = view.post ?? {};
  const author = post.author ?? {};
  const record = post.record ?? {};

  const li = document.createElement("li");
  const item = document.createElement("article");
  item.className = "atproto-reply";
  li.appendChild(item);

  item.appendChild(buildAvatarWrap(author));

  const content = document.createElement("div");
  content.className = "atproto-reply__content";

  const header = document.createElement("header");
  header.className = "atproto-reply__header";

  const parts = bylineParts(author, translate(loc.strings, "unknownAuthor"));
  const byline = document.createElement("span");
  byline.className = "atproto-reply__byline";

  const name = document.createElement("b");
  name.className = "atproto-reply__author";
  name.textContent = parts.name;
  byline.appendChild(name);

  if (parts.handle !== null) {
    const handle = document.createElement("span");
    handle.className = "atproto-reply__handle";
    handle.textContent = parts.handle;
    byline.append(parts.separator, handle);
  }

  header.appendChild(byline);

  if (isValidDate(record.createdAt)) {
    const time = document.createElement("time");
    time.className = "atproto-reply__time";
    time.dateTime = record.createdAt;
    time.textContent = formatRelativeTime(record.createdAt, loc.strings, loc.locale);
    time.title = formatAbsoluteDate(record.createdAt, loc.locale);
    header.appendChild(time);
  }

  content.appendChild(header);

  const body = document.createElement("p");
  body.className = "atproto-reply__text";
  body.appendChild(buildFacetedText(record));
  content.appendChild(body);

  const authorDid = author.did ?? "";
  const replyRkey = post.uri?.split("/").pop() ?? "";
  const replyAria = translate(loc.strings, "replyTo", { name: author.displayName ?? author.handle ?? "" });
  content.appendChild(buildAppAction(translate(loc.strings, "reply"), authorDid, replyRkey, loc, undefined, replyAria));

  const loadedReplies = view.replies ?? [];
  if ((post.replyCount ?? 0) > loadedReplies.length) {
    const more = document.createElement("a");
    more.className = "atproto-reply__more";
    setAppLink(more, { path: `/profile/${authorDid}/post/${replyRkey}`, anyApp: true });
    more.target = "_blank";
    more.rel = "noopener noreferrer";
    more.textContent = translate(loc.strings, "viewMore");
    content.appendChild(more);
  }

  item.appendChild(content);

  const subList = document.createElement("ol");
  subList.className = "atproto-reply__replies";
  for (const sub of sortedReplies(view.replies)) {
    const child = renderReply(sub, hidden, loc);
    if (child) subList.appendChild(child);
  }
  // No empty list when every nested reply is hidden.
  if (subList.lastElementChild) {
    subList.lastElementChild.classList.add("atproto-reply__item--last");
    item.appendChild(subList);
  }

  return li;
}

/** Resolved data for the current `thread-uri`, `appview` and `max-depth`. */
type ThreadResult =
  | { kind: "invalid" }
  | { kind: "error" }
  | { kind: "thread"; thread: ThreadViewPost | undefined; rootDid: string; rootRkey: string };

function renderThread(result: ThreadResult, loc: Loc): HTMLElement[] {
  if (result.kind !== "thread") return [renderError(loc)];

  const { thread, rootDid, rootRkey } = result;
  const commentLabel = translate(loc.strings, "comment");
  const comment = () => buildAppAction(commentLabel, rootDid, rootRkey, loc, "atproto-app-btn--xl");

  if (
    !thread ||
    thread.$type === "app.bsky.feed.defs#notFoundPost" ||
    thread.$type === "app.bsky.feed.defs#blockedPost"
  ) {
    return [comment()];
  }

  const hidden = hiddenUris(thread);
  const replies = sortedReplies(thread.replies);

  if (replies.length === 0) return [comment()];

  const list = document.createElement("ol");
  list.className = "atproto-comments__list";
  for (const reply of replies) {
    const el = renderReply(reply, hidden, loc);
    if (el) list.appendChild(el);
  }
  // Every reply hidden (threadgate, labels): show the button alone, as with no replies.
  if (!list.firstElementChild) return [comment()];
  return [list, comment()];
}

// --- Web Component ---

// Without the DOM (server-side rendering) the class still loads, with an empty base.
const Base: typeof HTMLElement = typeof HTMLElement === "undefined"
  ? (class {} as unknown as typeof HTMLElement)
  : HTMLElement;

/**
 * Web Component that displays AT Protocol comments for a given post thread.
 *
 * Fetches replies from an AT Protocol AppView and renders them as a comment
 * section. No visitor authentication required.
 *
 * **Attributes**
 * - `thread-uri` (required) — AT URI of the anchor post (`at://did/app.bsky.feed.post/rkey`)
 * - `appview` — AppView base URL (default: `https://public.api.bsky.app`)
 * - `lang` — UI language and date locale (default: inherits from `html[lang]`).
 *   Bundled dictionaries: `en`, `pt`; other languages fall back to `en` unless `strings` is set
 * - `strings` — JSON object overriding UI strings by key, e.g. `{"comment":"Comentar"}`
 * - `max-depth` — maximum reply depth (default: `6`)
 *
 * Attributes can change at any time. Changing `thread-uri`, `appview` or
 * `max-depth` loads the thread again; changing `lang` or `strings` re-renders
 * without a request.
 *
 * **Properties**
 * - `strings` — same as the attribute, as an object; takes priority over it.
 *   Can be set at any time. Assign a new object: mutating the current one
 *   does not re-render.
 *
 * **Theming** via CSS custom properties on the `atproto-comments` selector:
 * `--atproto-font-family`, `--atproto-font-size`, `--atproto-color-text`,
 * `--atproto-color-muted`, `--atproto-color-border`, `--atproto-color-surface`,
 * `--atproto-avatar-size`, `--atproto-avatar-bg`, `--atproto-avatar-color`.
 *
 * @example
 * ```html
 * <atproto-comments
 *   thread-uri="at://did:plc:xxxx/app.bsky.feed.post/yyyy"
 * ></atproto-comments>
 * ```
 */
export class AtprotoComments extends Base {
  static observedAttributes = ["thread-uri", "appview", "lang", "max-depth", "strings"];

  #strings: UiStrings | undefined;
  #schedule = createScheduler(() => this.#run(), () => this.isConnected);
  #data: ThreadResult | null = null;
  #loadedKey: string | null = null;
  #inFlightKey: string | null = null;
  #controller: AbortController | null = null;
  /** `lang` or `strings` changed since the last render. */
  #viewDirty = false;
  /** Nodes inserted by the last render; page content inside the element is left alone. */
  #nodes: Node[] = [];

  constructor() {
    super();
    for (const type of ["pointerdown", "focusin", "click"]) this.addEventListener(type, refreshAppLink, true);
    // A value assigned before the element was upgraded shadows the accessor; reapply it.
    if (Object.prototype.hasOwnProperty.call(this, "strings")) {
      const value = (this as { strings?: UiStrings }).strings;
      delete (this as { strings?: UiStrings }).strings;
      this.strings = value;
    }
  }

  /** UI strings overriding the bundled dictionary by key. Each assignment re-renders. */
  get strings(): UiStrings | undefined {
    return this.#strings;
  }

  set strings(value: UiStrings | undefined) {
    this.#strings = value;
    this.#viewDirty = true;
    this.#schedule();
  }

  connectedCallback(): void {
    // The stylesheet targets this class too, so a subclass registered under
    // another tag name gets the same styles. Not in the constructor: an element
    // must not gain attributes while it is being created.
    this.classList.add("atproto-comments");
    this.#schedule();
  }

  disconnectedCallback(): void {
    this.#abort();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (name === "lang" || name === "strings") this.#viewDirty = true;
    this.#schedule();
  }

  #loc(): Loc {
    const rawLang = this.getAttribute("lang") ?? document.documentElement.lang;
    const lang = resolveLang(this.getAttribute("lang"), document.documentElement.lang);
    return {
      strings: buildStrings(lang, parseStringsAttr(this.getAttribute("strings")), this.#strings),
      locale: resolveLocale(rawLang, lang),
    };
  }

  get #appview(): string {
    return (this.getAttribute("appview") ?? DEFAULT_APPVIEW).replace(/\/+$/, "");
  }

  get #maxDepth(): number {
    const v = parseInt(this.getAttribute("max-depth") ?? "", 10);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_DEPTH;
  }

  #run(): void {
    const threadUri = this.getAttribute("thread-uri");
    const key = dataKey(threadUri, this.#appview, this.#maxDepth);
    const step = nextStep({
      wantedKey: key,
      loadedKey: this.#loadedKey,
      inFlightKey: this.#inFlightKey,
      viewDirty: this.#viewDirty,
    });
    if (step === "load") this.#load(key, threadUri);
    else if (step === "render") this.#render();
  }

  #abort(): void {
    this.#controller?.abort();
    this.#controller = null;
    this.#inFlightKey = null;
    this.#setLoading(false);
  }

  /** `aria-busy` and the `atproto-comments--loading` class while a request is in flight. */
  #setLoading(on: boolean): void {
    this.classList.toggle("atproto-comments--loading", on);
    if (on) this.setAttribute("aria-busy", "true");
    else this.removeAttribute("aria-busy");
  }

  #load(key: string, threadUri: string | null): void {
    this.#abort();
    if (threadUri === null || isInvalidKey(key)) {
      this.#data = { kind: "invalid" };
      this.#loadedKey = key;
      this.#render();
      return;
    }
    void this.#fetch(key, threadUri);
  }

  async #fetch(key: string, threadUri: string): Promise<void> {
    const controller = new AbortController();
    this.#controller = controller;
    this.#inFlightKey = key;
    this.#setLoading(true);
    // The previous thread's buttons would open the wrong post while this one loads.
    if (this.#loadedKey !== null && key !== this.#loadedKey) {
      this.#removeNodes();
      this.#data = null;
      this.#loadedKey = null;
    }

    // Only the latest request may write, even if an older one had the same key (A → B → A).
    const stale = () => controller.signal.aborted || controller !== this.#controller;

    const uriParts = threadUri.split("/");
    const rootDid = uriParts[2] ?? "";
    const rootRkey = uriParts[4] ?? "";
    const url = `${this.#appview}/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(threadUri)}&depth=${this.#maxDepth}&parentHeight=0`;

    let result: ThreadResult;
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (stale()) return;
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { thread: ThreadViewPost };
      if (stale()) return;
      result = { kind: "thread", thread: data.thread, rootDid, rootRkey };
    } catch {
      if (stale()) return;
      result = { kind: "error" };
    }

    this.#controller = null;
    this.#inFlightKey = null;
    this.#setLoading(false);
    this.#data = result;
    this.#loadedKey = key;
    this.#render();
  }

  #removeNodes(): void {
    for (const node of this.#nodes) (node as ChildNode).remove();
    this.#nodes = [];
  }

  #render(): void {
    this.#removeNodes();
    this.#viewDirty = false;
    if (!this.#data) return;
    this.#nodes = renderThread(this.#data, this.#loc());
    this.append(...this.#nodes);
  }
}
