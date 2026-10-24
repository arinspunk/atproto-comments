import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { createScheduler, dataKey, isInvalidKey, type LoadState, nextStep } from "./lifecycle.ts";

/** A scheduler with a manual queue: `flush()` runs what was enqueued. */
function setup(connected = true) {
  const queue: (() => void)[] = [];
  const state = { connected, runs: 0 };
  const schedule = createScheduler(
    () => state.runs++,
    () => state.connected,
    (cb) => queue.push(cb),
  );
  const flush = () => queue.splice(0).forEach((cb) => cb());
  return { schedule, flush, queue, state };
}

Deno.test("createScheduler batches calls into one run", () => {
  const { schedule, flush, queue, state } = setup();
  for (let i = 0; i < 6; i++) schedule();
  assertEquals(queue.length, 1);
  flush();
  assertEquals(state.runs, 1);
});

Deno.test("createScheduler does not run while disconnected", () => {
  const { schedule, flush, state } = setup(false);
  schedule();
  flush();
  assertEquals(state.runs, 0);
});

Deno.test("createScheduler does not run if disconnected before the microtask", () => {
  const { schedule, flush, state } = setup();
  schedule();
  state.connected = false;
  flush();
  assertEquals(state.runs, 0);
});

Deno.test("createScheduler enqueues again after a run", () => {
  const { schedule, flush, queue, state } = setup();
  schedule();
  flush();
  schedule();
  assertEquals(queue.length, 1);
  flush();
  assertEquals(state.runs, 2);
});

Deno.test("createScheduler uses queueMicrotask by default", async () => {
  let runs = 0;
  const schedule = createScheduler(() => runs++, () => true);
  schedule();
  schedule();
  assertEquals(runs, 0);
  await Promise.resolve();
  assertEquals(runs, 1);
});

const A = dataKey("at://did:plc:a/app.bsky.feed.post/1", "https://public.api.bsky.app", 6);
const B = dataKey("at://did:plc:b/app.bsky.feed.post/2", "https://public.api.bsky.app", 6);
const BAD = dataKey("https://bsky.app/x", "https://public.api.bsky.app", 6);

function step(s: Partial<LoadState> & { wantedKey: string }) {
  return nextStep({ loadedKey: null, inFlightKey: null, viewDirty: false, ...s });
}

Deno.test("nextStep: first connection loads", () => {
  assertEquals(step({ wantedKey: A, viewDirty: true }), "load");
});

Deno.test("nextStep: reconnecting without changes does nothing", () => {
  assertEquals(step({ wantedKey: A, loadedKey: A }), "none");
});

Deno.test("nextStep: reconnecting after an aborted load loads again", () => {
  assertEquals(step({ wantedKey: A }), "load");
});

Deno.test("nextStep: a key change loads, with or without a request in flight", () => {
  assertEquals(step({ wantedKey: B, loadedKey: A }), "load");
  assertEquals(step({ wantedKey: B, inFlightKey: A }), "load");
});

Deno.test("nextStep: the key of the request in flight does nothing", () => {
  assertEquals(step({ wantedKey: A, inFlightKey: A }), "none");
});

Deno.test("nextStep: an invalid key loads, with or without a request in flight", () => {
  assertEquals(step({ wantedKey: BAD, loadedKey: A }), "load");
  assertEquals(step({ wantedKey: BAD, inFlightKey: A }), "load");
});

Deno.test("nextStep: going back to a previous key (A → B → A) loads", () => {
  // B started while A was in flight; A was aborted, so only B is in flight.
  assertEquals(step({ wantedKey: A, inFlightKey: B }), "load");
});

Deno.test("nextStep: a view change renders with data, and waits during a load", () => {
  assertEquals(step({ wantedKey: A, loadedKey: A, viewDirty: true }), "render");
  assertEquals(step({ wantedKey: A, inFlightKey: A, viewDirty: true }), "none");
});

Deno.test("dataKey tells threads apart by appview, URI and depth", () => {
  const uri = "at://did:plc:a/app.bsky.feed.post/1";
  assertEquals(dataKey(uri, "https://x", 6), dataKey(uri, "https://x", 6));
  assertEquals(dataKey(uri, "https://x", 6) === dataKey(uri, "https://x", 3), false);
  assertEquals(dataKey(uri, "https://x", 6) === dataKey(uri, "https://y", 6), false);
});

Deno.test("isInvalidKey marks missing and non-AT URIs", () => {
  assertEquals(isInvalidKey(dataKey(null, "https://x", 6)), true);
  assertEquals(isInvalidKey(dataKey("", "https://x", 6)), true);
  assertEquals(isInvalidKey(BAD), true);
  assertEquals(isInvalidKey(A), false);
});
