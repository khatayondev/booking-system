/**
 * Date and Time Helper for Africa/Accra timezone.
 * Rule: Store all timestamps in UTC in the database.
 * Convert to and format in Africa/Accra for UI presentation.
 * Note: Ghana (Africa/Accra) observes Greenwich Mean Time (GMT, UTC+0) all year round without daylight saving time.
 */

export const DISPLAY_TIMEZONE = "Africa/Accra";
export const DISPLAY_LOCALE = "en-GH";

/**
 * Returns a new Date object representing current UTC time.
 */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Formats a Date or UTC ISO string into a human-readable date in Africa/Accra.
 * Example: "Sat, 24 Oct 2026"
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Formats a Date or UTC ISO string into a human-readable time in Africa/Accra.
 * Example: "10:30 AM"
 */
export function formatTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(d);
}

/**
 * Formats a Date or UTC string into both date and time.
 * Example: "24 Oct 2026, 10:30 AM"
 */
export function formatDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(d);
}

/**
 * Formats a start and end time range into a clean string.
 * Example: "10:30 AM – 11:45 AM"
 */
export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/**
 * Combines a date string (YYYY-MM-DD) and a time string (HH:mm) entered in Africa/Accra
 * into a UTC Date object.
 */
export function parseAccraDateTimeToUtc(dateStr: string, timeStr: string): Date {
  // Validate basic format YYYY-MM-DD and HH:mm
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const timeMatch = /^\d{2}:\d{2}$/.test(timeStr);
  if (!dateMatch || !timeMatch) {
    throw new Error(`Invalid date or time format. Expected YYYY-MM-DD and HH:mm, got "${dateStr}" "${timeStr}"`);
  }

  // Since Africa/Accra is UTC+0 year-round, ISO string with Z directly corresponds:
  const isoString = `${dateStr}T${timeStr}:00.000Z`;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${isoString}`);
  }
  return date;
}

/**
 * Adds minutes to a Date object, returning a new Date in UTC.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Adds hours to a Date object, returning a new Date in UTC.
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Adds days to a Date object, returning a new Date in UTC.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Checks if two time intervals overlap.
 * [startA, endA) and [startB, endB)
 */
export function isOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}
