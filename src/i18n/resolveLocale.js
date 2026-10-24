// Deciding which of the four locales a visitor gets.
//
// Two independent facts decide it, and they are genuinely independent: *where* someone
// is and *what language their device is set to*. A Lebanese phone set to English is a
// different answer from a Lebanese phone set to Arabic, and an English-set phone in
// Riyadh is a different answer again. The catalogue's `regions` block holds the mapping
// so adding a country is a JSON edit, not a code change.
//
// Everything here is synchronous and offline. The region comes from the device's own
// timezone, which needs no network, no IP lookup, and no consent banner — and which a
// traveller's phone reports correctly the moment they land. `refineRegion` below is the
// optional second opinion for the case timezone gets wrong (a device left on the wrong
// zone), and it only ever runs after the first paint.

const STORAGE_KEY = "locale";

// What the visitor's device says it wants, most-preferred first. `navigator.languages`
// is the full ordered list; `navigator.language` is only the top one, which is why both
// are read.
function deviceLanguages() {
  if (typeof navigator === "undefined") return [];
  const list = navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter(Boolean);
  return list.map((tag) => String(tag).toLowerCase());
}

// Arabic anywhere in the preference list, not just at the top: a phone set to
// ["en-GB", "ar"] belongs to someone who reads both, and in Beirut or Riyadh the
// Arabic copy is the one written for them.
function prefersArabic(languages = deviceLanguages()) {
  return languages.some((tag) => tag === "ar" || tag.startsWith("ar-"));
}

// The country, from the timezone the device is already keeping. A phone in Beirut
// reports Asia/Beirut whatever its language is set to.
function regionFromTimeZone(catalogue) {
  let zone;
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
  if (!zone) return null;

  for (const [code, region] of Object.entries(catalogue.regions || {})) {
    if (region.timezones?.includes(zone)) return code;
  }
  return null;
}

// The country named in a language tag — `ar-LB`, `en-SA`. Weaker than the timezone
// (most devices report a bare `ar` or `en`), but it is the one signal a device with a
// misconfigured clock still gets right.
function regionFromLanguageTags(catalogue, languages = deviceLanguages()) {
  const known = Object.keys(catalogue.regions || {});

  for (const tag of languages) {
    const parts = tag.split("-");
    if (parts.length < 2) continue;
    const code = parts[1].toUpperCase();
    if (known.includes(code)) return code;
  }
  return null;
}

export function detectRegion(catalogue) {
  return (
    regionFromTimeZone(catalogue) || regionFromLanguageTags(catalogue) || null
  );
}

// Region + language preference -> locale. A region we don't localise for, or one whose
// mapping has no entry for the preferred language, lands on the catalogue's default.
export function localeFor(catalogue, region, arabic) {
  const mapping = catalogue.regions?.[region];
  const fallback = catalogue.defaultLocale || "en";

  if (!mapping) return fallback;

  const chosen = arabic ? mapping.arabic : mapping.english;
  return chosen && catalogue.locales?.[chosen] ? chosen : fallback;
}

export function storedLocale(catalogue) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && catalogue.locales?.[saved] ? saved : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale) {
  try {
    if (locale) localStorage.setItem(STORAGE_KEY, locale);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // A private window with storage blocked still gets the right language, it just
    // can't remember an override between visits.
  }
}

// The answer the very first render uses. An explicit choice always wins — someone who
// switched to English in Beirut meant it, and no amount of geography overrules that.
export function resolveLocale(catalogue) {
  const saved = storedLocale(catalogue);
  if (saved) return { locale: saved, source: "stored" };

  const region = detectRegion(catalogue);
  const arabic = prefersArabic();

  return { locale: localeFor(catalogue, region, arabic), source: "detected", region };
}

// The optional second opinion, for a device whose timezone is wrong. Cloudflare serves
// /cdn-cgi/trace on every proxied domain and names the visitor's country in it, so this
// costs one tiny same-origin request and no third party. It resolves to null anywhere
// that isn't behind Cloudflare — dev included — which is why nothing waits on it.
export async function refineRegion(catalogue, { signal } = {}) {
  try {
    const response = await fetch("/cdn-cgi/trace", { signal });
    if (!response.ok) return null;

    const text = await response.text();
    const match = text.match(/^loc=([A-Z]{2})$/m);
    const code = match?.[1];

    return code && catalogue.regions?.[code] ? code : null;
  } catch {
    return null;
  }
}

export { prefersArabic, deviceLanguages };
