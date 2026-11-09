import { dayStatus } from "@/rules/day-status";
import { addDays } from "@/rules/days";
import { groupByExercise, loadLabel } from "@/rules/sets";
import { formatChange, formatWeight, fromKg, weightIn } from "@/rules/units";
import { dailyWeights, sevenDayAverageKg, weekChangeKg } from "@/rules/weigh-in";
import type { OwnerSettings } from "@/server/settings";
import type { SessionClient } from "@/server/supabase";

// Everything the Day screen shows for one date, already formatted in the owner's unit.
export async function readDay(supabase: SessionClient, settings: OwnerSettings, date: string, today: string) {
  const [sets, mark, readings] = await Promise.all([
    supabase
      .from("sets")
      .select("id, exercise_id, load_value, load_unit, load_kg, reps, exercises(name, is_bodyweight)")
      .eq("day", date)
      .order("created_at")
      .order("id"),
    supabase.from("day_marks").select("kind, reason").eq("day", date).maybeSingle(),
    supabase
      .from("weigh_ins")
      .select("day, measured_at, value, unit, kg, source, flag")
      .gte("day", addDays(date, -13))
      .lte("day", date),
  ]);
  if (sets.error || mark.error || readings.error) {
    throw sets.error ?? mark.error ?? readings.error;
  }

  const weights = dailyWeights(
    readings.data.map((reading) => ({ ...reading, measuredAt: new Date(reading.measured_at) })),
  );
  const dailyKg = new Map([...weights].map(([day, reading]) => [day, reading.kg]));
  const weight = weights.get(date);
  const average = sevenDayAverageKg(date, dailyKg);
  const change = weekChangeKg(date, dailyKg);
  const exercises = groupByExercise(sets.data.map((set) => ({ ...set, exerciseId: set.exercise_id }))).map((group) => {
    const { name, is_bodyweight } = group.sets[0].exercises;
    const line = group.sets
      .map((set) => {
        const amount = weightIn(settings.unit, { value: set.load_value, unit: set.load_unit, kg: set.load_kg });
        return `${loadLabel(is_bodyweight, amount)} × ${set.reps}`;
      })
      .join(" · ");
    return { id: group.exerciseId, name, line };
  });

  return {
    status: dayStatus(date, today, {
      startDate: settings.start_date,
      trained: new Set(sets.data.length > 0 ? [date] : []),
      marks: new Map(mark.data ? [[date, mark.data.kind]] : []),
    }),
    skipReason: mark.data?.kind === "skip" ? mark.data.reason : null,
    setCount: sets.data.length,
    exercises,
    weight: weight ? formatWeight(weightIn(settings.unit, weight)) : null,
    average: average === null ? null : formatWeight(fromKg(settings.unit, average)),
    change: change === null ? null : formatChange(fromKg(settings.unit, change)),
  };
}
