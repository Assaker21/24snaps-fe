import { GlobeIcon } from "lucide-react";
import { useI18n } from "../contexts/I18n.context";
import cn from "../utils/cn.util";

// The one place a visitor can overrule the detection. It matters more than it looks:
// detection is a guess from a timezone and a phone's language list, and both are
// routinely wrong for the exact people this app is for — a Lebanese expat's phone in
// Dubai, a Saudi host whose device is set to English, a tourist in Beirut. Whatever is
// chosen here is remembered and never second-guessed again.
//
// Rendered as a native <select> on purpose: it is the one control that already knows
// how to open the right way on every phone, and it costs no layout in a bar that is
// already crowded.
export default function LanguageSwitcher({ className }) {
  const { locale, setLocale, locales, t } = useI18n();

  const entries = Object.entries(locales);

  return (
    <label
      className={cn(
        "relative flex flex-row items-center gap-1.5 shrink-0",
        "bg-surface text-foreground rounded-full ps-3 pe-2 py-2 text-sm font-medium",
        "cursor-pointer transition-colors hover:bg-surface-strong",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
        className,
      )}
    >
      <GlobeIcon size={15} className="shrink-0 opacity-70" />

      {/* The label the user reads is each language's name *in that language* — the
          one word someone who can't read the current locale will still recognise. */}
      <span aria-hidden className="whitespace-nowrap">
        {locales[locale]?.native || locale}
      </span>

      <select
        aria-label={t("lang.switch")}
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {entries.map(([code, config]) => (
          <option key={code} value={code}>
            {config.native}
            {config.native !== config.label ? ` — ${config.label}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
