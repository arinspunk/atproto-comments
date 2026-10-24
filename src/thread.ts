/**
 * @module
 * Thread filtering and ordering. DOM-free so it can be tested outside the
 * browser.
 */

import type { Label, ThreadViewPost } from "./types.ts";

const HIDE_LABELS = new Set([
  "!hide",
  "!no-promote",
  "porn",
  "sexual",
  "graphic-media",
  "nudity",
]);

/** Whether any of the labels hides the post. */
export function isHiddenByLabel(labels: Label[] | undefined): boolean {
  if (!Array.isArray(labels)) return false;
  return labels.some((l) => HIDE_LABELS.has(l.val));
}

/** URIs of the replies hidden by the thread author in the threadgate. */
export function hiddenUris(thread: ThreadViewPost): Set<string> {
  const list = thread.threadgate?.record?.hiddenReplies;
  if (!Array.isArray(list)) return new Set();
  return new Set(list.filter((u): u is string => typeof u === "string" && u !== ""));
}

/** Visible replies (`threadViewPost` only), oldest first. */
export function sortedReplies(list: ThreadViewPost[] | undefined): ThreadViewPost[] {
  return (list ?? [])
    .filter((r) => r.$type === "app.bsky.feed.defs#threadViewPost")
    .sort((a, b) => {
      const ta = new Date(a.post?.record?.createdAt ?? 0).getTime();
      const tb = new Date(b.post?.record?.createdAt ?? 0).getTime();
      return ta - tb;
    });
}
