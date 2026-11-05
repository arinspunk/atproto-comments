import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { APPS, appUrl, orderedApps } from "./apps.ts";

const DID = "did:plc:abc123";
const names = (pref: string | null) => orderedApps(pref).map((e) => e.app.name);

Deno.test("orderedApps without a preference: Bluesky first, the rest alphabetical", () => {
  const list = names(null);
  assertEquals(list[0], "Bluesky");
  const rest = list.slice(1);
  assertEquals(rest, [...rest].sort((a, b) => a.localeCompare(b)));
  assertEquals(list.length, APPS.length);
  assertEquals(orderedApps(null).some((e) => e.lastUsed), false);
});

Deno.test("orderedApps includes Bluesky, Mu and Deer", () => {
  for (const name of ["Bluesky", "Mu", "Deer"]) assertEquals(names(null).includes(name), true);
});

Deno.test("orderedApps moves a listed preference to the front, once, as last used", () => {
  const list = orderedApps("deer.social");
  assertEquals(list[0].app.name, "Deer");
  assertEquals(list[0].lastUsed, true);
  assertEquals(list.filter((e) => e.app.name === "Deer").length, 1);
  assertEquals(list.filter((e) => e.lastUsed).length, 1);
  assertEquals(list.length, APPS.length);
  assertEquals(names("deer.social").slice(1), names(null).filter((n) => n !== "Deer"));
});

Deno.test("orderedApps keeps the usual order for a custom domain", () => {
  assertEquals(names("app.example"), names(null));
  assertEquals(orderedApps("app.example").some((e) => e.lastUsed), false);
});

Deno.test("appUrl without a preference uses bsky.app", () => {
  assertEquals(appUrl(null, { kind: "post", did: DID, rkey: "3k" }), `https://bsky.app/profile/${DID}/post/3k`);
  assertEquals(appUrl(null, { kind: "profile", did: DID }), `https://bsky.app/profile/${DID}`);
  assertEquals(appUrl(null, { kind: "hashtag", tag: "atproto" }), "https://bsky.app/hashtag/atproto");
});

Deno.test("appUrl with a listed app uses its routes", () => {
  assertEquals(appUrl("deer.social", { kind: "post", did: DID, rkey: "3k" }), `https://deer.social/profile/${DID}/post/3k`);
  assertEquals(appUrl("mu.social", { kind: "profile", did: DID }), `https://mu.social/profile/${DID}`);
  assertEquals(appUrl("deer.social", { kind: "hashtag", tag: "atproto" }), "https://deer.social/hashtag/atproto");
});

Deno.test("appUrl sends hashtags to bsky.app for an app without a hashtag route", () => {
  assertEquals(appUrl("anisota.net", { kind: "profile", did: DID }), `https://anisota.net/profile/${DID}`);
  assertEquals(appUrl("anisota.net", { kind: "hashtag", tag: "atproto" }), "https://bsky.app/hashtag/atproto");
  assertEquals(appUrl("reddwarf.app", { kind: "hashtag", tag: "atproto" }), "https://bsky.app/hashtag/atproto");
});

Deno.test("appUrl with a custom domain uses bsky.app routes, and bsky.app for hashtags", () => {
  assertEquals(appUrl("app.example", { kind: "post", did: DID, rkey: "3k" }), `https://app.example/profile/${DID}/post/3k`);
  assertEquals(appUrl("app.example", { kind: "profile", did: DID }), `https://app.example/profile/${DID}`);
  assertEquals(appUrl("app.example", { kind: "hashtag", tag: "atproto" }), "https://bsky.app/hashtag/atproto");
});

Deno.test("appUrl encodes every value but keeps the colons of a DID", () => {
  assertEquals(appUrl(null, { kind: "hashtag", tag: "café/#1 ?" }), "https://bsky.app/hashtag/caf%C3%A9%2F%231%20%3F");
  assertEquals(appUrl(null, { kind: "profile", did: "did:web:a/b" }), "https://bsky.app/profile/did:web:a%2Fb");
  assertEquals(appUrl(null, { kind: "post", did: DID, rkey: "a/b" }), `https://bsky.app/profile/${DID}/post/a%2Fb`);
});
