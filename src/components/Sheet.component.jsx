import { Drawer } from "vaul";
import { ArrowLeftIcon } from "lucide-react";
import IconButton from "./IconButton.component";
import cn from "../utils/cn.util";

// Shared chrome for the bottom sheets (invite, settings, templates, sign-in). The
// reference sheets carry only a drag handle — no close button — and lead with a
// serif title, so dismissal is the overlay tap / swipe-down / Esc that vaul
// already provides.
//
// The sheet is a handle above a scroller, and its height comes from the scroller's own
// `max-h` rather than from flex growth — three things here used to go wrong in Safari:
//
//   - `vh` on iOS measures the viewport *without* the browser chrome, so a sheet
//     pinned to `bottom-0` and capped in `vh` has its last control sitting under
//     Safari's toolbar. `dvh` is the unit that tracks the visible area.
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
export default function Sheet({
  open,
  setOpen,
  title,
  description,
  onBack,
  className,
  children,
}) {
  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-251" />
        <Drawer.Content
          className={cn(
            "z-251 bg-background fixed bottom-0 left-0 right-0 overflow-hidden",
            "rounded-t-3xl outline-none",
            className,
          )}
        >
          <div className="w-full bg-background pt-2 pb-1">
            <Drawer.Handle className="!bg-border !w-10" />
          </div>

          {/* overscroll-contain keeps a swipe at the top of the list from scrolling
              the page behind the sheet, which on iOS otherwise drags the whole
              document around under the overlay. */}
          <div className="max-h-[82dvh] overflow-y-auto overscroll-contain">
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
