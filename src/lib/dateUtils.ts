/**
 * Get UTC boundaries for a local day, ensuring correct timezone handling
 * when querying timestamps stored in UTC.
 */
export function getLocalDayBoundsUTC(date: Date): { start: string; end: string } {
  const localStart = new Date(date);
  localStart.setHours(0, 0, 0, 0);

  const localEnd = new Date(date);
  localEnd.setHours(23, 59, 59, 999);

  return {
    start: localStart.toISOString(),
    end: localEnd.toISOString(),
  };
}

/**
 * Get today's local date as YYYY-MM-DD string (timezone-safe).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
