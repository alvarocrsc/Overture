/**
 * Formats a date for display in the log flow.
 *
 * - "Today" if same calendar day as now
 * - "Yesterday" if one calendar day before now
 * - Otherwise localised short date, e.g. "Apr 5" or "Apr 5, 2024" if a
 *   different year from now.
 */
export function formatWatchedOn(date: Date, now: Date = new Date()): string {
  const sameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';

  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString(undefined, opts);
}

/**
 * Returns YYYY-MM-DD in the local timezone — the format expected by the
 * backend `watched_on` field.
 */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
