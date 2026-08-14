import { Link } from "react-router";
import { useAuth } from "../../../../contexts/Auth.context";
import Button from "../../../../components/Button.component";

export default function HeaderSection() {
  const { user, isGuest, setOpen } = useAuth();

  return (
    <div className="w-screen flex flex-row justify-between items-center p-4 bg-white fixed top-0 left-0 z-200 ">
      <Link to="/" className="font-bold font-serif">
        24snaps
      </Link>

      <div className="flex flex-row items-center gap-3">
        <Link to="/films" className="text-sm font-medium">
          Films
        </Link>

        {isGuest ? (
          <Button
            variant="primary"
            className="text-sm py-2"
            onClick={() => setOpen(true)}
          >
            Sign in
          </Button>
        ) : (
          <span className="text-sm font-medium">
            {user?.firstName || "Account"}
          </span>
        )}
      </div>
    </div>
  );
}
