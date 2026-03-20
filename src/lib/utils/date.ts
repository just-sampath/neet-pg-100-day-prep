import { addDays, differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";

export function isoNow(now = new Date()): string {
  return now.toISOString();
}

export function toDateOnly(value: Date | string): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "yyyy-MM-dd");
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

export function timeValue(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isOutsideSleepWindow(start: string, end: string): boolean {
  return timeValue(start) < timeValue("06:30") || timeValue(end) > timeValue("23:00");
}
