/**
 * Format a Date as a local calendar YYYY-MM-DD.
 * Use this when comparing to date-only fields such as appointment.date.
 * Do not use toISOString() here — that shifts the calendar day around UTC midnight.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Today's date as a local calendar YYYY-MM-DD string.
 */
export function getToday(now: Date = new Date()): string {
  return toLocalDateString(now);
}
