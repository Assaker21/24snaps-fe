import { useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { ArrowLeftIcon } from "lucide-react";
import IconButton from "./IconButton.component";
import useViewportHeight from "../hooks/useViewportHeight.hook";
import useKeyboardInset from "../hooks/useKeyboardInset.hook";
import cn from "../utils/cn.util";

// Shared chrome for the bottom sheets (invite, settings, templates, sign-in). The
// reference sheets carry only a drag handle — no close button — and lead with a
// serif title, so dismissal is the overlay tap / swipe-down / Esc that vaul
// already provides.
//
// The sheet is a handle above a scroller, and its height comes from the scroller's own
// cap rather than from flex growth — four things here used to go wrong on a phone:
//
//   - `vh` on iOS measures the viewport *without* the browser chrome, so a sheet
//     pinned to `bottom-0` and capped in `vh` has its last control sitting under
//     Safari's toolbar. `dvh` is the unit that tracks the visible area, and
//     `visualViewport` (below) is the one that tracks it on iOS Chrome too.
//   - the handle bar was `position: fixed`. vaul animates the drag with a transform
//     on this same element, and a fixed descendant of a transformed box is a
//     long-standing WebKit mispaint — it detaches from the sheet mid-drag and lands
//     over the content.
//   - the body was `overflow-y-auto` inside a clipped column with no height of its
//     own, which never scrolls: a flex child defaults to `min-height: auto`, so the
//     column grows to fit its content and the sheet simply clips the overflow away.
//     Long sheets — the templates form is the longest — lost their buttons off the
//     bottom. Capping the scroller directly avoids relying on how a browser sizes a
//     growable item inside an auto-height flex container, which is the corner WebKit
//     and Blink have historically disagreed in.
//   - focusing a field made the whole sheet unreachable. `dvh` does not shrink for the
//     keyboard, so the scroller kept its full-screen cap while vaul's own
//     `repositionInputs` wrote a much shorter inline `height` onto the sheet — and the
//     sheet clips its overflow, so the form (and every button under it) was sitting
//     outside the visible box with no way to scroll to it. vaul's repositioning is
//     turned off and the keyboard handled here instead: the sheet lifts by exactly how
//     much of it the keyboard covers, and the scroller is capped against the *visual*
//     viewport, which does shrink.
export default function Sheet({
  open,
  setOpen,
  title,
  description,
  onBack,
  className,
  children,
}) {
  const viewportHeight = useViewportHeight();
  const keyboardInset = useKeyboardInset();
  const scrollerRef = useRef(null);

  // The drag handle strip above the scroller, plus a little air above the sheet.
  const CHROME = 44;

  // Before the first measurement there is no number to use, so the `max-h-[82dvh]`
  // class below carries the initial paint.
  const scrollerMaxHeight = viewportHeight
    ? keyboardInset > 0
      ? // Keyboard up: `viewportHeight` is already the shrunken strip, so give the
        // form as much of it as the chrome leaves.
        Math.max(160, viewportHeight - CHROME)
      : Math.round(viewportHeight * 0.82)
    : null;

  // The browser's own "scroll the focused field into view" is unreliable once the
  // sheet has moved under it, and gets it wrong often enough on iOS that the field
  // ends up behind the keyboard. Do it ourselves, after the viewport has settled.
  useEffect(() => {
    if (!open || keyboardInset === 0) return;

    const frame = requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (!focused || !scrollerRef.current?.contains(focused)) return;
      focused.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, [open, keyboardInset, scrollerMaxHeight]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      // See the note above: vaul's version of this writes an inline height onto the
      // sheet that its own `overflow-hidden` then clips the form out of.
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-251" />
        <Drawer.Content
          className={cn(
            "z-251 bg-background fixed bottom-0 left-0 right-0 overflow-hidden",
            "rounded-t-3xl outline-none",
            className,
          )}
          // Lifted clear of the keyboard rather than left behind it: a fixed element
          // is positioned against the layout viewport, which the keyboard does not
          // shrink.
          style={keyboardInset > 0 ? { bottom: keyboardInset } : undefined}
        >
          <div className="w-full bg-background pt-2 pb-1">
            <Drawer.Handle className="!bg-border !w-10" />
          </div>

          {/* overscroll-contain keeps a swipe at the top of the list from scrolling
              the page behind the sheet, which on iOS otherwise drags the whole
              document around under the overlay. */}
          <div
            ref={scrollerRef}
            className="max-h-[82dvh] overflow-y-auto overscroll-contain"
            style={
              scrollerMaxHeight ? { maxHeight: scrollerMaxHeight } : undefined
            }
          >
            <div className="max-w-md w-full mx-auto px-5 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
              {onBack ? (
                <IconButton onClick={onBack} aria-label="Back" className="mt-5">
                  <ArrowLeftIcon size={18} />
                </IconButton>
              ) : null}

              <Drawer.Title
                className={cn("font-serif text-3xl", onBack ? "mt-5" : "mt-7")}
              >
                {title}
              </Drawer.Title>

              {description ? (
                <Drawer.Description className="text-sm text-muted-foreground mt-3 leading-snug">
                  {description}
                </Drawer.Description>
              ) : (
                // Radix requires a description node for the dialog's aria wiring.
                <Drawer.Description className="sr-only">
                  {title}
                </Drawer.Description>
              )}

              {children}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
