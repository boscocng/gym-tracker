import { formatDayLabel } from "@/rules/format";
import { groupByExercise, loadLabel, logSummary } from "@/rules/sets";
import { trainingDay } from "@/rules/training-day";
import { weightIn } from "@/rules/units";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { LogScreen } from "./log-screen";
import type { LogGroup } from "./set-list";

export default async function LogPage() {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);

  const supabase = await createSessionClient();
  const { data: sets, error } = await supabase
    .from("sets")
    .select("id, exercise_id, load_value, load_unit, load_kg, reps, exercises(name, is_bodyweight)")
    .eq("day", today)
    .order("created_at")
    .order("id");
  if (error) {
    throw error;
  }
  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("archived", false)
    .order("name");
  if (exercisesError) {
    throw exercisesError;
  }

  const groups: LogGroup[] = groupByExercise(sets.map((set) => ({ ...set, exerciseId: set.exercise_id }))).map(
    (group) => {
      const { name, is_bodyweight } = group.sets[0].exercises;
      return {
        exerciseId: group.exerciseId,
        name,
        isBodyweight: is_bodyweight,
        rows: group.sets.map((set) => {
          const amount = weightIn(settings.unit, { value: set.load_value, unit: set.load_unit, kg: set.load_kg });
          return {
            id: set.id,
            number: set.number,
            load: loadLabel(is_bodyweight, amount),
            unit: is_bodyweight && amount === 0 ? null : settings.unit,
            reps: set.reps,
            loadValue: set.load_value,
            loadUnit: set.load_unit,
          };
        }),
      };
    },
  );

  return (
    <LogScreen
      dayLabel={formatDayLabel(today)}
      summary={logSummary(sets.length, groups.length)}
      groups={groups}
      exercises={exercises}
    />
  );
}
