import { useEffect, useState } from "react";

// A clock the render can read. Countdowns and the "has this event ended" gate both
// depend on the time, and nothing re-renders on its own when a deadline passes — so
// screens that have to notice one tick this instead.
//
// The default interval matches the countdown's minute resolution closely enough while
// keeping the camera's viewfinder off a per-second render loop. It is only ever a
// cosmetic gate: the server refuses a late shot whatever the client believes.
export default function useTicker(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
