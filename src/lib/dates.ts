// Date helpers. All "calendar dates" (attendance, exams, comments) are stored as
// Postgres DATE columns, which Prisma returns as UTC-midnight Date objects.
// "Today" is always computed in Malaysia time.

export const APP_TIME_ZONE = "Asia/Kuala_Lumpur";

/** Today's date in Malaysia as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** A DATE column value -> YYYY-MM-DD. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD -> Date at UTC midnight (what Prisma expects for DATE columns). */
export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseISODate(value);
  return !Number.isNaN(d.getTime()) && toISODate(d) === value;
}

export function addDaysISO(value: string, days: number): string {
  const d = parseISODate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

const dateFmt = new Intl.DateTimeFormat("ms-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const longDateFmt = new Intl.DateTimeFormat("ms-MY", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("ms-MY", { month: "long", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short", timeZone: "UTC" });

function asDate(value: Date | string): Date {
  return typeof value === "string" ? parseISODate(value.slice(0, 10)) : value;
}

/** e.g. "19 Nov 2026" */
export function formatDate(value: Date | string): string {
  return dateFmt.format(asDate(value));
}
/** e.g. "Khamis, 19 November 2026" */
export function formatLongDate(value: Date | string): string {
  return longDateFmt.format(asDate(value));
}
/** e.g. "19 Nov" */
export function formatShortDate(value: Date | string): string {
  return shortFmt.format(asDate(value));
}
/** "2026-11" -> "November 2026" */
export function formatMonth(yyyyMm: string): string {
  return monthFmt.format(parseISODate(`${yyyyMm}-01`));
}

/** Timestamp (createdAt etc.) in Malaysia time, e.g. "19 Nov 2026, 3:45 PTG". */
export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(value);
}

/** First and last day (YYYY-MM-DD) of a YYYY-MM month. */
export function monthBounds(yyyyMm: string): { start: string; end: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${yyyyMm}-01`, end: `${yyyyMm}-${String(last).padStart(2, "0")}` };
}
