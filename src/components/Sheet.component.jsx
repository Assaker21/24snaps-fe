import { Drawer } from "vaul";
import { ArrowLeftIcon } from "lucide-react";
import IconButton from "./IconButton.component";
import cn from "../utils/cn.util";

// Shared chrome for the three bottom sheets (invite, settings, sign-in). The
// reference sheets carry only a drag handle — no close button — and lead with a
// serif title, so dismissal is the overlay tap / swipe-down / Esc that vaul
// already provides.
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
            "z-251 bg-background flex flex-col fixed bottom-0 left-0 right-0",
            "max-h-[88vh] rounded-t-3xl outline-none",
            className,
          )}
        >
          <div className="max-w-md w-full mx-auto overflow-y-auto px-5 pb-8 pt-3">
            <Drawer.Handle className="!bg-border !w-10" />

            {onBack ? (
              <IconButton onClick={onBack} aria-label="Back" className="mt-5">
                <ArrowLeftIcon size={18} />
              </IconButton>
            ) : null}

            <Drawer.Title className={cn("font-serif text-3xl", onBack ? "mt-5" : "mt-7")}>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
