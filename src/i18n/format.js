// Dates, times and money, in whichever language is on screen.
//
// These used to be `toLocaleString([])` calls scattered across the screens — `[]` means
// "whatever the browser is set to", which is the one thing that is *not* the right
// answer once the app has a language of its own: a Lebanese phone set to English
// browsing the Arabic site would have rendered English month names inside Arabic
// sentences. Everything here takes the resolved locale explicitly.
//
// The tag passed in is the catalogue's `formatLocale`, not its key — see the note on
// ar-SA in strings.json, which forces the Gregorian calendar (its Intl default is
// Hijri, which would misdate every event) and Latin digits.

export function formatMoment(date, locale) {
  if (!date) return "";
  return new Date(date).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatFullMoment(date, locale) {
  if (!date) return "";
  return new Date(date).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(date, locale) {
  if (!date) return "";
  return new Date(date).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date, locale) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Prices come from the server as a bare number plus a currency code. Intl puts the
// symbol on the side the language expects, which is the whole point of not building
// "US$" + amount by hand.
export function formatMoney(amount, locale, currency = "USD") {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

// The album strip's date span, collapsed as far as it will go — a same-day album is
// one date, a same-month one repeats neither month nor year — so the line stays short
// enough to sit beside a serif title on a phone.
export function formatDateRange(startAt, endAt, locale) {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;

  const valid = (date) => date && !Number.isNaN(date.getTime());
  if (!valid(start)) return valid(end) ? formatDay(end, locale) : "";
  if (!valid(end)) return formatDay(start, locale);

  if (sameDay(start, end)) return formatDay(start, locale);

  if (start.getFullYear() !== end.getFullYear()) {
    return `${formatDay(start, locale)} ~ ${formatDay(end, locale)}`;
  }

  const monthDay = (date) =>
    date.toLocaleDateString(locale, { month: "short", day: "numeric" });

  if (start.getMonth() !== end.getMonth()) {
    return `${monthDay(start)} ~ ${monthDay(end)}, ${end.getFullYear()}`;
  }

  return `${monthDay(start)}~${end.getDate()}, ${end.getFullYear()}`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "23h 56m left". The shape of the sentence is the catalogue's business, not this
// function's — it only works out which of the three forms applies and with what
// numbers. `t` is the translate function from useT().
export function formatCountdown(targetDate, t) {
  if (!targetDate) return "";

  const diffMs = new Date(targetDate).getTime() - Date.now();
  if (diffMs <= 0) return t("countdown.ended");

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return t("countdown.daysLeft", { days, hours });
  if (hours > 0) return t("countdown.hoursLeft", { hours, minutes });
  return t("countdown.minutesLeft", { minutes });
}

// Has it ended? Asked separately from the string, because several screens need the
// fact without the sentence.
export function hasEnded(targetDate) {
  return Boolean(targetDate) && new Date(targetDate).getTime() <= Date.now();
}
