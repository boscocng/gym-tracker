import { restCheck } from "@/rules/day-status";
import { addDays } from "@/rules/days";
import { formatDayLabel } from "@/rules/format";
import { trainingDay } from "@/rules/training-day";
import { readDayHistory } from "@/server/days";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { LogScreen } from "./log-screen";
import { readLog } from "./read-log";

export default async function LogPage() {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const supabase = await createSessionClient();
  const [log, mark, history] = await Promise.all([
    readLog(supabase, settings.unit, today),
    supabase.from("day_marks").select("kind, reason").eq("day", today).maybeSingle(),
    readDayHistory(supabase, settings.start_date, addDays(today, -7), today),
  ]);
  if (mark.error) {
    throw mark.error;
  }

  return (
    <LogScreen
      {...log}
      dayLabel={formatDayLabel(today)}
      notTraining={{ day: today, rest: restCheck(today, today, settings.rest_rule, history), mark: mark.data }}
    />
  );
}
