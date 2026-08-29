import { useNavigate } from "react-router";
import Button from "../components/Button.component";

export default function ErrorLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center bg-background">
      <h1 className="font-serif text-3xl">Something went sideways.</h1>
      <p className="text-sm text-muted-foreground">
        An unexpected error has occurred.
      </p>
      <Button variant="primary" onClick={() => navigate(-1)}>
        Go back
      </Button>
    </div>
  );
}
