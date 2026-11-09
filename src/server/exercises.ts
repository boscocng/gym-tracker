import { normalizeAlias } from "@/rules/parse-set";
import type { SessionClient } from "./supabase";

const UNIQUE_VIOLATION = "23505";

export async function addAliases(supabase: SessionClient, exerciseId: number, aliases: readonly string[]) {
  const rows = [...new Set(aliases.filter(Boolean))].map((alias) => ({ alias, exercise_id: exerciseId }));
  const { error } = await supabase
    .from("exercise_aliases")
    .upsert(rows, { onConflict: "alias", ignoreDuplicates: true });
  if (error) {
    throw error;
  }
}

// Returns null when the name is taken. The exercise's own name always becomes one of its aliases.
export async function insertExercise(
  supabase: SessionClient,
  name: string,
  isBodyweight: boolean,
  aliases: readonly string[] = [],
): Promise<number | null> {
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name, is_bodyweight: isBodyweight })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    return null;
  }
  if (error) {
    throw error;
  }
  await addAliases(supabase, data.id, [normalizeAlias(name), ...aliases]);
  return data.id;
}
