import cn from "../utils/cn.util";

// The pill switch from the reference's visibility row: grey track when off,
// green when on, white knob throughout.
export default function Toggle({
  checked,
  onChange,
  label,
  className,
  ...props
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={cn(
        "w-12 h-7 shrink-0 rounded-full flex items-center p-1 cursor-pointer",
        "transition-colors duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "bg-emerald-500" : "bg-surface-strong",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
