import type { Enums } from "@/database.types";
import { groupByExercise, loadLabel, logSummary } from "@/rules/sets";
import { weightIn } from "@/rules/units";
import type { SessionClient } from "@/server/supabase";
import type { LogGroup } from "./set-list";

// The day's sets grouped for the Log screen, plus the exercises the unknown-exercise sheet offers.
export async function readLog(supabase: SessionClient, unit: Enums<"weight_unit">, day: string) {
  const [sets, exercises] = await Promise.all([
    supabase
      .from("sets")
      .select("id, exercise_id, load_value, load_unit, load_kg, reps, exercises(name, is_bodyweight)")
      .eq("day", day)
      .order("created_at")
      .order("id"),
    supabase.from("exercises").select("id, name").eq("archived", false).order("name"),
  ]);
  if (sets.error || exercises.error) {
    throw sets.error ?? exercises.error;
  }

  const groups: LogGroup[] = groupByExercise(sets.data.map((set) => ({ ...set, exerciseId: set.exercise_id }))).map(
    (group) => {
      const { name, is_bodyweight } = group.sets[0].exercises;
      return {
        exerciseId: group.exerciseId,
        name,
        isBodyweight: is_bodyweight,
        rows: group.sets.map((set) => {
          const amount = weightIn(unit, { value: set.load_value, unit: set.load_unit, kg: set.load_kg });
          return {
            id: set.id,
            number: set.number,
            load: loadLabel(is_bodyweight, amount),
            unit: is_bodyweight && amount === 0 ? null : unit,
            reps: set.reps,
            loadValue: set.load_value,
            loadUnit: set.load_unit,
          };
        }),
      };
    },
  );
  return { groups, summary: logSummary(sets.data.length, groups.length), exercises: exercises.data };
}
