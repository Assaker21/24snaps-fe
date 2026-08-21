import { useEffect, useState } from "react";

// The visible height of the viewport, in px.
//
// `100dvh` is the right answer everywhere except the browsers that need it most: on
// iOS Chrome the collapsing URL bar leaves a fixed/dvh-sized element taller than what
// is actually on screen, which quietly pushes a bottom bar off the bottom. visualViewport
// reports what the user can really see, so anything that must stay reachable — the
// camera's shutter row — is sized from this instead.
//
// Returns 0 until the first measurement, so callers can fall back to an h-dvh class
// for the initial paint.
export default function useViewportHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    function update() {
      setHeight(visualViewport?.height || window.innerHeight);
    }

    update();

    visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return height;
}
