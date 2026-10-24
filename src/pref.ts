/**
 * @module
 * The visitor's preferred app, kept in `localStorage`. DOM-free so it can be
 * tested outside the browser.
 *
 * Storage can be unavailable (third-party iframes with storage blocked,
 * sandboxed frames, privacy settings). Reading the `localStorage` property
 * itself can throw, so every access is wrapped.
 */

const PREF_KEY = "atproto-preferred-app";

/** Domain of the preferred app, or `null` if none is stored or storage is unavailable. */
export function readPref(): string | null {
  try {
    return globalThis.localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

/** Stores the preferred app domain; does nothing if storage is unavailable. */
export function writePref(domain: string): void {
  try {
    globalThis.localStorage.setItem(PREF_KEY, domain);
  } catch {
    // No persistence: the picker still works.
  }
}
