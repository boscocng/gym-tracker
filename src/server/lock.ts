import { unresolvedDays } from "@/rules/day-status";
import { trainingDay } from "@/rules/training-day";
import { readDayHistory } from "./days";
import type { OwnerSettings } from "./settings";
import type { SessionClient } from "./supabase";

// Every tracked day up to today, and the past days that still need sorting out, oldest first.
export async function readLockState(supabase: SessionClient, settings: OwnerSettings) {
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const history = await readDayHistory(supabase, settings.start_date, settings.start_date, today);
  return { today, history, unresolved: unresolvedDays(today, history) };
}
