import cn from "../utils/cn.util";

// Every choice in the reference wizard — reveal timing, participant tier, shots
// per person, name suggestions — is the same tile: recessed surface with a
// hairline border, and a blue border + blue tint + blue label when selected.
export default function OptionTile({
  selected,
  tone = "brand",
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      {...props}
      className={cn(
        "bg-surface border border-transparent rounded-2xl text-foreground leading-tight",
        "px-4 py-3 text-left cursor-pointer select-none",
        "transition-[transform,background-color,border-color,color] duration-200 ease-out",
        "active:scale-[0.97] active:duration-75",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:opacity-45 disabled:pointer-events-none",
        selected &&
          tone === "brand" &&
          "bg-brand-soft border-brand-border text-brand font-medium",
        selected &&
          tone === "success" &&
          "bg-success-soft border-success-border text-success font-medium",
        className,
      )}
    >
      {children}
    </button>
  );
}
