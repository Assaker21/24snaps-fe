import { Link } from "react-router";
import { useAuth } from "../../../../contexts/Auth.context";
import Button from "../../../../components/Button.component";

export default function HeaderSection() {
  const { user, isGuest, setOpen } = useAuth();

  return (
    <div className="w-full flex flex-row justify-between items-center px-4 py-3 bg-background/90 backdrop-blur-md sticky top-0 z-200">
      {/* The mark is a black-on-white wordmark, so it drops straight onto the
          light theme — scaled up to eat its own generous file padding. */}
      <Link to="/" aria-label="24snaps home">
        <img src="/logo.jpg" alt="24snaps" className="size-14 -my-2 object-contain" />
      </Link>

      <div className="flex flex-row items-center gap-2">
        <Link to="/events">
          <Button variant="secondary" size="sm">
            Events
          </Button>
        </Link>

        {isGuest ? (
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            Sign in
          </Button>
        ) : (
          <Link to="/account">
            <Button variant="secondary" size="sm">
              {user?.firstName || "Account"}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
