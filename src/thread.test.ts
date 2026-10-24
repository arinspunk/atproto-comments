import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { hiddenUris, isHiddenByLabel, sortedReplies } from "./thread.ts";
import type { ThreadViewPost } from "./types.ts";

const POST = "app.bsky.feed.defs#threadViewPost";

function reply(uri: string, createdAt: string, $type = POST): ThreadViewPost {
  return { $type, post: { uri, record: { createdAt } } };
}

Deno.test("isHiddenByLabel hides posts with a hiding label", () => {
  assertEquals(isHiddenByLabel([{ val: "porn" }]), true);
  assertEquals(isHiddenByLabel([{ val: "!hide" }]), true);
});

Deno.test("isHiddenByLabel keeps posts without hiding labels", () => {
  assertEquals(isHiddenByLabel(undefined), false);
  assertEquals(isHiddenByLabel([]), false);
  assertEquals(isHiddenByLabel([{ val: "spam" }]), false);
});

Deno.test("sortedReplies keeps only threadViewPost entries", () => {
  const list = [
    reply("at://a", "2026-01-01T00:00:00Z"),
    reply("at://b", "2026-01-02T00:00:00Z", "app.bsky.feed.defs#blockedPost"),
    reply("at://c", "2026-01-03T00:00:00Z", "app.bsky.feed.defs#notFoundPost"),
  ];
  assertEquals(sortedReplies(list).map((r) => r.post?.uri), ["at://a"]);
});

Deno.test("sortedReplies orders by createdAt, oldest first", () => {
  const list = [
    reply("at://late", "2026-03-01T00:00:00Z"),
    reply("at://early", "2026-01-01T00:00:00Z"),
    reply("at://mid", "2026-02-01T00:00:00Z"),
  ];
  assertEquals(sortedReplies(list).map((r) => r.post?.uri), ["at://early", "at://mid", "at://late"]);
});

Deno.test("sortedReplies accepts a missing list", () => {
  assertEquals(sortedReplies(undefined), []);
});

function root(hiddenReplies?: unknown[]): ThreadViewPost {
  return { $type: POST, threadgate: hiddenReplies === undefined ? undefined : { record: { hiddenReplies } } };
}

Deno.test("hiddenUris reads hiddenReplies as a list of AT-URIs", () => {
  const uri = "at://did:plc:x/app.bsky.feed.post/abc";
  assertEquals(hiddenUris(root([uri])), new Set([uri]));
});

Deno.test("hiddenUris is empty without a threadgate or hidden replies", () => {
  assertEquals(hiddenUris(root()), new Set());
  assertEquals(hiddenUris(root([])), new Set());
  assertEquals(hiddenUris({ $type: POST, threadgate: {} }), new Set());
});

Deno.test("hiddenUris keeps only string entries", () => {
  const uri = "at://did:plc:x/app.bsky.feed.post/abc";
  assertEquals(hiddenUris(root([{ uri: "at://legacy" }, 42, null, "", uri])), new Set([uri]));
  assertEquals(hiddenUris({ $type: POST, threadgate: { record: { hiddenReplies: "nope" as unknown as unknown[] } } }), new Set());
});
