import { formatLoad } from "./units";

export type ExerciseGroup<T> = { exerciseId: number; sets: (T & { number: number })[] };

// Expects the day's sets in the order they were logged; set numbers are derived, never stored.
export function groupByExercise<T extends { exerciseId: number }>(sets: readonly T[]): ExerciseGroup<T>[] {
  const groups = new Map<number, ExerciseGroup<T>>();
  for (const set of sets) {
    const group = groups.get(set.exerciseId) ?? { exerciseId: set.exerciseId, sets: [] };
    group.sets.push({ ...set, number: group.sets.length + 1 });
    groups.set(set.exerciseId, group);
  }
  return [...groups.values()];
}

export function loadLabel(isBodyweight: boolean, amount: number): string {
  if (!isBodyweight) {
    return formatLoad(amount);
  }
  return amount === 0 ? "BW" : `+${formatLoad(amount)}`;
}

function count(amount: number, word: string): string {
  return `${amount} ${word}${amount === 1 ? "" : "s"}`;
}

export function logSummary(setCount: number, exerciseCount: number): string {
  return setCount === 0 ? count(0, "set") : `${count(setCount, "set")} · ${count(exerciseCount, "exercise")}`;
}
