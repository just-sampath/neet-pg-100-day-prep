import { addDays, differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";

export const IST_TIME_ZONE = "Asia/Kolkata";

export function isoNow(now = new Date()): string {
  return now.toISOString();
}

function zonedParts(value: Date | string, timeZone = IST_TIME_ZONE) {
  const date = typeof value === "string" ? parseISO(value) : value;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";

  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: Number(part("hour")),
    minute: Number(part("minute")),
    weekday: part("weekday"),
  };
}

export function toDateOnly(value: Date | string): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "yyyy-MM-dd");
}

export function toDateOnlyInTimeZone(value: Date | string, timeZone = IST_TIME_ZONE): string {
  const parts = zonedParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseDateOnly(value: string): Date {
  return parseISO(`${value}T00:00:00`);
}

export function addDaysToDateOnly(value: string, days: number): string {
  return toDateOnly(addDays(parseDateOnly(value), days));
}

export function diffDays(left: string, right: string): number {
  return differenceInCalendarDays(parseDateOnly(left), parseDateOnly(right));
}

export function weekBounds(value: string) {
  const date = parseDateOnly(value);
  return {
    start: toDateOnly(startOfWeek(date, { weekStartsOn: 1 })),
    end: toDateOnly(endOfWeek(date, { weekStartsOn: 1 })),
  };
}

export function getMinutesInTimeZone(value: Date | string, timeZone = IST_TIME_ZONE) {
  const parts = zonedParts(value, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function getWeekdayInTimeZone(value: Date | string, timeZone = IST_TIME_ZONE) {
  const weekday = zonedParts(value, timeZone).weekday;
  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return order.indexOf(weekday as (typeof order)[number]);
}

export function timeValue(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isOutsideSleepWindow(start: string, end: string): boolean {
  return timeValue(start) < timeValue("06:30") || timeValue(end) > timeValue("23:00");
}
