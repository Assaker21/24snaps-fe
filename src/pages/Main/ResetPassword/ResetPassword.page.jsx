import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckIcon, KeyRoundIcon } from "lucide-react";
import Button from "../../../components/Button.component";
import Input from "../../../components/Input.component";
import TopBar from "../../../components/TopBar.component";
import authService from "../../../services/auth.service";

// Where the link in the reset password email lands. The token rides in the query
// string (the backend minted it, signed, with an hour to live) and goes straight back
// out in the `reset-password-token` header — nothing about it is stored, and the
// visitor is not signed in while any of this happens.
//
// The `?e=` alongside it is the emailLog tracker; the app carries it in the URL but
// has nothing to do with it.
const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmation) {
      setError("Those two passwords don't match.");
      return;
    }

    setSubmitting(true);
    setError("");

    const response = await authService.resetPassword(token, password);
    setSubmitting(false);

    if (!response.ok) {
      // An expired or already-spent link lands here, which is the common case months
      // after the fact — so the message points back at asking for a fresh one.
      setError(
        response.data?.message ||
          "That link didn't work. It may have expired — ask for a new one from your account page.",
      );
      return;
    }

    setDone(true);
  }

  return (
    <div className="w-full min-h-dvh flex flex-col pb-14">
      <TopBar />

      <div className="px-4 pt-6 max-w-md w-full mx-auto">
        <h1 className="font-serif text-4xl">Choose a new password</h1>

        {!token ? (
          <div className="flex flex-col items-start gap-4 bg-surface rounded-3xl p-6 mt-7">
            <p className="text-[0.95rem] text-muted-foreground leading-snug">
              This link is missing its reset code. Open the most recent
              &ldquo;Reset your Sawwerna password&rdquo; email again, or ask for a
              new link from your account page.
            </p>
            <Link to="/account">
              <Button variant="primary">Go to my account</Button>
            </Link>
          </div>
        ) : done ? (
          <>
            <div className="flex flex-row items-center gap-3 bg-success-soft border border-success-border rounded-2xl px-4 py-4 text-[0.95rem] text-success mt-7">
              <CheckIcon size={16} className="shrink-0" />
              <span className="leading-snug">
                Your password is updated. You can sign in with it now.
              </span>
            </div>
            <Button
              variant="primary"
              className="w-full justify-center mt-5"
              onClick={() => navigate("/")}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <p className="text-[0.95rem] text-muted-foreground leading-snug mt-3">
              Pick something you haven&apos;t used here before. This link stops
              working an hour after it was sent.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-7">
              <Input
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                icon={<KeyRoundIcon size={16} />}
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                icon={<KeyRoundIcon size={16} />}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />

              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full justify-center"
              >
                {submitting ? "Saving…" : "Save new password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
