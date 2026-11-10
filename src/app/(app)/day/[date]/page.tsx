import { notFound } from "next/navigation";
import { isDay } from "@/rules/days";
import { trainingDay } from "@/rules/training-day";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { DayAddons, DayHeader, DayPhoto, WeightCard, WorkoutCard } from "./day-cards";
import { readDay } from "./read-day";
import { SkipReasonCard } from "./skip-reason-card";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  if (!isDay(date) || date > today) {
    notFound();
  }
  const day = await readDay(await createSessionClient(), settings, date, today);

  return (
    <div className="flex min-h-dvh flex-col">
      <DayHeader date={date} status={day.status} />
      <main className="flex flex-col gap-3 px-4 pb-8">
        {day.photo && <DayPhoto date={date} photo={day.photo} />}
        {(day.weight || day.average) && (
          <WeightCard weight={day.weight} average={day.average} change={day.change} unit={settings.unit} />
        )}
        {day.exercises.length > 0 && (
          <WorkoutCard exercises={day.exercises} setCount={day.setCount} unit={settings.unit} />
        )}
        {day.skipReason && <SkipReasonCard day={date} reason={day.skipReason} />}
        {day.addons.length > 0 && <DayAddons addons={day.addons} />}
      </main>
    </div>
  );
}
