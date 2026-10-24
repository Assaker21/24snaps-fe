import { useNavigate } from "react-router";
import Button from "../components/Button.component";
import { useT } from "../contexts/I18n.context";

export default function ErrorLayout() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center bg-background">
      <h1 className="font-serif text-3xl">{t("error.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("error.body")}</p>
      <Button variant="primary" onClick={() => navigate(-1)}>
        {t("error.goBack")}
      </Button>
    </div>
  );
}
