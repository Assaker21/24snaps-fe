import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import catalogue from "../locales/strings.json";
import { translate } from "../i18n/translate";
import {
  localeFor,
  prefersArabic,
  refineRegion,
  resolveLocale,
  storeLocale,
} from "../i18n/resolveLocale";

// Every piece of copy in the app comes through here. a `t(key)` call reads
// src/locales/strings.json, which is the one file anyone editing the wording touches.
//
// The provider also owns the two things a language implies beyond its words: the
// document's `lang`/`dir`, and — for Arabic — the webfonts, which are only fetched when
// an Arabic locale is actually in use so the English majority never pays for them.

const I18nContext = createContext(null);

// Arabic needs its own faces: neither Outfit nor the Beirut/Rosemartin display family
// carries Arabic glyphs, so without these the Arabic copy falls back to whatever the
// device happens to have and the whole page changes texture. Injected on demand rather
// than linked in index.html, since the large majority of visitors never need them.
const ARABIC_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap";

function ensureArabicFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById("arabic-fonts")) return;

  const link = document.createElement("link");
  link.id = "arabic-fonts";
  link.rel = "stylesheet";
  link.href = ARABIC_FONT_HREF;
  document.head.appendChild(link);
}

export function I18nProvider({ children }) {
  // Resolved before the first paint, from the device's own timezone and language
  // list — both synchronous — so nothing ever renders in the wrong language and then
  // swaps. See src/i18n/resolveLocale.js.
  const [state, setState] = useState(() => resolveLocale(catalogue));
  const locale = state.locale;
  const config = catalogue.locales[locale] || catalogue.locales.en;

  // A timezone can be wrong; Cloudflare's view of where the request came from is not.
  // This runs once, after the first paint, and only ever corrects a *detected* locale —
  // an explicit choice is never second-guessed, and neither is the language preference,
  // which is the device's business and not the network's.
  useEffect(() => {
    if (state.source !== "detected") return;

    const controller = new AbortController();

    refineRegion(catalogue, { signal: controller.signal }).then((region) => {
      if (!region || region === state.region) return;

      const corrected = localeFor(catalogue, region, prefersArabic());
      setState((previous) =>
        previous.source === "detected" && previous.locale !== corrected
          ? { ...previous, locale: corrected, region }
          : previous,
      );
    });

    return () => controller.abort();
  }, [state.source, state.region]);

  // `lang` is what a screen reader picks its voice from and what Google reads the page
  // as; `dir` is what flips the entire layout. Both belong on <html>, not on a wrapper,
  // because the sheets and dialogs render through portals outside the React tree.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = config.htmlLang || locale;
    root.dir = config.dir || "ltr";

    if (config.dir === "rtl") ensureArabicFonts();
  }, [locale, config.htmlLang, config.dir]);

  const setLocale = useCallback((next) => {
    if (!catalogue.locales[next]) return;
    storeLocale(next);
    setState({ locale: next, source: "stored" });
  }, []);

  const t = useCallback(
    (key, vars) => translate(catalogue, locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      t,
      locale,
      // The BCP-47 tag to hand Intl for dates, numbers and plurals. Kept separate from
      // the catalogue key because `en-LB` is ours, not a formatting locale — Lebanese
      // English still wants ordinary English dates.
      formatLocale: config.formatLocale || locale,
      dir: config.dir || "ltr",
      isRtl: config.dir === "rtl",
      setLocale,
      locales: catalogue.locales,
    }),
    [t, locale, config.formatLocale, config.dir, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}

// The common case by far — a component that only needs the words.
export function useT() {
  return useI18n().t;
}
