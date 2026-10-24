/**
 * @module
 * Thread filtering and ordering. DOM-free so it can be tested outside the
 * browser.
 */

import type { Label, PostView, ThreadViewPost } from "./types.ts";

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

/**
 * Whether a reply is hidden: by the thread author (threadgate), by a label on
 * the post, or by a label on the author's account. Labels on the author's
 * profile record (avatar, banner) don't hide what they post.
 */
export function isReplyHidden(post: PostView | undefined, hidden: Set<string>): boolean {
  if (hidden.has(post?.uri ?? "")) return true;
  if (isHiddenByLabel(post?.labels)) return true;
  const did = post?.author?.did;
  if (!did || !Array.isArray(post?.author?.labels)) return false;
  return isHiddenByLabel(post.author.labels.filter((l) => l.uri === did));
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
