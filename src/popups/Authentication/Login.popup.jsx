import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import Button from "../../components/Button.component";
import Input from "../../components/Input.component";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useSearchParams, useNavigate } from "react-router";
import authService from "../../services/auth.service.js";
import { useAuth } from "../../contexts/Auth.context";

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

  async function completeAuth(response) {
    if (!response.ok) {
      setError(response.data?.message || "Something went wrong");
      return false;
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
    return true;
  }

  async function submitGoogleCode(code) {
    const response = await authService.login({
      google: { code },
    });

    const ok = await completeAuth(response);
    if (ok) {
      // Clean the ?code= param left by the Google redirect
      navigate(window.location.pathname, { replace: true });
    }
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
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-251" />
        <Drawer.Content className="z-251 bg-white flex flex-col fixed bottom-0 left-0 right-0 max-h-[82vh] rounded-t-[10px]">
          <div className="max-w-md w-full mx-auto overflow-auto p-4 rounded-t-[10px]">
            <Drawer.Handle />

            <div className="flex flex-row items-start justify-between pt-4">
              {step !== "email" ? (
                <button
                  type="button"
                  onClick={backToEmail}
                  className="bg-gray-100 rounded-full p-3 cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeftIcon className="size-5" />
                </button>
              ) : (
                <Drawer.Title className="text-xl font-bold font-serif flex-1 leading-tight tracking-tight">
                  Sign up to continue <br /> viewing your memories
                </Drawer.Title>
              )}
              <Drawer.Close asChild>
                <Button
                  variant="secondary"
                  className="rounded-full aspect-square p-3"
                >
                  <XIcon className="size-6 p-0" />
                </Button>
              </Drawer.Close>
            </div>

            {step === "email" && (
              <Drawer.Description className="text-sm text-secondary mt-2">
                You are currently on guest mode.
                <br />
                Create an account to view the remaining photos.
              </Drawer.Description>
            )}

            {step === "password" && (
              <Drawer.Title className="text-xl font-bold font-serif leading-tight tracking-tight mt-2">
                Enter your password
              </Drawer.Title>
            )}

            {step === "register" && (
              <Drawer.Title className="text-xl font-bold font-serif leading-tight tracking-tight mt-2">
                Create your account
              </Drawer.Title>
            )}

            {step === "email" && (
              <>
                <div className="flex flex-row items-center w-full justify-center py-6 pt-8">
                  <Button
                    className=" bg-white flex flex-row items-center gap-2 p-3 px-4 border rounded-full border-gray-200"
                    variant="secondary"
                    onClick={() => {
                      googleLogin();
                    }}
                  >
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
                    </svg>{" "}
                    Sign in with Google
                  </Button>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400 pb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  or
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form
                  onSubmit={handleEmailContinue}
                  className="flex flex-col gap-3 pb-6"
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

                  {error && <p className="text-sm text-red-500">{error}</p>}

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
                className="flex flex-col gap-3 py-6"
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
                  autoComplete={step === "register" ? "new-password" : "current-password"}
                  autoFocus={step === "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                {error && <p className="text-sm text-red-500">{error}</p>}

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
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
