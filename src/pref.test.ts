import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { readPref, writePref } from "./pref.ts";

/** Runs `fn` with `globalThis.localStorage` replaced by `get`, restoring it afterwards. */
function withStorage(get: () => Storage, fn: () => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get });
  try {
    fn();
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
  }
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

Deno.test("readPref returns null when nothing is stored", () => {
  const storage = memoryStorage();
  withStorage(() => storage, () => assertEquals(readPref(), null));
});

Deno.test("writePref stores the domain that readPref returns", () => {
  const storage = memoryStorage();
  withStorage(() => storage, () => {
    writePref("deer.social");
    assertEquals(readPref(), "deer.social");
  });
});

Deno.test("readPref and writePref do not throw when the storage property throws", () => {
  withStorage(() => {
    throw new DOMException("", "SecurityError");
  }, () => {
    writePref("deer.social");
    assertEquals(readPref(), null);
  });
});

Deno.test("readPref and writePref do not throw when storage methods throw", () => {
  const storage = memoryStorage();
  storage.getItem = () => {
    throw new DOMException("", "SecurityError");
  };
  storage.setItem = () => {
    throw new DOMException("", "QuotaExceededError");
  };
  withStorage(() => storage, () => {
    writePref("deer.social");
    assertEquals(readPref(), null);
  });
});
