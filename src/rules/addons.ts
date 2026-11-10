import { addDays, daysBetween } from "./days";
import { formatShortDate } from "./format";

export type Period = { id: number; details: string; startDay: string; endDay: string | null };

export type Addon = { id: number; name: string; periods: readonly Period[] };

export type DetailsChange =
  | { kind: "unchanged" }
  | { kind: "rewrite" }
  | { kind: "split"; closesOn: string }
  | { kind: "error"; message: string };

const FUTURE_START = "It can’t start after today.";

export function periodDay(startDay: string, today: string): number {
  return daysBetween(startDay, today) + 1;
}

export function periodLength(startDay: string, endDay: string): number {
  return daysBetween(startDay, endDay) + 1;
}

export function latestPeriod(periods: readonly Period[]): Period | null {
  return periods.reduce<Period | null>(
    (latest, period) => (!latest || period.startDay > latest.startDay ? period : latest),
    null,
  );
}

export function startError(start: string, today: string): string | null {
  return start > today ? FUTURE_START : null;
}

// A later start keeps the old details as history; the same start day only corrects them.
export function planDetailsChange(open: Period, details: string, start: string, today: string): DetailsChange {
  if (details === open.details) {
    return { kind: "unchanged" };
  }
  if (start > today) {
    return { kind: "error", message: FUTURE_START };
  }
  if (start < open.startDay) {
    return {
      kind: "error",
      message: `The new period can’t start before ${formatShortDate(open.startDay)}, when the current one started.`,
    };
  }
  return start === open.startDay ? { kind: "rewrite" } : { kind: "split", closesOn: addDays(start, -1) };
}

export function lastDayError(period: Period, lastDay: string, today: string): string | null {
  if (lastDay > today) {
    return "The last day can’t be after today.";
  }
  if (lastDay < period.startDay) {
    return `The last day can’t be before ${formatShortDate(period.startDay)}, when this period started.`;
  }
  return null;
}

// Starting again on the day it stopped undoes the stop instead of opening a second period that day.
export function restartReopens(stopped: Period, today: string): boolean {
  return stopped.endDay !== null && stopped.endDay >= today;
}

export function addonOverview(addons: readonly Addon[], today: string) {
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const active = addons
    .flatMap((addon) => {
      const open = addon.periods.find((period) => period.endDay === null);
      return open ? [{ addon, open }] : [];
    })
    .map(({ addon, open }) => ({
      id: addon.id,
      name: addon.name,
      details: open.details,
      since: open.startDay,
      day: periodDay(open.startDay, today),
    }))
    .sort(byName);
  const past = addons
    .flatMap((addon) =>
      addon.periods.flatMap(({ id, details, startDay, endDay }) =>
        endDay === null
          ? []
          : [
              {
                addonId: addon.id,
                periodId: id,
                name: addon.name,
                details,
                startDay,
                endDay,
                days: periodLength(startDay, endDay),
              },
            ],
      ),
    )
    .sort((a, b) => b.endDay.localeCompare(a.endDay) || byName(a, b));
  return { active, past };
}

export function activeOn(addons: readonly Addon[], day: string): { id: number; name: string; details: string }[] {
  return addons
    .flatMap((addon) => {
      const period = addon.periods.find((p) => p.startDay <= day && (p.endDay === null || p.endDay >= day));
      return period ? [{ id: addon.id, name: addon.name, details: period.details }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
