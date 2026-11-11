import { readAll } from "@/server/days";
import type { OwnerSettings } from "@/server/settings";
import type { createSecretClient } from "@/server/supabase";
import type { Counts, Exercise, PhotoRow, ReadingRow, SetRow } from "./reports";

export type SecretClient = ReturnType<typeof createSecretClient>;

export async function readSettings(supabase: SecretClient): Promise<OwnerSettings | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("unit, time_zone, rollover_hour, rest_rule, start_date")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function readReadings(supabase: SecretClient, from: string, to: string): Promise<ReadingRow[]> {
  const rows = await readAll((first, last) =>
    supabase
      .from("weigh_ins")
      .select("day, measured_at, value, unit, kg, source, flag")
      .gte("day", from)
      .lte("day", to)
      .order("id")
      .range(first, last),
  );
  return rows.map((row) => ({ ...row, measuredAt: new Date(row.measured_at) }));
}

type SetFilter = { from?: string; to?: string; exerciseId?: number };

export async function readSets(supabase: SecretClient, { from, to, exerciseId }: SetFilter): Promise<SetRow[]> {
  const rows = await readAll((first, last) => {
    let query = supabase
      .from("sets")
      .select("day, exercise_id, load_value, load_unit, load_kg, reps, exercises(name, is_bodyweight)");
    if (from) {
      query = query.gte("day", from);
    }
    if (to) {
      query = query.lte("day", to);
    }
    if (exerciseId !== undefined) {
      query = query.eq("exercise_id", exerciseId);
    }
    return query.order("day").order("created_at").order("id").range(first, last);
  });
  return rows.map((row) => ({
    day: row.day,
    exerciseId: row.exercise_id,
    name: row.exercises.name,
    isBodyweight: row.exercises.is_bodyweight,
    loadValue: row.load_value,
    loadUnit: row.load_unit,
    loadKg: row.load_kg,
    reps: row.reps,
  }));
}

export async function readExercises(supabase: SecretClient) {
  const [exercises, aliases] = await Promise.all([
    readAll((first, last) =>
      supabase.from("exercises").select("id, name, is_bodyweight").order("id").range(first, last),
    ),
    readAll((first, last) =>
      supabase.from("exercise_aliases").select("alias, exercise_id").order("alias").range(first, last),
    ),
  ]);
  return {
    exercises: exercises.map((row): Exercise => ({ id: row.id, name: row.name, isBodyweight: row.is_bodyweight })),
    aliases: new Map(aliases.map((row) => [row.alias, row.exercise_id])),
  };
}

export async function readSkipReasons(supabase: SecretClient, from: string, to: string) {
  const rows = await readAll((first, last) =>
    supabase
      .from("day_marks")
      .select("day, reason")
      .eq("kind", "skip")
      .gte("day", from)
      .lte("day", to)
      .order("day")
      .range(first, last),
  );
  return new Map(rows.flatMap((row) => (row.reason ? [[row.day, row.reason] as const] : [])));
}

export function readPhotos(supabase: SecretClient, from: string, to: string): Promise<PhotoRow[]> {
  return readAll((first, last) =>
    supabase
      .from("photos")
      .select("day, pose")
      .gte("day", from)
      .lte("day", to)
      .order("day")
      .order("pose")
      .range(first, last),
  );
}

const COUNTED = ["sets", "weigh_ins", "photos", "exercises", "addons"] as const;

export async function readCounts(supabase: SecretClient): Promise<Counts> {
  const results = await Promise.all(
    COUNTED.map((table) => supabase.from(table).select("*", { count: "exact", head: true })),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw failed.error;
  }
  const [sets, weighIns, photos, exercises, addons] = results.map((result) => result.count ?? 0);
  return { sets, weigh_ins: weighIns, photos, exercises, addons };
}
