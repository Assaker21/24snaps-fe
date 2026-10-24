// Looking a string up in the catalogue.
//
// The catalogue (src/locales/strings.json) is keyed by string, not by locale — one row
// carries every language side by side, so whoever edits the copy sees all four variants
// of a sentence together and can tell at a glance which are missing. The cost of that
// shape is this lookup, which walks a fallback chain per key rather than per file.

// Where a locale falls back to when it has nothing of its own. Saudi Arabic falls back
// to fus7a rather than to English, so the Saudi column only has to carry the lines
// where the dialect actually differs — everything else is inherited.
export function fallbackChain(catalogue, locale) {
  const chain = [];
  let current = locale;

  while (current && !chain.includes(current)) {
    chain.push(current);
    current = catalogue.locales?.[current]?.fallback ?? null;
  }

  // Belt and braces: English is always the last resort, even for a locale whose
  // fallback was left out of the catalogue.
  if (!chain.includes("en")) chain.push("en");

  return chain;
}

// `{name}` — deliberately not a template engine. Anything a string needs beyond
// substitution (a link, an emphasis) belongs in the component, not in the catalogue.
function interpolate(template, vars) {
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

// A string whose value is an object is a plural set. Arabic has six categories
// (zero/one/two/few/many/other) against English's two, which is exactly why this is
// resolved with Intl.PluralRules rather than an `n === 1` check — a hand-rolled
// pluraliser produces "٣ لحظات" where Arabic wants "٣ لحظات" but "١١ لحظة".
function selectPlural(forms, locale, count) {
  if (count == null) return forms.other ?? forms.one ?? "";

  let category;
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    category = count === 1 ? "one" : "other";
  }

  // `=0` is an explicit exact-match override ("No moments yet" rather than
  // "0 moments"), which no plural category can express.
  return (
    forms[`=${count}`] ??
    forms[category] ??
    forms.other ??
    forms.one ??
    ""
  );
}

// Resolves one key. Returns the key itself when nothing matches, which is loud enough
// to catch in review and harmless enough not to blank out a screen in production.
export function translate(catalogue, locale, key, vars) {
  const row = catalogue.strings?.[key];

  if (row === undefined) {
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }

  for (const candidate of fallbackChain(catalogue, locale)) {
    const value = row[candidate];
    if (value === undefined || value === null) continue;

    if (typeof value === "object") {
      return interpolate(selectPlural(value, candidate, vars?.count), vars);
    }

    return interpolate(value, vars);
  }

  if (import.meta.env?.DEV) {
    console.warn(`[i18n] key "${key}" has no value for "${locale}" or its fallbacks`);
  }
  return key;
}
