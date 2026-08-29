import cn from "../../../../../utils/cn.util.js";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { DayPicker } from "react-day-picker";

// Matches the reference calendar: long thin month arrows flanking a serif
// "Jul 2026", muted weekday initials, and a selected day drawn as a blue-outlined
// rounded square rather than a filled circle.
const navButtonClassNames =
  "relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-5";

export default function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  mode = "single",
  ...props
}) {
  const defaultClassNames = {
    button_next: navButtonClassNames,
    button_previous: navButtonClassNames,
    caption_label: "font-serif text-2xl flex items-center gap-2 h-full",
    day: "h-(--cell-size) p-0 text-center align-middle",

    day_button: cn(
      "relative mx-auto flex size-(--cell-size) items-center justify-center rounded-2xl",
      "text-base text-foreground border border-transparent cursor-pointer",
      "hover:bg-accent transition-colors",
      // Unselectable days are pushed out of focus rather than merely greyed: the blur
      // makes "you can't pick this" legible at a glance on a dense grid of numbers.
      "disabled:pointer-events-none disabled:text-subtle disabled:opacity-80",
      "data-[outside]:text-subtle/60",
      "in-[.range-middle]:rounded-none in-[.range-end:not(.range-start)]:rounded-s-none in-[.range-start:not(.range-end)]:rounded-e-none in-[.range-middle]:data-[selected]:!bg-accent in-[.range-middle]:data-[selected]:!text-foreground",
      "outline-none focus-visible:z-1 focus-visible:ring-[3px] focus-visible:ring-ring/40",
    ),
    dropdown: "absolute bg-popover inset-0 opacity-0",
    dropdown_root:
      "relative has-focus:border-ring has-focus:ring-ring/40 has-focus:ring-[3px] border border-input rounded-full px-3 h-9 [&_svg]:pointer-events-none [&_svg]:-me-1 [&_svg]:size-4",
    dropdowns:
      "w-full flex items-center text-sm justify-center h-(--cell-size) gap-1.5 *:[span]:font-medium",
    hidden: "invisible",
    month: "w-full",
    month_caption:
      "relative mx-(--cell-size) px-1 mb-3 flex h-(--cell-size) items-center justify-center z-2",
    months: "relative flex flex-col sm:flex-row gap-2",
    nav: "absolute top-0 flex w-full justify-between items-center h-(--cell-size) z-1 px-1",
    outside: "text-subtle",
    range_end: "range-end",
    range_middle: "range-middle",
    range_start: "range-start",
    selected:
      "*:!bg-brand-soft *:!border-brand-border *:!text-brand *:font-medium",
    // A dot under today, dropped once the day is also the selection.
    today:
      "*:after:content-[''] *:after:pointer-events-none *:after:absolute *:after:bottom-1.5 *:after:start-1/2 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-brand [&[data-selected]>*]:after:opacity-0 *:!bg-brand-soft",
    // Weeks/weekdays are table rows — widen the grid itself and let the cells
    // distribute, rather than forcing flex onto <tr>/<th>.
    month_grid: "w-full border-collapse",
    weekday:
      "h-(--cell-size) p-0 text-sm font-normal text-muted-foreground text-center",
    week_number: "size-(--cell-size) p-0 text-xs font-medium text-subtle",
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
          <ArrowLeftIcon
            className={cn(className, "rtl:rotate-180")}
            {...props}
            aria-hidden="true"
          />
        );
      }

      if (orientation === "right") {
        return (
          <ArrowRightIcon
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
    className: cn("w-full [--cell-size:--spacing(11)]", className),
    classNames: mergedClassNames,
    components: mergedComponents,
    "data-slot": "calendar",
    formatters: {
      formatMonthDropdown: (date) =>
        date.toLocaleString("default", { month: "short" }),
      // "Jul 2026" and "Sun Mon Tue …", matching the reference rather than
      // DayPicker's default full month name and two-letter weekday initials.
      formatCaption: (date) =>
        date.toLocaleString("default", { month: "short", year: "numeric" }),
      formatWeekdayName: (date) =>
        date.toLocaleString("default", { weekday: "short" }),
    },
    mode,
    showOutsideDays,
    ...props,
  };

  return <DayPicker disabled={true} {...dayPickerProps} />;
}
