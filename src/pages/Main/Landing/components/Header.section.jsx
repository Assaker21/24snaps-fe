import { Link } from "react-router";
import Button from "../../../../components/Button.component";
import TopBar from "../../../../components/TopBar.component";
import { useT } from "../../../../contexts/I18n.context";

// The landing page's bar is the shared one — this wrapper only names the action that
// belongs to this screen.
export default function HeaderSection() {
  const t = useT();

  return (
    <TopBar
      actions={
        <Link to="/events">
          <Button variant="secondary" size="sm">
            {t("nav.events")}
          </Button>
        </Link>
      }
    />
  );
}
