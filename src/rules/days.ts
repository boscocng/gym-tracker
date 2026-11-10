const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function addDays(day: string, amount: number): string {
  return new Date(Date.parse(day) + amount * DAY_MS).toISOString().slice(0, 10);
}

export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && addDays(value, 0) === value;
}

export function dayRange(from: string, to: string): string[] {
  return from > to ? [] : Array.from({ length: daysBetween(from, to) + 1 }, (_, index) => addDays(from, index));
}
