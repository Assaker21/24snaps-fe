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
      // Deliberately pinned LTR. The knob is positioned by the flex row's start edge
      // and moved with `translate-x-5`, which is a physical transform — under `dir=rtl`
      // the track flipped but the transform didn't, so switching "on" drove the knob
      // out of the pill instead of across it. A switch isn't text: off-left/on-right
      // reads the same in both directions, so the fix is to stop it inheriting the
      // direction at all rather than to mirror the travel.
      dir="ltr"
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
