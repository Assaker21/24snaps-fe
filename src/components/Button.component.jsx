import { forwardRef } from "react";
import cn from "../utils/cn.util";

export default forwardRef(
  ({ variant = "default", color = "primary", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          "text-md flex flex-row gap-2 items-center py-3 px-4 rounded-2xl font-medium text-black",
          variant == "primary" &&
            "bg-green-400 shadow-sm shadow-green-900/10 focus-visible:outline-green-500",
          variant == "secondary" &&
            "bg-white shadow-sm shadow-black-900/10 focus-visible:outline-gray-500 border border-gray-200",
          "transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) select-none cursor-pointer",
          "hover:brightness-105 hover:shadow-md hover:shadow-green-900/15",
          "active:scale-95 active:brightness-95 active:shadow-inner active:duration-75",
          "focus-visible:outline-2 focus-visible:outline-offset-2",

          props.className,
        )}
      >
        {children}
      </button>
    );
  },
);
