export function trainingDay(at: Date, timeZone: string, rolloverHour: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value);
  const shifted = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour") - rolloverHour, part("minute"));
  return new Date(shifted).toISOString().slice(0, 10);
}
