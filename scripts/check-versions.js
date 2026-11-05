// Fails if the release version differs between package.json, package-lock.json,
// deno.json, the browser tests' lockfile and the README pins, or if the README's
// major-version pins (`atproto-comments@N/`, "`@N` gets every N.x …, never a
// breaking M.0") are not for package.json's major. With `--tag <ref>` the tag
// (without its leading `v`) must match too.
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const pkg = json("package.json");
const lock = json("package-lock.json");
const found = [
  ["package-lock.json (version)", lock.version],
  ['package-lock.json (packages[""].version)', lock.packages?.[""]?.version],
  ["deno.json", json("deno.json").version],
  // The browser tests link the package itself; npm records its version there.
  ["tests/browser/package-lock.json (../..)", json("tests/browser/package-lock.json").packages?.["../.."]?.version],
];

// Only versions tied to the package count as pins: other tools may appear in
// the README with their own versions.
const PIN = /atproto-comments@(\d+\.\d+\.\d+)|atproto-comments\/(\d+\.\d+\.\d+)\/|`@(\d+\.\d+\.\d+)`/g;
const readme = read("README.md").split("\n");
let pins = 0;
readme.forEach((line, i) => {
  for (const m of line.matchAll(PIN)) {
    pins++;
    found.push([`README.md:${i + 1}`, m[1] ?? m[2] ?? m[3]]);
  }
});

// Major-version pins: CDN URLs and the sentence that explains them.
const major = pkg.version.split(".")[0];
const MAJOR_PIN = /atproto-comments@(\d+)\//g;
const MAJOR_PROSE = /`@(\d+)` gets every (\d+)\.x\b.*?never a breaking (\d+)\.0/g;
const majorProblems = [];
let majorPins = 0;
readme.forEach((line, i) => {
  const where = `README.md:${i + 1}`;
  for (const m of line.matchAll(MAJOR_PIN)) {
    majorPins++;
    if (m[1] !== major) majorProblems.push([where, `@${m[1]}/ (major pin)`]);
  }
  for (const m of line.matchAll(MAJOR_PROSE)) {
    majorPins++;
    if (m[1] !== major || m[2] !== major || m[3] !== String(Number(major) + 1)) {
      majorProblems.push([where, `"\`@${m[1]}\` gets every ${m[2]}.x …, never a breaking ${m[3]}.0"`]);
    }
  }
});

// A malformed argument must not silently skip the tag check.
const args = process.argv.slice(2);
if (args.length > 0) {
  if (args.length !== 2 || args[0] !== "--tag" || !args[1]) {
    console.error(`Usage: node scripts/check-versions.js [--tag <ref>] (got: ${args.join(" ")})`);
    process.exit(2);
  }
  found.push(["tag", args[1].replace(/^v/, "")]);
}

const problems = [...found.filter(([, v]) => v !== pkg.version), ...majorProblems];
if (pins === 0) problems.push(["README.md", "no version pins found"]);
if (majorPins === 0) problems.push(["README.md", "no major version pins found"]);

if (problems.length > 0) {
  console.error(`Version mismatch: package.json is ${pkg.version}`);
  for (const [where, value] of problems) console.error(`  ${where}: ${value}`);
  if (problems.some(([where]) => where.startsWith("tests/browser"))) {
    console.error("Refresh it with: npm install --package-lock-only --prefix tests/browser");
  }
  process.exit(1);
}
console.log(`Versions match: ${pkg.version} (${pins} README pins, ${majorPins} major pins)`);
