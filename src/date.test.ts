import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { formatAbsoluteDate, formatRelativeTime, isValidDate } from "./date.ts";
import { I18N } from "./i18n.ts";

// Noon local time on 2 January 2020: the dates below are shown in the machine's
// time zone, and no single UTC time is the same day in all of them (UTC-12 to UTC+14).
const OLD = new Date(2020, 0, 2, 12).toISOString();
const NOW = Date.parse("2026-10-24T12:00:00Z");
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();
const rel = (iso: string, locale = "en") => formatRelativeTime(iso, I18N.en, locale, NOW);

Deno.test("isValidDate rejects missing and unparsable dates", () => {
  assertEquals(isValidDate(undefined), false);
  assertEquals(isValidDate("not a date"), false);
  assertEquals(isValidDate(OLD), true);
});

Deno.test("formatRelativeTime uses the unit strings up to a year", () => {
  assertEquals(rel(ago(30)), "now");
  assertEquals(rel(ago(5 * 60)), "5 m");
  assertEquals(rel(ago(3 * 3600)), "3 h");
  assertEquals(rel(ago(4 * 86400)), "4 d");
  assertEquals(rel(ago(2 * 2592000)), "2 mo");
});

Deno.test("formatRelativeTime uses the bundled strings of the language", () => {
  assertEquals(formatRelativeTime(ago(30), I18N.pt, "pt", NOW), "agora");
});

Deno.test("formatRelativeTime shows older dates in the short format of the locale", () => {
  assertEquals(rel(OLD, "en-US"), "1/2/20");
  assertEquals(rel(OLD, "pt-PT"), "02/01/20");
});

Deno.test("formatRelativeTime does not throw with an invalid locale", () => {
  assertEquals(rel(OLD, "%%"), OLD.slice(0, 10));
});

Deno.test("formatRelativeTime is empty for an invalid date", () => {
  assertEquals(rel("nope"), "");
});

Deno.test("formatAbsoluteDate falls back to the ISO string with an invalid locale", () => {
  assertEquals(formatAbsoluteDate(OLD, "%%"), OLD);
  assertEquals(formatAbsoluteDate("nope", "en"), "");
});
