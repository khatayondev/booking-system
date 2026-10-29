export interface IcsCalendarOptions {
  reference: string;
  summary: string;
  description: string;
  startUtc: Date;
  endUtc: Date;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  url?: string;
}

/**
 * Formats a Date object to RFC 5545 UTC timestamp: YYYYMMDDTHHmmssZ
 */
export function formatIcsDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Escapes plain text for inclusion in iCalendar format.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generates an RFC 5545 compliant .ics VCALENDAR file content.
 */
export function generateIcsCalendar(options: IcsCalendarOptions): string {
  const now = new Date();
  const dtStamp = formatIcsDate(now);
  const dtStart = formatIcsDate(options.startUtc);
  const dtEnd = formatIcsDate(options.endUtc);
  const uid = `booking-${options.reference}@beccascrown.gh`;
  const location = options.location || "14 Senchi Street, Airport Residential Area, Accra, Ghana";
  const organizerName = options.organizerName || "Becca's Crown Beauty Vault";
  const organizerEmail = options.organizerEmail || "hello@beccascrown.gh";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Becca's Crown Beauty Vault//Ghana Booking System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(options.summary)}`,
    `DESCRIPTION:${escapeIcsText(options.description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `ORGANIZER;CN=${escapeIcsText(organizerName)}:mailto:${organizerEmail}`,
    "STATUS:CONFIRMED",
    options.url ? `URL:${options.url}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${escapeIcsText(options.summary)} tomorrow`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${escapeIcsText(options.summary)} in 2 hours`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n") + "\r\n";
}

/**
 * Builds a direct Google Calendar add-to-calendar web URL.
 */
export function generateGoogleCalendarUrl(options: IcsCalendarOptions): string {
  const dtStart = formatIcsDate(options.startUtc);
  const dtEnd = formatIcsDate(options.endUtc);
  const location = options.location || "14 Senchi Street, Airport Residential Area, Accra, Ghana";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: options.summary,
    dates: `${dtStart}/${dtEnd}`,
    details: options.description,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
