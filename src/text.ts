/**
 * @module
 * Text helpers for the component. DOM-free so they can be tested outside the
 * browser.
 */

import type { PostRecord } from "./types.ts";

/**
 * A run of post text: a link when `href` is set, a mention of `mention` (a DID)
 * when that is set, plain text otherwise. Mentions carry no URL because they
 * open in the visitor's preferred app.
 */
export interface TextSegment {
  text: string;
  href?: string;
  mention?: string;
}

/**
 * Splits a post's text into plain and linked runs from its facets. Facet
 * ranges are UTF-8 byte offsets; overlapping or out-of-range facets are skipped.
 */
export function facetSegments(record: PostRecord): TextSegment[] {
  const text = record.text ?? "";
  const facets = record.facets ?? [];
  const bytes = new TextEncoder().encode(text);

  const links: Array<{ start: number; end: number; uri?: string; mention?: string }> = [];
  for (const facet of facets) {
    for (const feature of facet.features ?? []) {
      if (feature.$type === "app.bsky.richtext.facet#link" && "uri" in feature) {
        const uri = feature.uri ?? "";
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          links.push({ start: facet.index.byteStart, end: facet.index.byteEnd, uri });
        }
      } else if (feature.$type === "app.bsky.richtext.facet#mention" && "did" in feature) {
        links.push({ start: facet.index.byteStart, end: facet.index.byteEnd, mention: feature.did });
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

  const segments: TextSegment[] = [];
  const decoder = new TextDecoder();
  let pos = 0;

  for (const link of links) {
    if (link.start < pos || link.end <= link.start || link.end > bytes.length) continue;
    if (link.start > pos) {
      segments.push({ text: decoder.decode(bytes.slice(pos, link.start)) });
    }
    const run = decoder.decode(bytes.slice(link.start, link.end));
    segments.push(link.mention === undefined ? { text: run, href: link.uri } : { text: run, mention: link.mention });
    pos = link.end;
  }
  if (pos < bytes.length) {
    segments.push({ text: decoder.decode(bytes.slice(pos)) });
  }
  return segments;
}

/**
 * Runs of letters, digits and `_` (with their combining marks), joined across
 * apostrophes. Close to `Intl.Segmenter` word segments for names and handles,
 * except in scripts without spaces (CJK, Thai), where it returns a single run.
 */
const WORD = /[\p{L}\p{N}_][\p{L}\p{M}\p{N}_]*(?:['’][\p{L}\p{N}_][\p{L}\p{M}\p{N}_]*)*/gu;

/** Words of `src`, with a fallback where `Intl.Segmenter` is missing (Firefox < 125). */
function words(src: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter(undefined, { granularity: "word" }).segment(src)]
      .filter((s) => s.isWordLike)
      .map((s) => s.segment);
  }
  return src.match(WORD) ?? [];
}

/** Up to two initials from the display name, else the handle; `?` if none. */
export function getInitials(displayName: string | undefined, handle: string | undefined): string {
  const src = (displayName?.trim()) ? displayName.trim() : (handle ?? "");
  const list = words(src);
  if (!list.length) return "?";
  const first = [...list[0]][0] ?? "";
  const second = list.length > 1 ? ([...list[1]][0] ?? "") : "";
  return (first + second).toUpperCase();
}

/** Hostname of a custom app domain typed by the visitor, or `null` if invalid. */
export function normalizeDomain(raw: string): string | null {
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
