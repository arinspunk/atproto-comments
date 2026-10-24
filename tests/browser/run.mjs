// Runs every browser scenario in Chromium and WebKit against the repo's dist/.
// From the repo root: `npm run test:browser` (builds first). Exits with 1 if a
// scenario fails.
//
// First time only: npx --prefix tests/browser playwright-core install chromium webkit
//
// Optional environment variables:
//   BROWSERS=chromium,webkit    engines to run (default: both)
//   ONLY=lifecycle,picker       suites to run (default: all)
//   CHROMIUM_PATH=/path/chrome  an installed Chromium instead of Playwright's

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium, webkit } from "playwright-core";
import { DIST, matches, openPage } from "./harness.mjs";

const HERE = resolve(fileURLToPath(import.meta.url), "..");
const ENGINES = { chromium, webkit };
const list = (v, all) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : all);
const BROWSERS = list(process.env.BROWSERS, ["chromium", "webkit"]);
const SUITES = list(process.env.ONLY, ["lifecycle", "picker", "entrypoints", "preference", "details", "svelte"]);

if (!existsSync(resolve(DIST, "element.js"))) {
  console.error("dist/ is missing: run `npm run build` first (or `npm run test:browser`).");
  process.exit(1);
}
if (SUITES.includes("svelte")) await build({ configFile: resolve(HERE, "svelte/vite.config.mjs") });

const suites = [];
for (const name of SUITES) suites.push([name, (await import(`./${name}.mjs`)).scenarios]);

let failed = 0;
for (const engineName of BROWSERS) {
  const engine = ENGINES[engineName];
  if (!engine) throw new Error(`Unknown engine: ${engineName}`);
  const browser = await engine.launch(
    engineName === "chromium" && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  for (const [suite, scenarios] of suites) {
    for (const scenario of scenarios) {
      const { page, errors } = await openPage(browser, scenario);
      let actual;
      try {
        actual = scenario.run ? await scenario.run(page) : await page.evaluate(scenario.evaluate);
      } catch (e) {
        actual = { exception: e.message };
      }
      await page.waitForTimeout(30);
      const ok = matches(actual, scenario.expected) && errors.length === 0;
      if (!ok) failed++;
      console.log(`${ok ? "ok  " : "FAIL"} [${engineName}] ${suite}: ${scenario.name}`);
      if (!ok) {
        console.log("     expected:", JSON.stringify(scenario.expected));
        console.log("     actual:  ", JSON.stringify(actual));
        if (errors.length) console.log("     errors:  ", errors.join(" | "));
      }
      await page.close();
    }
  }
  await browser.close();
}
console.log(failed ? `\n${failed} scenario(s) failed` : "\nAll scenarios pass");
process.exit(failed ? 1 : 0);
