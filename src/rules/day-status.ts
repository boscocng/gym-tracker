import type { Enums } from "@/database.types";
import { addDays } from "./days";

export type DayStatus = "trained" | "rest" | "skipped" | "unresolved" | "in_progress";

export type DayHistory = {
  startDate: string;
  trained: ReadonlySet<string>;
  marks: ReadonlyMap<string, Enums<"day_mark_kind">>;
};

const REST_WINDOWS = {
  six_of_seven: { days: 7, needed: 6 },
  strict: { days: 6, needed: 6 },
} as const;

const SKIP_WINDOW_DAYS = 30;

// Null for days outside tracking: before the start date or after today.
export function dayStatus(day: string, today: string, history: DayHistory): DayStatus | null {
  if (day < history.startDate || day > today) {
    return null;
  }
  if (history.trained.has(day)) {
    return "trained";
  }
  const mark = history.marks.get(day);
  if (mark) {
    return mark === "rest" ? "rest" : "skipped";
  }
  return day === today ? "in_progress" : "unresolved";
}

export function unresolvedDays(today: string, history: DayHistory): string[] {
  const days: string[] = [];
  for (let day = history.startDate; day < today; day = addDays(day, 1)) {
    if (dayStatus(day, today, history) === "unresolved") {
      days.push(day);
    }
  }
  return days;
}

export function restWindow(rule: Enums<"rest_rule">): { days: number; needed: number } {
  return REST_WINDOWS[rule];
}

// Days before the start date count as not trained, so rest stays locked during the first week.
export function trainedBefore(day: string, count: number, history: DayHistory): number {
  let trained = 0;
  for (let offset = 1; offset <= count; offset += 1) {
    const earlier = addDays(day, -offset);
    if (earlier >= history.startDate && history.trained.has(earlier)) {
      trained += 1;
    }
  }
  return trained;
}

export function restIsFree(day: string, rule: Enums<"rest_rule">, history: DayHistory): boolean {
  const { days, needed } = REST_WINDOWS[rule];
  return trainedBefore(day, days, history) >= needed;
}

export type StripDay = { day: string; status: DayStatus | null };

export type RestCheck = { free: boolean; trained: number; days: number; needed: number; strip: StripDay[] };

// Whether rest is free on `day`, with the 7 days before it, for the rest sheet and the skip flow.
export function restCheck(day: string, today: string, rule: Enums<"rest_rule">, history: DayHistory): RestCheck {
  const { days, needed } = REST_WINDOWS[rule];
  const strip = Array.from({ length: 7 }, (_, index) => {
    const earlier = addDays(day, index - 7);
    return { day: earlier, status: dayStatus(earlier, today, history) };
  });
  return { free: restIsFree(day, rule, history), trained: trainedBefore(day, days, history), days, needed, strip };
}

// Skips in the 30 days ending today, counting the days about to be skipped.
export function skipCountWith(newDays: readonly string[], today: string, history: DayHistory): number {
  const from = addDays(today, 1 - SKIP_WINDOW_DAYS);
  const inWindow = (day: string) => day >= from && day <= today;
  const existing = [...history.marks].filter(([day, kind]) => kind === "skip" && inWindow(day)).length;
  return existing + new Set(newDays.filter(inWindow)).size;
}

export function skipsThisMonth(today: string, history: DayHistory): number {
  const month = today.slice(0, 7);
  return [...history.marks].filter(([day, kind]) => kind === "skip" && day.startsWith(month) && day <= today).length;
}

export function ordinal(count: number): string {
  const tens = count % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][count % 10] ?? "th");
  return `${count}${suffix}`;
}
