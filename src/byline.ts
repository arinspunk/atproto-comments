/**
 * @module
 * Author byline text for a reply header. DOM-free so it can be tested outside
 * the browser.
 */

/** Text pieces of a reply byline. */
export interface BylineParts {
  /** Visible name: display name, else handle, else the `unknown` text. */
  name: string;
  /** `@handle`, or `null` when the author has no handle. */
  handle: string | null;
  /**
   * Text between name and handle. It must be rendered text, not CSS spacing:
   * without it iOS Data Detectors read "Name@handle.domain" as an email.
   */
  separator: string;
}

/** Computes the byline pieces for an author; `unknown` names an author with no name or handle. */
export function bylineParts(author: { displayName?: string; handle?: string }, unknown: string): BylineParts {
  return {
    name: author.displayName ?? author.handle ?? unknown,
    handle: author.handle ? "@" + author.handle : null,
    separator: " ",
  };
}
