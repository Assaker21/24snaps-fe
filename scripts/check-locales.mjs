// Guards the string catalogue. Run with `npm run check:locales`.
//
// Four things go wrong with a catalogue like this and none of them show up in a build:
// a key referenced from a component that doesn't exist in the file, a key in the file
// nothing uses any more, a translation that dropped a {placeholder} the English has,
// and an Arabic plural set missing a category Arabic actually uses. All four are
// cheap to check and expensive to find by eye.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogue = JSON.parse(
  readFileSync(join(root, "src/locales/strings.json"), "utf8"),
);

const locales = Object.keys(catalogue.locales);
const keys = Object.keys(catalogue.strings);
const problems = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "backups") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(jsx?|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const sources = walk(join(root, "src"));
const used = new Set();
// `t("a.b")` and `t(\`a.b${x}\`)` — the template form is recorded as a prefix so the
// dynamic keys (pay.${id}.name, landing.how.${step}.title) aren't reported missing.
const prefixes = new Set();

for (const file of sources) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\bt\(\s*"([\w.]+)"/g)) used.add(m[1]);
  for (const m of text.matchAll(/\bt\(\s*`([\w.]*)\$\{/g)) prefixes.add(m[1]);
  // Keys passed as props rather than called directly (confirmLabelKey="pay.x").
  for (const m of text.matchAll(/\w+Key="([\w.]+)"/g)) used.add(m[1]);
  // Keys built into a variable first and handed to t() later — the suggestion list
  // and the sign-in sheet's titles both do this, and a prefix match is the only way
  // to see them without evaluating the code.
  for (const m of text.matchAll(/`([\w.]*)\$\{/g)) prefixes.add(m[1]);
  // Keys sitting in a lookup table (TITLE_KEYS = { email: "auth.title.email" }).
  for (const m of text.matchAll(/:\s*"([a-z][\w]*(?:\.[\w]+)+)"/g)) used.add(m[1]);
}

const coveredByPrefix = (key) =>
  [...prefixes].some((p) => p && key.startsWith(p));

// 1. Referenced but absent.
for (const key of used) {
  if (!catalogue.strings[key]) problems.push(`MISSING  ${key} — used in code, not in strings.json`);
}

// 2. Present but unreferenced.
for (const key of keys) {
  if (!used.has(key) && !coveredByPrefix(key)) {
    problems.push(`UNUSED   ${key} — in strings.json, not referenced anywhere`);
  }
}

// 3. Placeholder parity against English. `{count}` is exempt: it is supplied by the
//    plural machinery and a language may legitimately not repeat it ("لحظة واحدة").
const placeholders = (value) => {
  const texts = typeof value === "string" ? [value] : Object.values(value || {});
  const found = new Set();
  for (const text of texts) {
    for (const m of String(text).matchAll(/\{(\w+)\}/g)) {
      if (m[1] !== "count") found.add(m[1]);
    }
  }
  return [...found].sort().join(",");
};

for (const key of keys) {
  const row = catalogue.strings[key];
  if (row.en === undefined) {
    problems.push(`NO-EN    ${key} — every row needs an English value to fall back to`);
    continue;
  }
  const expected = placeholders(row.en);
  for (const locale of locales) {
    if (locale === "en" || row[locale] === undefined) continue;
    const got = placeholders(row[locale]);
    if (got !== expected) {
      problems.push(
        `PLACEHOLDER ${key} [${locale}] — expected {${expected || "none"}}, got {${got || "none"}}`,
      );
    }
  }
}

// 4. Arabic plural coverage. Intl will fall back to `other`, but an Arabic sentence
//    built from the `other` form for a count of two reads wrong.
const ARABIC_CATEGORIES = ["one", "two", "few", "many", "other"];
for (const key of keys) {
  const row = catalogue.strings[key];
  for (const locale of locales) {
    const value = row[locale];
    if (!value || typeof value !== "object") continue;
    if (!locale.startsWith("ar")) continue;
    const missing = ARABIC_CATEGORIES.filter((c) => value[c] === undefined);
    if (missing.length) {
      problems.push(`PLURAL   ${key} [${locale}] — missing ${missing.join("/")}`);
    }
  }
}

const counts = Object.fromEntries(
  locales.map((l) => [l, keys.filter((k) => catalogue.strings[k][l] !== undefined).length]),
);

console.log(`${keys.length} keys, ${locales.length} locales`);
for (const [locale, n] of Object.entries(counts)) {
  const inherited = keys.length - n;
  console.log(
    `  ${locale.padEnd(6)} ${String(n).padStart(4)} own` +
      (inherited ? `, ${inherited} inherited` : ""),
  );
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

console.log("\nno problems.");
