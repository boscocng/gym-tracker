import { redirect } from "next/navigation";
import { SkipFlow } from "@/components/skip/skip-flow";
import { dayStatus, restCheck, skipCountWith } from "@/rules/day-status";
import { addDays } from "@/rules/days";
import { trainingDay } from "@/rules/training-day";
import { readDayHistory } from "@/server/days";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

export default async function SkipTodayPage() {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const supabase = await createSessionClient();
  const history = await readDayHistory(supabase, settings.start_date, addDays(today, -29), today);
  if (dayStatus(today, today, history) !== "in_progress") {
    redirect("/log");
  }
  const skipCount = skipCountWith([today], today, history);

  return (
    <SkipFlow
      variant="today"
      day={today}
      extraDays={[]}
      rest={restCheck(today, today, settings.rest_rule, history)}
      skipCount={skipCount}
      skipCountAll={skipCount}
      backHref="/log"
    />
  );
}
