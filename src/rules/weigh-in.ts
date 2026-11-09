import type { Enums } from "@/database.types";
import { daysBetween } from "./days";

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

export function isScaleStale(lastReadingDay: string | null, today: string): boolean {
  return lastReadingDay === null || daysBetween(lastReadingDay, today) >= SCALE_STALE_AFTER_DAYS;
}
