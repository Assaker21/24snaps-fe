import { SmartphoneIcon } from "lucide-react";
import cn from "../utils/cn.util";
import { useT } from "../contexts/I18n.context";

// "Open in app" — the one place the website hands a visitor over to the native apps.
//
// It is deliberately **the same https URL this page is already at**, not a custom
// scheme. Both apps claim these paths (Android App Links, iOS universal links), so the
// link resolves to the app when it is installed and to the web app when it isn't — no
// scheme to fail silently, no "app not installed" dead end, and nothing to keep in step
// when a route changes.
//
// Two things are load-bearing:
//
//  - It is a real `<a href>`, never a router navigation. An in-app SPA transition never
//    leaves the page, so the OS never gets the chance to intercept it and the link
//    quietly does nothing.
//  - `rel="nofollow"` and no `target`: the whole point is to leave this tab.

// Only phones have an app to open, so a desktop visitor is shown nothing rather than a
// button that cannot work. The user-agent is a guess, which is exactly why this is the
// one thing it decides — a cosmetic one, with a harmless wrong answer.
function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function OpenInApp({ path, className, tone = "light" }) {
  const t = useT();

  if (!isMobile()) return null;

  // Built from the current origin rather than a hardcoded domain, so a tunnel host or
  // a staging domain links to itself instead of sending a tester to production.
  const href = `${window.location.origin}${path || window.location.pathname}`;

  return (
    <a
      href={href}
      rel="nofollow"
      className={cn(
        "flex flex-row items-center justify-center gap-2 rounded-full",
        "text-sm font-medium whitespace-nowrap select-none",
        "transition-[transform,filter,background-color] duration-200 ease-out",
        "active:scale-95 active:duration-75",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        tone === "dark"
          ? "bg-white/15 text-white backdrop-blur-sm py-3 px-5"
          : "bg-surface text-foreground hover:bg-surface-strong py-2 px-3.5",
        className,
      )}
    >
      <SmartphoneIcon size={16} />
      {t("nav.openInApp")}
    </a>
  );
}
