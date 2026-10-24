import { useI18n } from "../contexts/I18n.context";
import * as format from "../i18n/format";

// The formatters from src/i18n/format.js, with the current locale already bound — so a
// screen writes `fmt.moment(event.revealAt)` instead of threading the locale through
// every call site and inevitably missing one.
export default function useFormat() {
  const { formatLocale, t } = useI18n();

  return {
    moment: (date) => format.formatMoment(date, formatLocale),
    fullMoment: (date) => format.formatFullMoment(date, formatLocale),
    day: (date) => format.formatDay(date, formatLocale),
    time: (date) => format.formatTime(date, formatLocale),
    money: (amount, currency) => format.formatMoney(amount, formatLocale, currency),
    dateRange: (startAt, endAt) =>
      format.formatDateRange(startAt, endAt, formatLocale),
    countdown: (date) => format.formatCountdown(date, t),
  };
}
