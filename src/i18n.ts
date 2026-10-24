/**
 * @module
 * UI string resolution for the atproto-comments component. DOM-free so it can
 * be tested outside the browser.
 */

const EN = {
  reply: "Reply",
  replyTo: "Reply to {name}",
  comment: "Comment",
  otherApp: "Other app",
  inputPlaceholder: "app.example",
  go: "Open",
  error: "Comments couldn't be loaded.",
  now: "now",
  minutes: "m",
  hours: "h",
  days: "d",
  months: "mo",
  viewMore: "View more replies",
  invalidDomain: "Invalid domain",
  unknownAuthor: "Unknown",
};

/** Key of a UI string that can be overridden through `strings`. */
export type StringKey = keyof typeof EN;

/** Partial map of UI strings supplied by the integrator. */
export type UiStrings = Partial<Record<StringKey, string>>;

/** Fully resolved map of UI strings. */
export type ResolvedStrings = Record<StringKey, string>;

/** Language with a bundled dictionary. */
export type Lang = "pt" | "en";

export const I18N: Record<Lang, ResolvedStrings> = {
  pt: {
    reply: "Responder",
    replyTo: "Responder a {name}",
    comment: "Comentar",
    otherApp: "Outra app",
    inputPlaceholder: "app.exemplo",
    go: "Abrir",
    error: "Não foi possível carregar os comentários.",
    now: "agora",
    minutes: "m",
    hours: "h",
    days: "d",
    months: "me",
    viewMore: "Ver mais respostas",
    invalidDomain: "Domínio inválido",
    unknownAuthor: "Desconhecido",
  },
  en: EN,
};

const KEYS = new Set<string>(Object.keys(EN));

/** Picks a bundled dictionary from the `lang` attribute or, failing that, the document language. */
export function resolveLang(attr: string | null, docLang: string | null | undefined): Lang {
  const raw = attr ?? docLang ?? "";
  const code = raw.split("-")[0].toLowerCase();
  return (code in I18N ? code : "en") as Lang;
}

/** Keeps only known keys whose value is a string. Anything that is not an object yields `{}`. */
export function pickStrings(value: unknown): UiStrings {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: UiStrings = {};
  for (const [k, v] of Object.entries(value)) {
    if (KEYS.has(k) && typeof v === "string") out[k as StringKey] = v;
  }
  return out;
}

/** Parses the `strings` attribute. Malformed JSON yields `{}`. */
export function parseStringsAttr(raw: string | null): UiStrings {
  if (!raw) return {};
  try {
    return pickStrings(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Layers `en` <- bundled `lang` <- attribute strings <- property strings. */
export function buildStrings(lang: Lang, attrStrings?: UiStrings, propStrings?: unknown): ResolvedStrings {
  return { ...I18N.en, ...I18N[lang], ...pickStrings(attrStrings), ...pickStrings(propStrings) };
}

export function translate(strings: ResolvedStrings, key: StringKey, vars?: Record<string, string>): string {
  let str = strings[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}

/** Returns `raw` as a BCP 47 tag usable by `Intl`, or `fallback` when it is empty or unsupported. */
export function resolveLocale(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([raw])[0] ?? fallback;
  } catch {
    return fallback;
  }
}
