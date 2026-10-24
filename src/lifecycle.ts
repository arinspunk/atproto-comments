/**
 * @module
 * When the element loads its thread and when it renders. DOM-free so it can be
 * tested outside the browser.
 *
 * Every entry point (connection, attribute change, `strings` assignment) only
 * schedules a run. Calls in the same task are batched into one microtask, and
 * the run decides whether to load, render or do nothing.
 */

/**
 * Batches calls into one microtask. `run` does not execute if `isConnected()`
 * is false when the microtask runs.
 */
export function createScheduler(
  run: () => void,
  isConnected: () => boolean,
  enqueue: (cb: () => void) => void = queueMicrotask,
): () => void {
  let pending = false;
  return () => {
    if (pending) return;
    pending = true;
    enqueue(() => {
      pending = false;
      if (isConnected()) run();
    });
  };
}

/** What a run must do: nothing, render the current data, or resolve the data for the wanted key. */
export type Step = "none" | "render" | "load";

/** Load state of the element, compared by data key. */
export interface LoadState {
  /** Data key from the current attributes. */
  wantedKey: string;
  /** Key of the data already resolved, or `null` if there is none. */
  loadedKey: string | null;
  /** Key of the request in flight, or `null` if there is none. */
  inFlightKey: string | null;
  /** `lang` or `strings` changed since the last render. */
  viewDirty: boolean;
}

/** Decides the next step from the load state. */
export function nextStep(s: LoadState): Step {
  // The response renders with the strings current when it arrives.
  if (s.wantedKey === s.inFlightKey) return "none";
  if (s.wantedKey !== s.loadedKey) return "load";
  return s.viewDirty ? "render" : "none";
}

const INVALID = "invalid";

/**
 * Data key for a thread. A missing `thread-uri`, or one that does not start
 * with `at://`, gets an `invalid` key that needs no request.
 */
export function dataKey(threadUri: string | null, appview: string, maxDepth: number): string {
  if (!threadUri || !threadUri.startsWith("at://")) return JSON.stringify([INVALID, threadUri]);
  return JSON.stringify(["thread", appview, threadUri, maxDepth]);
}

/** Whether `key` is the key of a missing or invalid `thread-uri`. */
export function isInvalidKey(key: string): boolean {
  return (JSON.parse(key) as unknown[])[0] === INVALID;
}
