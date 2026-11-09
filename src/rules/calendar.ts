import { addDays } from "./days";

export type MonthCell = { day: string; inMonth: boolean };

export function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7);
}

// Whole Monday-to-Sunday weeks covering the month.
export function monthGrid(month: string): MonthCell[] {
  const first = `${month}-01`;
  const leading = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = Number(addDays(`${shiftMonth(month, 1)}-01`, -1).slice(8));
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const day = addDays(first, index - leading);
    return { day, inMonth: day.startsWith(month) };
  });
}

export function monthName(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}
