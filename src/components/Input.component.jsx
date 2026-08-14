import cn from "../utils/cn.util";

export default function Input({
  variant = "default",
  color = "primary",
  children,
  ...props
}) {
  return (
    <input
      {...props}
      className={cn(
        "bg-gray-100 border border-gray-200 rounded-xl p-2 px-3 focus:outline-none w-full",
        props.className,
      )}
    />
  );
}
