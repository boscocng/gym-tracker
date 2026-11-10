import { addDays } from "./days";

export type StrengthSet = {
  day: string;
  exerciseId: number;
  name: string;
  isBodyweight: boolean;
  loadKg: number;
  reps: number;
};

export type StrengthChange = { exerciseId: number; name: string; percent: number };

const WINDOW_DAYS = 28;
const COMPARED_DAYS = 7;
const SHOWN_EXERCISES = 3;

export function epleyKg(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30);
}

function bestEpleyKg(
  sets: readonly StrengthSet[],
  from: string,
  to: string,
  bodyweightKg: ReadonlyMap<string, number>,
): number | null {
  let best: number | null = null;
  for (const set of sets) {
    const bodyweight = set.isBodyweight ? bodyweightKg.get(set.day) : 0;
    if (set.day >= from && set.day <= to && bodyweight !== undefined) {
      best = Math.max(best ?? 0, epleyKg(set.loadKg + bodyweight, set.reps));
    }
  }
  return best;
}

export function strengthChanges(
  today: string,
  sets: readonly StrengthSet[],
  bodyweightKg: ReadonlyMap<string, number>,
): StrengthChange[] {
  const windowStart = addDays(today, 1 - WINDOW_DAYS);
  const byExercise = Map.groupBy(
    sets.filter((set) => set.day >= windowStart && set.day <= today),
    (set) => set.exerciseId,
  );
  return [...byExercise.values()]
    .sort((a, b) => b.length - a.length || a[0].name.localeCompare(b[0].name))
    .slice(0, SHOWN_EXERCISES)
    .flatMap((exerciseSets) => {
      const recent = bestEpleyKg(exerciseSets, addDays(today, 1 - COMPARED_DAYS), today, bodyweightKg);
      const earlier = bestEpleyKg(exerciseSets, windowStart, addDays(windowStart, COMPARED_DAYS - 1), bodyweightKg);
      if (recent === null || !earlier) {
        return [];
      }
      const { exerciseId, name } = exerciseSets[0];
      return [{ exerciseId, name, percent: (recent / earlier - 1) * 100 }];
    });
}
