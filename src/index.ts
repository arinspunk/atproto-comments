/**
 * @module
 * Web Component for displaying AT Protocol comments on any website.
 * Importing this module registers `<atproto-comments>`; outside the browser
 * (server-side rendering) it registers nothing.
 *
 * @example
 * ```html
 * <atproto-comments
 *   thread-uri="at://did:plc:xxxx/app.bsky.feed.post/yyyy"
 * ></atproto-comments>
 * ```
 */

import { AtprotoComments } from "./element.ts";

export * from "./element.ts";
export type { StringKey, UiStrings } from "./element.ts";

// Guarded for double import and for environments without the DOM.
if (typeof customElements !== "undefined" && !customElements.get("atproto-comments")) {
  customElements.define("atproto-comments", AtprotoComments);
}
