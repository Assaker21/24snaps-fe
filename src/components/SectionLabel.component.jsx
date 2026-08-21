import cn from "../utils/cn.util";

// "SUGGESTIONS", "TIME", "SHOTS PER PERSON", "ACTIVE" — the reference's only
// section divider: wide-tracked uppercase sans, never serif.
export default function SectionLabel({ children, className, ...props }) {
  return (
    <p
      {...props}
      className={cn(
        "font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
