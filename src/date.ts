/**
 * @module
 * Reply dates: relative time in the header and the absolute date in its tooltip.
 * DOM-free so it can be tested outside the browser.
 */

import type { ResolvedStrings } from "./i18n.ts";

/** Whether `iso` is a date string that parses to a valid date. */
export function isValidDate(iso: string | undefined): iso is string {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}

/**
 * Relative time (`now`, `5 m`, `3 d`…) with the unit strings, or the short date
 * in `locale` for dates more than a year old. Empty for an invalid date.
 */
export function formatRelativeTime(
  iso: string,
  strings: ResolvedStrings,
  locale: string,
  now: number = Date.now(),
): string {
  if (!isValidDate(iso)) return "";
  const date = new Date(iso);
  const delta = Math.floor((now - date.getTime()) / 1000);
  if (delta < 60) return strings.now;
  if (delta < 3600) return `${Math.floor(delta / 60)} ${strings.minutes}`;
  if (delta < 86400) return `${Math.floor(delta / 3600)} ${strings.hours}`;
  if (delta < 2592000) return `${Math.floor(delta / 86400)} ${strings.days}`;
  if (delta < 31536000) return `${Math.floor(delta / 2592000)} ${strings.months}`;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Short date and time in `locale`, for the tooltip. Empty for an invalid date. */
export function formatAbsoluteDate(iso: string, locale: string): string {
  if (!isValidDate(iso)) return "";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
