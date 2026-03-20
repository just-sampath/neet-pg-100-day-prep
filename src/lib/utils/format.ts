import { format, parseISO } from "date-fns";

export function formatDateLabel(value: string) {
  return format(parseISO(`${value}T00:00:00`), "EEE, d MMM yyyy");
}

export function formatDateTimeLocal(value: string) {
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
}

export function formatMetric(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return `${value}${suffix}`;
}
