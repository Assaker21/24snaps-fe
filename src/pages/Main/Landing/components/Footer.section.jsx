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

  return (
    <footer className="bg-surface rounded-t-[2rem] mt-16 px-5 pt-12 pb-9">
      <div className="max-w-3xl mx-auto flex flex-col">
        <img
          src="/logo.jpg"
          alt="Souwar Helwe"
          className="size-14 -ml-1 object-contain"
        />

        <h3 className="font-serif text-3xl max-w-md mt-4">
          A single day becomes timeless, when remembered together.
        </h3>

        <p className="text-[0.95rem] text-muted-foreground leading-snug max-w-md mt-5">
          Hand your guests a disposable camera that lives in their browser. No
          download, no account, no photo left on someone else&apos;s phone.
        </p>

        <Link to="/events/create" className="self-start mt-7">
          <Button variant="primary" size="lg">
            Create your event
            <ArrowRightIcon size={16} />
          </Button>
        </Link>

        <div className="flex flex-row gap-2.5 mt-10">
          <FooterLink
            to="/events/create"
            icon={<PlusIcon size={20} />}
            label="New"
          />
          <FooterLink
            to="/events"
            icon={<ApertureIcon size={20} />}
            label="Events"
          />
          {/* A guest has nothing to show on the account screen yet, so the same slot
              opens the sign-in sheet instead of navigating. */}
          {isGuest ? (
            <FooterLink
              onClick={() => setOpen(true)}
              icon={<CircleUserRoundIcon size={20} />}
              label="Sign in"
            />
          ) : (
            <FooterLink
              to="/account"
              icon={<CircleUserRoundIcon size={20} />}
              label={user?.firstName || "Account"}
            />
          )}
        </div>

        <div className="flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border mt-10 pt-6">
          <p className="text-xs text-subtle">
            © {new Date().getFullYear()} Souwar Helwe
          </p>
          <p className="text-xs text-subtle italic">No download required.</p>
        </div>
      </div>
    </footer>
  );
}
