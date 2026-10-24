import { Link } from "react-router";
import {
  ApertureIcon,
  ArrowRightIcon,
  CircleUserRoundIcon,
  PlusIcon,
} from "lucide-react";
import Button from "../../../../components/Button.component";
import SectionLabel from "../../../../components/SectionLabel.component";
import { useAuth } from "../../../../contexts/Auth.context";
import { useT } from "../../../../contexts/I18n.context";
import LanguageSwitcher from "../../../../components/LanguageSwitcher.component";
import cn from "../../../../utils/cn.util";

// One destination in the footer's nav bar. Styled after the reference's bottom tab
// bar (UIUX/me.jpeg): a glyph over a wide-tracked uppercase label, on a lifted chip —
// the same shape, flipped onto the light theme like everything else.
function FooterLink({ icon, label, to, onClick }) {
  const className = cn(
    "flex flex-col items-center justify-center gap-2 flex-1 rounded-2xl py-5",
    "bg-background text-foreground cursor-pointer",
    "transition-transform duration-200 ease-out active:scale-95",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  const content = (
    <>
      {icon}
      <SectionLabel className="text-foreground text-[0.65rem]">
        {label}
      </SectionLabel>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function FooterSection() {
  const { user, isGuest, setOpen } = useAuth();
  const t = useT();

  return (
    <footer className="bg-surface rounded-t-[2rem] mt-16 px-5 pt-12 pb-9">
      <div className="max-w-3xl mx-auto flex flex-col">
        <img
          src="/logo.png"
          alt="Sawwerna"
          className="w-18 -ml-1 object-contain"
        />

        <h3 className="font-serif text-3xl max-w-md mt-4">
          {t("landing.footer.title")}
        </h3>

        <p className="text-[0.95rem] text-muted-foreground leading-snug max-w-md mt-5">
          {t("landing.footer.body")}
        </p>

        <Link to="/events/create" className="self-start mt-7">
          <Button variant="primary" size="lg">
            {t("landing.hero.cta")}
            <ArrowRightIcon size={16} className="rtl:-scale-x-100" />
          </Button>
        </Link>

        <div className="flex flex-row gap-2.5 mt-10">
          <FooterLink
            to="/events/create"
            icon={<PlusIcon size={20} />}
            label={t("nav.new")}
          />
          <FooterLink
            to="/events"
            icon={<ApertureIcon size={20} />}
            label={t("nav.events")}
          />
          {/* A guest has nothing to show on the account screen yet, so the same slot
              opens the sign-in sheet instead of navigating. */}
          {isGuest ? (
            <FooterLink
              onClick={() => setOpen(true)}
              icon={<CircleUserRoundIcon size={20} />}
              label={t("nav.signIn")}
            />
          ) : (
            <FooterLink
              to="/account"
              icon={<CircleUserRoundIcon size={20} />}
              label={user?.firstName || t("nav.account")}
            />
          )}
        </div>

        <div className="flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border mt-10 pt-6">
          <p className="text-xs text-subtle">
            {t("landing.footer.copyright", {
              year: new Date().getFullYear(),
              version: "0.5.1",
            })}
          </p>

          {/* The footer is where the switcher lives: every screen reaches the landing
              page through the wordmark, and putting it in the top bar would crowd the
              one row that already carries the account chip on a phone. */}
          <LanguageSwitcher />

          <p className="text-xs text-subtle italic">
            {t("common.noDownloadRequired")}
          </p>
        </div>
      </div>
    </footer>
  );
}
