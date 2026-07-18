import cn from "../../../../../utils/cn.util.js";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { DayPicker } from "react-day-picker";

// Removed the custom `not-data-selected` and just used standard `hover:bg-accent`
// (we will force !bg-blue-500 on the selected state below so hover doesn't break it)
const buttonClassNames =
  "relative flex size-(--cell-size) text-base sm:text-sm items-center justify-center rounded-full text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-64 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export default function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  mode = "single",
  ...props
}) {
  const defaultClassNames = {
    button_next: buttonClassNames,
    button_previous: buttonClassNames,
    caption_label:
      "text-base sm:text-sm font-medium flex items-center gap-2 h-full",
    day: "size-(--cell-size) text-sm py-px",

    // Used native data-[selected] and aria-selected attribute selectors to guarantee a match
    day_button: cn(
      buttonClassNames,
      "data-[disabled]:text-muted-foreground/72 data-[disabled]:line-through",
      "data-[outside]:text-muted-foreground/72",
      "in-[.range-middle]:rounded-none in-[.range-end:not(.range-start)]:rounded-s-none in-[.range-start:not(.range-end)]:rounded-e-none in-[.range-middle]:data-[selected]:!bg-accent in-[.range-middle]:data-[selected]:!text-foreground",
      "outline-none focus-visible:z-1 focus-visible:ring-[3px] focus-visible:ring-ring/50",
      "cursor-pointer ",
    ),
    dropdown: "absolute bg-popover inset-0 opacity-0",
    dropdown_root:
      "relative has-focus:border-ring has-focus:ring-ring/50 has-focus:ring-[3px] border border-input shadow-xs/5 rounded-full px-[calc(--spacing(3)-1px)] h-9 sm:h-8 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:-me-1",
    dropdowns:
      "w-full flex items-center text-base sm:text-sm justify-center h-(--cell-size) gap-1.5 *:[span]:font-medium",
    hidden: "invisible",
    month: "w-full",
    month_caption:
      "relative mx-(--cell-size) px-1 mb-1 flex h-(--cell-size) items-center justify-center z-2",
    months: "relative flex flex-col sm:flex-row gap-2",
    nav: "absolute top-0 flex w-full justify-between z-1",
    outside:
      "text-muted-foreground [&[data-selected]]:bg-accent/50 [&[data-selected]]:text-muted-foreground",
    range_end: "range-end",
    range_middle: "range-middle",
    range_start: "range-start",
    selected: "!bg-blue-500 text-white rounded-full",
    today: "rounded-full bg-blue-100 border border-blue-500",

    today:
      "*:not([data-selected]):not([aria-selected='true']):bg-blue-200 *:not([data-selected]):not([aria-selected='true']):text-blue-900 rounded-full *:after:content-[''] *:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-1 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-blue-700 [&[data-selected]:not(.range-middle)>*]:after:bg-white [&[aria-selected='true']:not(.range-middle)>*]:after:bg-white [&[data-disabled]>*]:after:bg-foreground/30 *:after:transition-colors",
    week_number:
      "size-(--cell-size) p-0 text-xs font-medium text-muted-foreground/72",
    weekday:
      "size-(--cell-size) p-0 text-xs font-medium text-muted-foreground/72",
  };

  const mergedClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => {
      const userClass = classNames?.[key];
      const baseClass = defaultClassNames[key];

      acc[key] = userClass ? cn(baseClass, userClass) : baseClass;

      return acc;
    },
    { ...defaultClassNames },
  );

  const defaultComponents = {
    Chevron: ({ className, orientation, ...props }) => {
      if (orientation === "left") {
        return (
          <ChevronLeftIcon
            className={cn(className, "rtl:rotate-180")}
            {...props}
            aria-hidden="true"
          />
        );
      }

      if (orientation === "right") {
        return (
          <ChevronRightIcon
            className={cn(className, "rtl:rotate-180")}
            {...props}
            aria-hidden="true"
          />
        );
      }

      return (
        <ChevronsUpDownIcon
          className={className}
          {...props}
          aria-hidden="true"
        />
      );
    },
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  const dayPickerProps = {
    className: cn(
      "w-fit [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(9)]",
      className,
    ),
    classNames: mergedClassNames,
    components: mergedComponents,
    "data-slot": "calendar",
    formatters: {
      formatMonthDropdown: (date) =>
        date.toLocaleString("default", { month: "short" }),
    },
    mode,
    showOutsideDays,
    ...props,
  };

  return <DayPicker {...dayPickerProps} />;
}
