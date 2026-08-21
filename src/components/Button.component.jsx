import { forwardRef } from "react";
import cn from "../utils/cn.util";

// Roles mirror the reference mockups: the page's single forward action is a solid
// pill (white-on-black there, black-on-white here), everything alongside it is a
// recessed surface chip.
const variants = {
  primary: "bg-foreground text-white hover:brightness-125",
  secondary: "bg-surface text-foreground hover:bg-surface-strong",
  brand: "bg-brand text-white hover:brightness-110",
  outline: "bg-background text-foreground border border-border hover:bg-surface",
  ghost: "bg-transparent text-muted-foreground hover:bg-surface",
  danger: "bg-danger-soft text-danger hover:brightness-[0.97]",
};

const sizes = {
  sm: "text-sm py-2 px-3.5 gap-1.5",
  md: "text-sm py-3 px-5 gap-2",
  lg: "text-base py-3.5 px-6 gap-2",
};

const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", children, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "flex flex-row items-center rounded-full font-medium whitespace-nowrap select-none cursor-pointer",
        sizes[size] || sizes.md,
        variants[variant] || variants.secondary,
        "transition-[transform,filter,background-color] duration-200 ease-out",
        "active:scale-95 active:duration-75",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:opacity-45 disabled:pointer-events-none",
        className,
      )}
    >
      {children}
    </button>
  );
});

export default Button;
