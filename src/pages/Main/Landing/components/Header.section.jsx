import { Link } from "react-router";
import Button from "../../../../components/Button.component";
import TopBar from "../../../../components/TopBar.component";

// The landing page's bar is the shared one — this wrapper only names the action that
// belongs to this screen.
export default function HeaderSection() {
  return (
    <TopBar
      actions={
        <Link to="/events">
          <Button variant="secondary" size="sm">
            Events
          </Button>
        </Link>
      }
    />
  );
}
