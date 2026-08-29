import { forwardRef } from "react";
import cn from "../utils/cn.util";

// The reference's text field is a tall, softly-rounded recessed block with a
// pencil glyph on the left. `icon` renders that slot; omit it for plain fields.
const Input = forwardRef(function Input({ icon, className, ...props }, ref) {
  const field = (
    <input
      ref={ref}
      {...props}
      className={cn(
        "bg-surface rounded-2xl w-full text-base text-foreground placeholder:text-subtle",
        "outline-none focus:ring-2 focus:ring-ring/30 transition-shadow",
        icon ? "py-4 pl-11 pr-4" : "py-4 px-4",
        className,
      )}
    />
  );

  if (!icon) return field;

  return (
    <div className="relative w-full">
      {/* Inherits the surrounding text colour so the glyph stays legible on a
          light page and over a dark cover photo alike. */}
      <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
        {icon}
      </span>
      {field}
    </div>
  );
});

export default Input;
