import type { Enums } from "@/database.types";
import { addDays, daysBetween } from "./days";
import { KG_PER_LB } from "./units";

type WeighInFlag = Enums<"weigh_in_flag">;

export type PriorReading = {
  measuredAt: Date;
  kg: number;
  source: Enums<"weigh_in_source">;
  flag: WeighInFlag | null;
};

export type DayReading = PriorReading & {
  value: number;
  unit: Enums<"weight_unit">;
};

export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;

const MINUTE_MS = 60_000;
const DUPLICATE_WINDOW_MS = 10 * MINUTE_MS;
const DUPLICATE_TOLERANCE_KG = 0.05;
export const OUTLIER_WINDOW_MS = 14 * 24 * 60 * MINUTE_MS;
const OUTLIER_LIMIT_KG = 4;
const FLOAT_SLACK_KG = 1e-9;
const SCALE_STALE_AFTER_DAYS = 2;

export function classifyReading(kg: number, at: Date, prior: readonly PriorReading[]): WeighInFlag | null {
  const ageOf = (reading: PriorReading) => at.getTime() - reading.measuredAt.getTime();
  const earlier = prior.filter((reading) => ageOf(reading) >= 0);

  const isDuplicate = earlier.some(
    (reading) =>
      ageOf(reading) <= DUPLICATE_WINDOW_MS && Math.abs(reading.kg - kg) <= DUPLICATE_TOLERANCE_KG + FLOAT_SLACK_KG,
  );
  if (isDuplicate) {
    return "duplicate";
  }

  const latestAccepted = earlier
    .filter((reading) => reading.flag === null && ageOf(reading) <= OUTLIER_WINDOW_MS)
    .reduce<PriorReading | null>(
      (latest, reading) => (latest === null || ageOf(reading) < ageOf(latest) ? reading : latest),
      null,
    );
  if (latestAccepted !== null && Math.abs(latestAccepted.kg - kg) > OUTLIER_LIMIT_KG + FLOAT_SLACK_KG) {
    return "outlier";
  }
  return null;
}

export function dayWeight<Reading extends DayReading>(readings: readonly Reading[]): Reading | null {
  const manual = readings.find((reading) => reading.source === "manual");
  if (manual) {
    return manual;
  }
  return readings
    .filter((reading) => reading.flag === null)
    .reduce<Reading | null>(
      (first, reading) => (first === null || reading.measuredAt < first.measuredAt ? reading : first),
      null,
    );
}

export function dailyWeights<Reading extends DayReading & { day: string }>(
  readings: readonly Reading[],
): Map<string, Reading> {
  const byDay = Map.groupBy(readings, (reading) => reading.day);
  const weights = new Map<string, Reading>();
  for (const [day, dayReadings] of byDay) {
    const weight = dayWeight(dayReadings);
    if (weight) {
      weights.set(day, weight);
    }
  }
  return weights;
}

// The 7 calendar days ending on `day`, averaging the days that have a weight.
export function sevenDayAverageKg(day: string, dailyKg: ReadonlyMap<string, number>): number | null {
  const values = Array.from({ length: 7 }, (_, offset) => dailyKg.get(addDays(day, -offset))).filter(
    (kg) => kg !== undefined,
  );
  return values.length === 0 ? null : values.reduce((sum, kg) => sum + kg, 0) / values.length;
}

export function weekChangeKg(day: string, dailyKg: ReadonlyMap<string, number>): number | null {
  const current = sevenDayAverageKg(day, dailyKg);
  const previous = sevenDayAverageKg(addDays(day, -7), dailyKg);
  return current === null || previous === null ? null : current - previous;
}

export function isScaleStale(lastReadingDay: string | null, today: string): boolean {
  return lastReadingDay === null || daysBetween(lastReadingDay, today) >= SCALE_STALE_AFTER_DAYS;
}

// Rounded inward to 0.1, so every value in the range converts to 20 to 300 kg.
export function weightRangeIn(unit: Enums<"weight_unit">): { min: number; max: number } {
  const perKg = unit === "kg" ? 1 : 1 / KG_PER_LB;
  return { min: Math.ceil(MIN_WEIGHT_KG * perKg * 10) / 10, max: Math.floor(MAX_WEIGHT_KG * perKg * 10) / 10 };
}

const TREND_DAYS = 14;

export type TrendPoint = { day: string; kg: number | null; averageKg: number | null };

export function weightTrend(today: string, dailyKg: ReadonlyMap<string, number>) {
  const points: TrendPoint[] = Array.from({ length: TREND_DAYS }, (_, index) => {
    const day = addDays(today, index + 1 - TREND_DAYS);
    return { day, kg: dailyKg.get(day) ?? null, averageKg: sevenDayAverageKg(day, dailyKg) };
  });
  const averageKg = sevenDayAverageKg(today, dailyKg);
  const earlierKg = sevenDayAverageKg(addDays(today, -TREND_DAYS), dailyKg);
  const changeKg = averageKg === null || earlierKg === null ? null : averageKg - earlierKg;
  return { points, averageKg, changeKg, perWeekKg: changeKg === null ? null : (changeKg * 7) / TREND_DAYS };
}
