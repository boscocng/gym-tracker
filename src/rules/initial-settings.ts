import type { Enums } from "@/database.types";
import { isTimeZone } from "./time-zone";
import { trainingDay } from "./training-day";

export const DEFAULT_ROLLOVER_HOUR = 4;
const FALLBACK_TIME_ZONE = "UTC";

export function defaultUnit(locale: string): Enums<"weight_unit"> {
  try {
    return new Intl.Locale(locale).maximize().region === "US" ? "lb" : "kg";
  } catch {
    return "kg";
  }
}

export function initialSettings(timeZone: string, locale: string, now: Date = new Date()) {
  const zone = isTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE;
  return {
    time_zone: zone,
    unit: defaultUnit(locale),
    rollover_hour: DEFAULT_ROLLOVER_HOUR,
    start_date: trainingDay(now, zone, DEFAULT_ROLLOVER_HOUR),
  };
}
