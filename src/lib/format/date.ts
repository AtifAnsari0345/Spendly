/**
 * Display helpers for expense dates.
 *
 * Expenses store dates as plain ISO calendar days (YYYY-MM-DD). Formatting must
 * therefore build the date from its parts (local midnight) instead of parsing
 * the string as UTC, otherwise the rendered day can shift for users behind UTC.
 */
export function formatHumanDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
