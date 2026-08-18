import { useEffect, useRef } from "react";

// A useEffect guarded to run at most once per component instance. React StrictMode
// double-invokes mount effects in development (mount -> cleanup -> mount again), which
// silently re-fires one-time work like an initial data fetch; the ref guard here makes
// sure `effect` only actually runs on the first invocation.
export default function useEffectOnce(effect) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    effect();
  }, []);
}
