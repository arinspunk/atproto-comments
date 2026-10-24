// Server for checking by hand in browsers Playwright can't drive (Firefox,
// Safari, iOS). Serves the repo's dist/, the pages in manual/ and a mock AppView.
//
//   npm run build && node tests/browser/server.mjs     (PORT=8765 by default)
//
// Then open http://localhost:8765/ (or the machine's LAN address from a phone).
// Posts: "<name>" returns two replies tagged with the name, "<name>~<ms>" delays the
// response, "e500" answers HTTP 500.

import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { DIST } from "./harness.mjs";

const PORT = Number(process.env.PORT ?? 8765);
const MANUAL = resolve(import.meta.dirname, "manual");
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8" };

const reply = (name, i) => ({
  $type: "app.bsky.feed.defs#threadViewPost",
  post: {
    uri: `at://did:plc:r${i}/app.bsky.feed.post/${name}-${i}`,
    author: { did: `did:plc:r${i}`, handle: `user${i}.bsky.social`, displayName: `User ${i}` },
    record: { text: `reply ${i} of ${name}`, createdAt: `2020-01-0${i}T10:00:00.000Z` },
  },
});

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.endsWith("/xrpc/app.bsky.feed.getPostThread")) {
    const [name, delay = "0"] = url.searchParams.get("uri").split("/").pop().split("~");
    setTimeout(() => {
      res.setHeader("access-control-allow-origin", "*");
      if (name === "e500") {
        res.statusCode = 500;
        return res.end("{}");
      }
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        thread: {
          $type: "app.bsky.feed.defs#threadViewPost",
          post: { uri: url.searchParams.get("uri") },
          replies: [reply(name, 1), reply(name, 2)],
        },
      }));
    }, Number(delay));
    return;
  }
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const manual = resolve(MANUAL, path.slice(1));
  const file = existsSync(manual) ? manual : resolve(DIST, path.slice(1));
  try {
    const body = readFileSync(file);
    res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(PORT, () => console.log(`Manual test pages on http://localhost:${PORT}/`));
