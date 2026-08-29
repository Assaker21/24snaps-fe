// The album header's right-hand line: "Jul 8~9, 2026" in the reference. The span is
// collapsed as far as it can be — a same-day album is one date, a same-month one
// repeats neither the month nor the year — so the line stays short enough to sit
// beside a serif title on a phone.
export function formatDateRange(startAt, endAt) {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;

  const valid = (date) => date && !Number.isNaN(date.getTime());
  if (!valid(start)) return valid(end) ? full(end) : "";
  if (!valid(end)) return full(start);

  if (sameDay(start, end)) return full(start);

  if (start.getFullYear() !== end.getFullYear()) {
    return `${full(start)} ~ ${full(end)}`;
  }

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

function monthDay(date) {
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function full(date) {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
