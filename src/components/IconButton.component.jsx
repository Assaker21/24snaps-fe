import { forwardRef } from "react";
import cn from "../utils/cn.util";

// The rounded-square glyph chip the reference puts in every page corner: back
// arrow, settings gear, QR. `overlay` is the translucent variant used when it
// sits on top of a cover photo rather than on the page background.
const variants = {
  surface: "bg-surface text-foreground hover:bg-surface-strong",
  overlay: "bg-black/35 text-white backdrop-blur-sm hover:bg-black/45",
  ghost: "bg-transparent text-foreground hover:bg-surface",
};

const IconButton = forwardRef(function IconButton(
  { variant = "surface", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "size-11 shrink-0 rounded-2xl flex items-center justify-center cursor-pointer",
        "transition-[transform,background-color] duration-200 ease-out active:scale-90 active:duration-75",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:opacity-45 disabled:pointer-events-none",
        variants[variant] || variants.surface,
        className,
      )}
    >
      {children}
    </button>
  );
});

export default IconButton;
