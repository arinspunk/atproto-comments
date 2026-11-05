/**
 * @module
 * The apps offered in the picker and the URLs each one uses for a post, a
 * profile and a hashtag. DOM-free so it can be tested outside the browser.
 */

/** An app in the picker. Internal: the shape may change in any release. */
export interface AppDef {
  /** Visible name. */
  name: string;
  /** Identity of the app and the value stored as the preference. */
  domain: string;
  /** Path templates with `{did}`, `{rkey}` and `{tag}`. */
  routes: {
    post: string;
    profile: string;
    /** `null`: the app has no hashtag page, so hashtags open in bsky.app. */
    hashtag: string | null;
  };
}

/** What a link points at, resolved against the preferred app when it is used. */
export type AppLinkTarget =
  | { kind: "post"; did: string; rkey: string }
  | { kind: "profile"; did: string }
  | { kind: "hashtag"; tag: string };

const BSKY_ROUTES: AppDef["routes"] = {
  post: "/profile/{did}/post/{rkey}",
  profile: "/profile/{did}",
  hashtag: "/hashtag/{tag}",
};
const NO_HASHTAG: AppDef["routes"] = { ...BSKY_ROUTES, hashtag: null };

/** Checked on 2026-11-05; see the app-picker-sheet design. Bluesky first. */
export const APPS: readonly AppDef[] = [
  { name: "Bluesky", domain: "bsky.app", routes: BSKY_ROUTES },
  { name: "Anisota", domain: "anisota.net", routes: NO_HASHTAG },
  { name: "Blacksky", domain: "blacksky.community", routes: BSKY_ROUTES },
  { name: "Deer", domain: "deer.social", routes: BSKY_ROUTES },
  { name: "Impro", domain: "impro.social", routes: BSKY_ROUTES },
  { name: "Mu", domain: "mu.social", routes: BSKY_ROUTES },
  { name: "Northsky", domain: "northsky.app", routes: BSKY_ROUTES },
  { name: "Red Dwarf", domain: "reddwarf.app", routes: NO_HASHTAG },
];

const BLUESKY = APPS[0];

/** The app with this domain, if it is in the list. */
export function findApp(domain: string | null): AppDef | undefined {
  return domain === null ? undefined : APPS.find((a) => a.domain === domain);
}

/** Bluesky first, the rest by name; the preferred app, if listed, moves to the front. */
export function orderedApps(pref: string | null): { app: AppDef; lastUsed: boolean }[] {
  const rest = APPS.filter((a) => a !== BLUESKY).sort((a, b) => a.name.localeCompare(b.name));
  const all = [BLUESKY, ...rest];
  const preferred = findApp(pref);
  if (!preferred) return all.map((app) => ({ app, lastUsed: false }));
  return [
    { app: preferred, lastUsed: true },
    ...all.filter((a) => a !== preferred).map((app) => ({ app, lastUsed: false })),
  ];
}

/** Encodes a path segment; `:` is legal in a path, so DIDs stay readable. */
function encodeSegment(value: string): string {
  return encodeURIComponent(value).replaceAll("%3A", ":");
}

function fill(template: string, target: AppLinkTarget): string {
  return template.replace(/\{(did|rkey|tag)\}/g, (_, k: string) =>
    encodeSegment(String((target as Record<string, string>)[k] ?? "")));
}

/**
 * URL of `target` in the preferred app. A listed app uses its own routes, with
 * hashtags in bsky.app when it has none. A custom domain uses the bsky.app
 * routes, with hashtags in bsky.app. No preference: bsky.app.
 */
export function appUrl(pref: string | null, target: AppLinkTarget): string {
  const listed = findApp(pref);
  let domain = BLUESKY.domain;
  let routes = BLUESKY.routes;
  if (listed) {
    domain = listed.domain;
    routes = listed.routes;
  } else if (pref) {
    domain = pref;
  }
  let template: string;
  if (target.kind === "hashtag") {
    if (routes.hashtag === null || !listed) {
      domain = BLUESKY.domain;
      template = BLUESKY.routes.hashtag!;
    } else {
      template = routes.hashtag;
    }
  } else {
    template = routes[target.kind];
  }
  return `https://${domain}${fill(template, target)}`;
}
