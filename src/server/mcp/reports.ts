import type { Enums } from "@/database.types";
import type { Addon } from "@/rules/addons";
import { type DayHistory, type DayStatus, dayStatus } from "@/rules/day-status";
import { dayRange, daysBetween } from "@/rules/days";
import { normalizeAlias } from "@/rules/parse-set";
import { groupByExercise } from "@/rules/sets";
import { epleyKg } from "@/rules/strength";
import { fromKg, weightIn } from "@/rules/units";
import { type DayReading, dailyWeights, sevenDayAverageKg } from "@/rules/weigh-in";
import type { OwnerSettings } from "@/server/settings";

type Unit = Enums<"weight_unit">;

export const MAX_RANGE_DAYS = 366;

export type ReadingRow = DayReading & { day: string };

export type PhotoRow = { day: string; pose: Enums<"photo_pose"> };

export type SetRow = {
  day: string;
  exerciseId: number;
  name: string;
  isBodyweight: boolean;
  loadValue: number;
  loadUnit: Unit;
  loadKg: number;
  reps: number;
};

export type Exercise = { id: number; name: string; isBodyweight: boolean };

export type Counts = { sets: number; weigh_ins: number; photos: number; exercises: number; addons: number };

export function rangeError(from: string, to: string): string | null {
  if (from > to) {
    return "`from` has to be on or before `to`.";
  }
  return daysBetween(from, to) >= MAX_RANGE_DAYS ? `Ask for at most ${MAX_RANGE_DAYS} days at a time.` : null;
}

export function findExercise(
  name: string,
  exercises: readonly Exercise[],
  aliases: ReadonlyMap<string, number>,
): Exercise | null {
  const id = aliases.get(normalizeAlias(name));
  const typed = name.trim().toLowerCase();
  return exercises.find((exercise) => exercise.id === id || exercise.name.toLowerCase() === typed) ?? null;
}

function dailyKg(weights: ReadonlyMap<string, ReadingRow>): Map<string, number> {
  return new Map([...weights].map(([day, reading]) => [day, reading.kg]));
}

export function weightReport(unit: Unit, from: string, to: string, readings: readonly ReadingRow[]) {
  const weights = dailyWeights(readings);
  const kgByDay = dailyKg(weights);
  return {
    unit,
    days: dayRange(from, to).flatMap((day) => {
      const weight = weights.get(day);
      const averageKg = sevenDayAverageKg(day, kgByDay);
      if (!weight && averageKg === null) {
        return [];
      }
      return [
        {
          day,
          weight: weight ? weightIn(unit, weight) : undefined,
          source: weight?.source,
          average_7d: averageKg === null ? undefined : fromKg(unit, averageKg),
        },
      ];
    }),
  };
}

function loadIn(unit: Unit, set: SetRow): number {
  return weightIn(unit, { value: set.loadValue, unit: set.loadUnit, kg: set.loadKg });
}

export function setsReport(unit: Unit, sets: readonly SetRow[]) {
  return {
    unit,
    note: "Sets are in the order they were logged. For bodyweight exercises, load is the weight added to bodyweight.",
    days: [...Map.groupBy(sets, (set) => set.day)].map(([day, daySets]) => ({
      day,
      exercises: groupByExercise(daySets).map(({ sets: exerciseSets }) => ({
        name: exerciseSets[0].name,
        bodyweight: exerciseSets[0].isBodyweight || undefined,
        sets: exerciseSets.map((set) => ({ load: loadIn(unit, set), reps: set.reps })),
      })),
    })),
  };
}

export function exerciseHistory(
  unit: Unit,
  exercise: Exercise,
  sets: readonly SetRow[],
  bodyweightKg: ReadonlyMap<string, number>,
) {
  const sessions = [...Map.groupBy(sets, (set) => set.day)].map(([day, daySets]) => {
    const bodyweight = exercise.isBodyweight ? bodyweightKg.get(day) : 0;
    const score = (set: SetRow) => epleyKg(set.loadKg + (bodyweight ?? 0), set.reps);
    const top = daySets.reduce((best, set) => (score(set) > score(best) ? set : best));
    return {
      day,
      sets: daySets.length,
      top_set: { load: loadIn(unit, top), reps: top.reps },
      e1rm: bodyweight === undefined ? undefined : fromKg(unit, score(top)),
    };
  });
  return {
    exercise: exercise.name,
    bodyweight: exercise.isBodyweight || undefined,
    unit,
    e1rm_formula: exercise.isBodyweight
      ? "Epley with that day's bodyweight added: (load + bodyweight) × (1 + reps / 30). Missing on days without a weigh-in."
      : "Epley: load × (1 + reps / 30)",
    sessions,
  };
}

export function dayReport(
  from: string,
  to: string,
  today: string,
  history: DayHistory,
  skipReasons: ReadonlyMap<string, string>,
  photos: readonly PhotoRow[],
) {
  const first = from > history.startDate ? from : history.startDate;
  const daysWith = (pose: Enums<"photo_pose">) =>
    new Set(photos.filter((photo) => photo.pose === pose).map((photo) => photo.day));
  const front = daysWith("front");
  const back = daysWith("back");
  return {
    tracking_started: history.startDate,
    today,
    days: dayRange(first, to < today ? to : today).map((day) => ({
      day,
      status: dayStatus(day, today, history),
      skip_reason: skipReasons.get(day),
      photo: front.has(day),
      back_photo: back.has(day) || undefined,
    })),
  };
}

export function addonReport(addons: readonly Addon[]) {
  return {
    note: "Changing an add-on's details starts a new period. end is null while a period is running.",
    addons: [...addons]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((addon) => ({
        name: addon.name,
        periods: [...addon.periods]
          .sort((a, b) => a.startDay.localeCompare(b.startDay))
          .map((period) => ({ details: period.details, start: period.startDay, end: period.endDay })),
      })),
  };
}

export function overviewReport(
  settings: OwnerSettings,
  today: string,
  history: DayHistory,
  counts: Counts,
  recentReadings: readonly ReadingRow[],
) {
  const statuses = dayRange(history.startDate, today).map((day) => dayStatus(day, today, history));
  const tally = (status: DayStatus) => statuses.filter((entry) => entry === status).length;
  const weights = dailyWeights(recentReadings);
  const latestDay = [...weights.keys()].sort().at(-1);
  const latest = latestDay && weights.get(latestDay);
  const latestAverage = latestDay ? sevenDayAverageKg(latestDay, dailyKg(weights)) : null;
  return {
    today,
    tracking_started: settings.start_date,
    unit: settings.unit,
    time_zone: settings.time_zone,
    day_starts_at_hour: settings.rollover_hour,
    rest_rule: settings.rest_rule,
    days: {
      trained: tally("trained"),
      rest: tally("rest"),
      skipped: tally("skipped"),
      unresolved: tally("unresolved"),
      today: dayStatus(today, today, history),
    },
    counts,
    latest_weight:
      latestDay && latest
        ? {
            day: latestDay,
            weight: weightIn(settings.unit, latest),
            average_7d: latestAverage === null ? undefined : fromKg(settings.unit, latestAverage),
          }
        : null,
  };
}
