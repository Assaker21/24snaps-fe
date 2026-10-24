import { Link } from "react-router";
import { useAuth } from "../contexts/Auth.context";
import { useT } from "../contexts/I18n.context";
import Button from "./Button.component";
import cn from "../utils/cn.util";

// The landing page's bar, lifted out so every screen wears the same one: the wordmark
// on the left, a row of pill buttons on the right, the account chip always last and
// always the same shape. Pages vary only what they hand to `left` and `actions`.
export default function TopBar({ left, actions, className }) {
  const { user, isGuest, loading, setOpen } = useAuth();
  const t = useT();

  return (
    <div
      className={cn(
        "w-full flex flex-row justify-between items-center gap-2 px-4 py-3 shrink-0",
        "bg-background/90 backdrop-blur-md sticky top-0 z-200",
        className,
      )}
    >
      <div className="flex flex-row items-center gap-1.5 min-w-0">
        {left}
        {/* The transparent PNG, not the JPEG beside it: identical artwork at
            identical dimensions, but a bar that has been made see-through over a
            photo (ManageEvent's hero) would otherwise show the JPEG's white plate
            as a rectangle around the wordmark. On an opaque bar the two are
            indistinguishable. Scaled up to eat its own generous file padding. */}
        <Link to="/" aria-label={t("nav.home")}>
          <img
            src="/logo.png"
            alt="Sawwerna"
            className="w-18 -my-2 object-contain"
          />
        </Link>
      </div>

      <div className="flex flex-row items-center gap-2">
        {actions}

        {/* Auth resolves a request or two after first paint, and until it does we know
            neither the name nor whether there is one. Showing either would make the bar
            flip the moment it lands, so it holds the chip's shape as a pulsing
            placeholder instead. */}
        {loading ? (
          <span
            role="status"
            aria-label={t("nav.signingYouIn")}
            className="h-9 w-24 rounded-full bg-surface-strong animate-pulse"
          />
        ) : isGuest ? (
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            {t("nav.signIn")}
          </Button>
        ) : (
          <Link to="/account">
            <Button variant="secondary" size="sm" className="max-w-40">
              <span className="truncate">
                {user?.firstName || t("nav.account")}
              </span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
