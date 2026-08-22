import cn from "../utils/cn.util";

// The one loading treatment in the app: the ring spinner from the create-event flow,
// with a line under it saying what we're waiting on. Every screen passes its own
// message — "Loading…" tells the user nothing they can't already see.
//
// variant: "page" fills the screen, "overlay" covers whatever is behind it (an action
// in flight on a screen that is already drawn), "inline" sits inside a section.
export default function LoadingScreen({
  message,
  variant = "page",
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 text-center",
        variant === "page" && "min-h-dvh",
        variant === "overlay" &&
          "fixed inset-0 z-260 bg-background/85 backdrop-blur-sm",
        variant === "inline" && "py-16",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="size-9 rounded-full border-[3px] border-surface-strong border-t-foreground animate-spin" />
      <p className="font-medium">{message}</p>
    </div>
  );
}
