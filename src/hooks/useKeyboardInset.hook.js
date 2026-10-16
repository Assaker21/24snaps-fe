import { useEffect, useState } from "react";

// How many pixels of the layout viewport the on-screen keyboard is covering.
//
// A `position: fixed; bottom: 0` element is laid out against the *layout* viewport,
// which the keyboard doesn't shrink — so on iOS a bottom sheet keeps sitting exactly
// where it was, behind the keyboard, the moment a field inside it is focused. The
// visual viewport is the part the user can actually see; the difference between the
// two (less however far the page itself has been scrolled up) is the overlap that a
// bottom-anchored element has to lift itself by.
//
// Returns 0 when there is no keyboard, and on browsers without visualViewport.
export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function update() {
      const covered =
        window.innerHeight - viewport.height - viewport.offsetTop;
      // Small differences are the browser's own chrome, not a keyboard. Rounding to
      // whole pixels keeps a fractional viewport height from re-rendering forever.
      const next = Math.max(0, Math.round(covered));
      setInset((previous) => (previous === next ? previous : next));
    }

    update();

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
