import { daysBetween } from "./days";

export function formatClock(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} ${part("dayPeriod").toLowerCase()}`;
}

export function formatHour(hour: number): string {
  return formatClock(new Date(Date.UTC(2000, 0, 1, hour)), "UTC");
}

function formatDay(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function formatShortDate(day: string): string {
  return formatDay(day, { month: "short", day: "numeric" });
}

export function formatWeekday(day: string): string {
  return formatDay(day, { weekday: "long" });
}

export function formatWeekdayLetter(day: string): string {
  return formatDay(day, { weekday: "narrow" });
}

export function formatDayLabel(day: string): string {
  return `${formatDay(day, { weekday: "long" })} · ${formatShortDate(day)}`;
}

export function formatRelativeDay(day: string, today: string): string {
  const days = daysBetween(day, today);
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  return formatShortDate(day);
}
