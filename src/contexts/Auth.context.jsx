import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import authService from "../services/auth.service";
import LoginPopup from "../popups/Authentication/Login.popup";
import { useDevice } from "./Device.context";
import useEffectOnce from "../hooks/useEffectOnce.hook";
import uploadQueue from "../utils/uploadQueue.util";

const AuthContext = createContext(null);

// A failed /me that means "this credential is no good" — the only kind worth trading a
// stored token in for a guest session. A network error (no status at all), a 429 or a
// 5xx say nothing about the token: falling back on those is what used to throw away a
// perfectly good session, and then open the sign-in sheet on top of it.
function isCredentialRejection(response) {
  return response.status === 401 || response.status === 403;
}

export const AuthProvider = ({ children }) => {
  const deviceId = useDevice();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bumped by every explicit sign-in. `init` reads it before and after each await, so
  // the Google redirect resolving mid-init (it lands on whatever page with `?code=`,
  // and Login.popup exchanges it in parallel) can't be undone by the slower answer —
  // which is how a signed-in visitor ended up being shown the sign-in sheet.
  const epoch = useRef(0);
  // So the guards below can read the current account without re-subscribing. Declared
  // before the mount effects below so it is already in step when they run.
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const applyUser = useCallback((next) => {
    epoch.current += 1;
    setUser(next);
    // Whoever just signed in has nothing left to sign in for.
    if (next) setOpen(false);
  }, []);

  // The sheet is only ever a prompt to *become* someone. Asking a signed-in account to
  // sign in is the bug being fixed here, so it is refused at the one place that can
  // see both facts — whatever a caller's stale render thought.
  const requestOpen = useCallback((next) => {
    setOpen((previous) => {
      const resolved = typeof next === "function" ? next(previous) : next;
      if (resolved && userRef.current?.email) return previous;
      return resolved;
    });
  }, []);

  // Without this guard, React StrictMode's double-invoked mount effect would race
  // its own POST /auth/device call for the same deviceId — which can each
  // independently see "no linked user yet" and mint a separate guest account for
  // what is really one device.
  useEffectOnce(init);

  async function init() {
    const started = epoch.current;
    // Nothing this function decides matters once someone has signed in under it.
    const stale = () => epoch.current !== started;

    // Every exit leaves `loading` false — including the stale ones, which previously
    // couldn't happen and would now strand the app on its splash screen.
    try {
      let response = await authService.me();

      // A transport failure is the mobile-network case: the request never reached the
      // API, so the token it carried is still unjudged. One more go before concluding
      // anything, rather than tearing a good session down over a dropped packet.
      if (!response.ok && response.status == null) {
        response = await authService.me();
      }

      if (stale()) return;

      if (!response.ok && isCredentialRejection(response)) {
        const deviceResponse = await authService.deviceLogin(deviceId);
        if (stale()) return;

        if (deviceResponse.ok && deviceResponse.data.requiresSignIn) {
          // This device can't be resolved to a single guest — either it carries a
          // real account (which has credentials and must present them) or more than
          // one guest. Either way, force an explicit sign-in.
          //
          // Unless a Google exchange is already in flight: the popup holds the code
          // and is about to sign this visitor in, so prompting them now would be a
          // sheet that closes itself a moment later.
          if (!new URLSearchParams(window.location.search).get("code")) {
            requestOpen(true);
          }
          return;
        }

        if (deviceResponse.ok) {
          const accessToken = deviceResponse.data.accessToken?.replace(
            "Bearer ",
            "",
          );
          if (accessToken) {
            localStorage.setItem("accessToken", accessToken);
          }
          response = await authService.me();
          if (stale()) return;
        }
      }

      if (response.ok) applyUser(response.data);
    } finally {
      setLoading(false);
    }
  }

  // A user is a "guest" until they link a real account (Google sign-in),
  // which is the only thing that gives them an email.
  const isGuest = !user?.email;

  // Captures that haven't uploaded yet are held per account (see uploadQueue.util.js),
  // so the queue only ever resumes the shots belonging to whoever is signed in now.
  // Deliberately not told anything until the session resolves: the queue starts with no
  // owner and uploads nothing, which is what stops a capture restored from the last
  // visit going up before we know whose it is.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (loading) return;
    uploadQueue.setOwner(userId == null ? null : { id: userId, guest: isGuest });
  }, [loading, userId, isGuest]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: applyUser,
        open,
        setOpen: requestOpen,
        loading,
        isGuest,
      }}
    >
      <LoginPopup open={open} setOpen={requestOpen} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
};
