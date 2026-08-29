import { useEffect, useState } from "react";
import Button from "../../components/Button.component";
import Input from "../../components/Input.component";
import Sheet from "../../components/Sheet.component";
import { useGoogleLogin } from "@react-oauth/google";
import { useSearchParams, useNavigate } from "react-router";
import authService from "../../services/auth.service.js";
import DisplayNamePopup from "./DisplayName.popup";
import { useAuth } from "../../contexts/Auth.context";

const TITLES = {
  email: "Sign up to continue viewing your memories",
  password: "Enter your password",
  register: "Create your account",
};

// "email"    — just asks for an email, then figures out what to do next.
// "password" — email already has a password account, ask for the password.
// "register" — email has never been seen before, ask for name + password too.
// (An email tied to a Google account never lands on a step here — it goes
// straight into the Google popup instead, see handleEmailContinue below.)
export default function LoginPopup({ open, setOpen }) {
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The account a Google *sign-up* just created, which is the only case that gets
  // asked to confirm its display name. Null the rest of the time.
  const [newGoogleUser, setNewGoogleUser] = useState(null);

  // Reset back to a fresh flow whenever the popup transitions from closed to
  // open. Adjusted during render (React's documented pattern for resetting
  // state on a prop change) rather than in an effect, so it commits in the
  // same render instead of flashing the previous step first.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep("email");
      setPassword("");
      setFirstName("");
      setLastName("");
      setError("");
    }
  }

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: window.location.origin,
  });

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      submitGoogleCode(code);
    }
  }, [searchParams.get("code")]);

  // Returns the account it just signed in as, so a caller can follow up on it —
  // `user` is null when /me could not be reached, even though the sign-in itself
  // succeeded.
  async function completeAuth(response) {
    if (!response.ok) {
      setError(response.data?.message || "Something went wrong");
      return { ok: false, user: null };
    }

    const accessToken = response.data.accessToken?.replace("Bearer ", "");
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }

    const meResponse = await authService.me();
    if (meResponse.ok) {
      setUser(meResponse.data);
    }

    setOpen(false);
    setError("");
    return { ok: true, user: meResponse.ok ? meResponse.data : null };
  }

  async function submitGoogleCode(code) {
    const response = await authService.login({
      google: { code },
    });

    const { ok, user } = await completeAuth(response);
    if (!ok) return;

    // Clean the ?code= param left by the Google redirect
    navigate(window.location.pathname, { replace: true });

    // Only a sign-up gets the name sheet (the backend tells us which this was) —
    // asking a returning user to re-confirm their name every time would be noise.
    if (response.data.isNewUser && user) setNewGoogleUser(user);
  }

  async function handleEmailContinue(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await authService.checkEmail(email);
    setSubmitting(false);

    if (!response.ok) {
      setError(response.data?.message || "Something went wrong");
      return;
    }

    if (response.data.exists && response.data.sso) {
      googleLogin();
      return;
    }

    setStep(response.data.exists ? "password" : "register");
  }

  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await authService.login({
      email,
      password,
      ...(step === "register" ? { firstName, lastName } : {}),
    });

    await completeAuth(response);
    setSubmitting(false);
  }

  function backToEmail() {
    setStep("email");
    setPassword("");
    setFirstName("");
    setLastName("");
    setError("");
  }

  return (
    <>
      <Sheet
        open={open}
        setOpen={setOpen}
        title={TITLES[step]}
        onBack={step === "email" ? undefined : backToEmail}
        description={
          step === "email"
            ? "You are currently on guest mode. Create an account to view the remaining photos."
            : undefined
        }
      >
        {step === "email" && (
          <>
            <div className="flex flex-row items-center w-full justify-center pt-8 pb-6">
              <Button variant="outline" onClick={() => googleLogin()}>
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  className="block size-5"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                Sign in with Google
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs text-subtle pb-5">
              <div className="flex-1 h-px bg-border" />
              or
              <div className="flex-1 h-px bg-border" />
            </div>

            <form
              onSubmit={handleEmailContinue}
              className="flex flex-col gap-3"
            >
              <Input
                type="email"
                placeholder="Email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && <p className="text-sm text-danger">{error}</p>}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full justify-center"
              >
                {submitting ? "Please wait…" : "Continue"}
              </Button>
            </form>
          </>
        )}

        {(step === "password" || step === "register") && (
          <form
            onSubmit={handleCredentialsSubmit}
            className="flex flex-col gap-3 pt-7"
          >
            <Input type="email" value={email} disabled className="opacity-60" />

            {step === "register" && (
              <div className="flex flex-row gap-3">
                <Input
                  placeholder="First name"
                  autoComplete="given-name"
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Last name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            )}

            <Input
              type="password"
              placeholder="Password"
              autoComplete={
                step === "register" ? "new-password" : "current-password"
              }
              autoFocus={step === "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full justify-center"
            >
              {submitting
                ? "Please wait…"
                : step === "register"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
        )}
      </Sheet>

      <DisplayNamePopup
        open={Boolean(newGoogleUser)}
        setOpen={(next) => {
          if (!next) setNewGoogleUser(null);
        }}
        user={newGoogleUser}
      />
    </>
  );
}
