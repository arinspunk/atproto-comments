/**
 * @module
 * Web Component for displaying AT Protocol comments on any website.
 *
 * @example
 * ```html
 * <atproto-comments
 *   thread-uri="at://did:plc:xxxx/app.bsky.feed.post/yyyy"
 * ></atproto-comments>
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

export type { StringKey, UiStrings } from "./i18n.ts";

// --- Types ---

interface Label {
  val: string;
}

interface Facet {
  index: { byteStart: number; byteEnd: number };
  features: Array<
    | { $type: "app.bsky.richtext.facet#link"; uri: string }
    | { $type: "app.bsky.richtext.facet#mention"; did: string }
    | { $type: "app.bsky.richtext.facet#tag"; tag: string }
    | { $type: string }
  >;
}

interface ProfileViewBasic {
  did?: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
}

interface PostRecord {
  text?: string;
  createdAt?: string;
  facets?: Facet[];
}

interface PostView {
  uri?: string;
  author?: ProfileViewBasic;
  record?: PostRecord;
  replyCount?: number;
  labels?: Label[];
}

interface HiddenReply {
  uri?: string;
}

interface Threadgate {
  record?: { hiddenReplies?: HiddenReply[] };
}

interface ThreadViewPost {
  $type: string;
  post?: PostView;
  replies?: ThreadViewPost[];
  threadgate?: Threadgate;
}

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
const PREF_KEY = "atproto-preferred-app";
const DEFAULT_APPVIEW = "https://public.api.bsky.app";
const DEFAULT_MAX_DEPTH = 6;

const HIDE_LABELS = new Set([
  "!hide",
  "!no-promote",
  "porn",
  "sexual",
  "graphic-media",
  "nudity",
]);

const SUPPORTS_POPOVER = "popover" in HTMLElement.prototype;

// --- Pure utilities ---

function isValidDate(iso: string | undefined): iso is string {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}

function formatRelativeTime(iso: string, loc: Loc): string {
  if (!isValidDate(iso)) return "";
  const t = (k: StringKey) => translate(loc.strings, k);
  const delta = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (delta < 60) return t("now");
  if (delta < 3600) return `${Math.floor(delta / 60)} ${t("minutes")}`;
  if (delta < 86400) return `${Math.floor(delta / 3600)} ${t("hours")}`;
  if (delta < 2592000) return `${Math.floor(delta / 86400)} ${t("days")}`;
  if (delta < 31536000) return `${Math.floor(delta / 2592000)} ${t("months")}`;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatAbsoluteDate(iso: string, loc: Loc): string {
  if (!isValidDate(iso)) return "";
  try {
    return new Intl.DateTimeFormat(loc.locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getInitials(displayName: string | undefined, handle: string | undefined): string {
  const src = (displayName?.trim()) ? displayName.trim() : (handle ?? "");
  const words = [...new Intl.Segmenter(undefined, { granularity: "word" }).segment(src)]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment);
  if (!words.length) return "?";
  const first = [...words[0]][0] ?? "";
  const second = words.length > 1 ? ([...words[1]][0] ?? "") : "";
  return (first + second).toUpperCase();
}

function normalizeDomain(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL("https://" + value);
    if (url.pathname !== "/" || url.search || !url.hostname.includes(".")) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function isHiddenByLabel(labels: Label[] | undefined): boolean {
  if (!Array.isArray(labels)) return false;
  return labels.some((l) => HIDE_LABELS.has(l.val));
}

function hiddenUris(thread: ThreadViewPost): Set<string> {
  return new Set(
    (thread.threadgate?.record?.hiddenReplies ?? [])
      .map((r) => r.uri)
      .filter((u): u is string => Boolean(u)),
  );
}

function sortedReplies(list: ThreadViewPost[] | undefined): ThreadViewPost[] {
  return (list ?? [])
    .filter((r) => r.$type === "app.bsky.feed.defs#threadViewPost")
    .sort((a, b) => {
      const ta = new Date(a.post?.record?.createdAt ?? 0).getTime();
      const tb = new Date(b.post?.record?.createdAt ?? 0).getTime();
      return ta - tb;
    });
}

function buildFacetedText(record: PostRecord): DocumentFragment {
  const text = record.text ?? "";
  const facets = record.facets ?? [];
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  const links: Array<{ start: number; end: number; uri: string }> = [];
  for (const facet of facets) {
    for (const feature of facet.features ?? []) {
      if (feature.$type === "app.bsky.richtext.facet#link" && "uri" in feature) {
        const uri = feature.uri ?? "";
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          links.push({ start: facet.index.byteStart, end: facet.index.byteEnd, uri });
        }
      } else if (feature.$type === "app.bsky.richtext.facet#mention" && "did" in feature) {
        links.push({
          start: facet.index.byteStart,
          end: facet.index.byteEnd,
          uri: `https://bsky.app/profile/${feature.did}`,
        });
      } else if (feature.$type === "app.bsky.richtext.facet#tag" && "tag" in feature) {
        links.push({
          start: facet.index.byteStart,
          end: facet.index.byteEnd,
          uri: `https://bsky.app/hashtag/${encodeURIComponent(feature.tag)}`,
        });
      }
    }
  }
  links.sort((a, b) => a.start - b.start);

  const fragment = document.createDocumentFragment();
  const decoder = new TextDecoder();
  let pos = 0;

  for (const link of links) {
    if (link.start < pos || link.end <= link.start || link.end > bytes.length) continue;
    if (link.start > pos) {
      fragment.appendChild(document.createTextNode(decoder.decode(bytes.slice(pos, link.start))));
    }
    const a = document.createElement("a");
    a.href = link.uri;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    a.textContent = decoder.decode(bytes.slice(link.start, link.end));
    fragment.appendChild(a);
    pos = link.end;
  }
  if (pos < bytes.length) {
    fragment.appendChild(document.createTextNode(decoder.decode(bytes.slice(pos))));
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
  const preferred = localStorage.getItem(PREF_KEY);
  const popover = document.createElement("div");
  popover.id = popoverId;
  popover.className = "atproto-app-popover";
  if (SUPPORTS_POPOVER) {
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
      localStorage.setItem(PREF_KEY, app.domain);
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
  input.className = "atproto-app-popover__input";
  if (preferred && !KNOWN_DOMAINS.has(preferred)) input.value = preferred;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "→";
  btn.className = "atproto-app-popover__go";

  function openCustom() {
    const domain = normalizeDomain(input.value);
    if (!domain) {
      input.setAttribute("aria-invalid", "true");
      return;
    }
    input.removeAttribute("aria-invalid");
    localStorage.setItem(PREF_KEY, domain);
    window.open(`https://${domain}/profile/${targetDid}/post/${targetRkey}`, "_blank", "noopener,noreferrer");
    close();
  }

  btn.addEventListener("click", openCustom);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") openCustom(); });

  customWrap.appendChild(input);
  customWrap.appendChild(btn);
  popover.appendChild(customWrap);

  return popover;
}

function buildAppButton(label: string, popoverId: string, extraClass?: string, ariaLabel?: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute(SUPPORTS_POPOVER ? "popovertarget" : "aria-controls", popoverId);
  btn.setAttribute("aria-haspopup", "true");
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
    const preferred = localStorage.getItem(PREF_KEY);
    for (const a of popover.querySelectorAll<HTMLAnchorElement>(".atproto-app-popover__link")) {
      let hostname = "";
      try { hostname = new URL(a.href).hostname; } catch { /* ignore */ }
      a.classList.toggle("atproto-app-popover__link--active", hostname === preferred);
    }
    const input = popover.querySelector<HTMLInputElement>(".atproto-app-popover__input");
    if (input) {
      input.value = preferred && !KNOWN_DOMAINS.has(preferred) ? preferred : "";
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

  if (SUPPORTS_POPOVER) {
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
  if (view.$type === "app.bsky.feed.defs#blockedPost") return null;
  if (view.$type !== "app.bsky.feed.defs#threadViewPost") return null;
  if (hidden.has(view.post?.uri ?? "")) return null;
  if (isHiddenByLabel(view.post?.labels)) return null;

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

  const parts = bylineParts(author);
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
    time.textContent = formatRelativeTime(record.createdAt, loc);
    time.title = formatAbsoluteDate(record.createdAt, loc);
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
    more.href = `https://bsky.app/profile/${authorDid}/post/${replyRkey}`;
    more.target = "_blank";
    more.rel = "noopener noreferrer";
    more.textContent = translate(loc.strings, "viewMore");
    content.appendChild(more);
  }

  item.appendChild(content);

  const subReplies = sortedReplies(view.replies);
  if (subReplies.length > 0) {
    const subList = document.createElement("ol");
    subList.className = "atproto-reply__replies";
    for (const sub of subReplies) {
      const child = renderReply(sub, hidden, loc);
      if (child) subList.appendChild(child);
    }
    if (subList.lastElementChild) {
      subList.lastElementChild.classList.add("atproto-reply__item--last");
    }
    item.appendChild(subList);
  }

  return li;
}

// --- Web Component ---

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
 * **Properties**
 * - `strings` — same as the attribute, as an object; takes priority over it.
 *   Set it before the element is inserted into the document.
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
export class AtprotoComments extends HTMLElement {
  static observedAttributes = ["thread-uri", "appview", "lang", "max-depth", "strings"];

  #strings: UiStrings | undefined;

  /** UI strings overriding the bundled dictionary by key. Read when the element connects. */
  get strings(): UiStrings | undefined {
    return this.#strings;
  }

  set strings(value: UiStrings | undefined) {
    this.#strings = value;
  }

  connectedCallback(): void {
    // A value assigned before the element was upgraded shadows the accessor; reapply it.
    if (Object.prototype.hasOwnProperty.call(this, "strings")) {
      const value = (this as { strings?: UiStrings }).strings;
      delete (this as { strings?: UiStrings }).strings;
      this.strings = value;
    }

    const loc = this.#loc();
    const threadUri = this.getAttribute("thread-uri");
    if (!threadUri || !threadUri.startsWith("at://")) {
      this.appendChild(renderError(loc));
      return;
    }
    this.#load(threadUri, loc);
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

  async #load(threadUri: string, loc: Loc): Promise<void> {
    const uriParts = threadUri.split("/");
    const rootDid = uriParts[2] ?? "";
    const rootRkey = uriParts[4] ?? "";

    const url = `${this.#appview}/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(threadUri)}&depth=${this.#maxDepth}&parentHeight=0`;

    let data: { thread: ThreadViewPost };
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      data = await res.json() as { thread: ThreadViewPost };
    } catch {
      this.appendChild(renderError(loc));
      return;
    }

    const thread = data.thread;
    const commentLabel = translate(loc.strings, "comment");

    if (
      !thread ||
      thread.$type === "app.bsky.feed.defs#notFoundPost" ||
      thread.$type === "app.bsky.feed.defs#blockedPost"
    ) {
      this.appendChild(buildAppAction(commentLabel, rootDid, rootRkey, loc, "atproto-app-btn--xl"));
      return;
    }

    const hidden = hiddenUris(thread);
    const replies = sortedReplies(thread.replies);

    if (replies.length === 0) {
      this.appendChild(buildAppAction(commentLabel, rootDid, rootRkey, loc, "atproto-app-btn--xl"));
      return;
    }

    const list = document.createElement("ol");
    list.className = "atproto-comments__list";
    for (const reply of replies) {
      const el = renderReply(reply, hidden, loc);
      if (el) list.appendChild(el);
    }
    this.appendChild(list);
    this.appendChild(buildAppAction(commentLabel, rootDid, rootRkey, loc, "atproto-app-btn--xl"));
  }
}

// Auto-register with guard for double import
if (!customElements.get("atproto-comments")) {
  customElements.define("atproto-comments", AtprotoComments);
}
