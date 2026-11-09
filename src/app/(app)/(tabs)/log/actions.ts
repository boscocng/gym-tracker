"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { type AliasTarget, PARSE_ERROR, parseSet } from "@/rules/parse-set";
import { trainingDay } from "@/rules/training-day";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

export type LogResult =
  | { kind: "added"; setId: number }
  | { kind: "unknown"; spokenName: string; loadGiven: boolean }
  | { kind: "error"; message: string };

type Session = Awaited<ReturnType<typeof createSessionClient>>;
type Settings = Awaited<ReturnType<typeof requireOwnerSettings>>;

const setText = z.string().trim().min(1).max(200);
const rowId = z.number().int().positive();

async function readAliases(supabase: Session): Promise<Map<string, AliasTarget>> {
  const { data, error } = await supabase
    .from("exercise_aliases")
    .select("alias, exercise_id, exercises(is_bodyweight)");
  if (error) {
    throw error;
  }
  return new Map(
    data.map((row) => [row.alias, { exerciseId: row.exercise_id, isBodyweight: row.exercises.is_bodyweight }]),
  );
}

async function saveParsedSet(
  supabase: Session,
  settings: Settings,
  text: string,
  aliases: ReadonlyMap<string, AliasTarget>,
): Promise<LogResult> {
  const result = parseSet(text, aliases, settings.unit);
  if (result.kind !== "set") {
    return result;
  }
  const { data, error } = await supabase
    .from("sets")
    .insert({
      day: trainingDay(new Date(), settings.time_zone, settings.rollover_hour),
      exercise_id: result.set.exerciseId,
      load_value: result.set.loadValue,
      load_unit: result.set.loadUnit,
      reps: result.set.reps,
      raw_input: text,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  refresh();
  return { kind: "added", setId: data.id };
}

export async function logSet(text: string): Promise<LogResult> {
  const settings = await requireOwnerSettings();
  const input = setText.safeParse(text);
  if (!input.success) {
    return { kind: "error", message: PARSE_ERROR };
  }
  const supabase = await createSessionClient();
  return saveParsedSet(supabase, settings, input.data, await readAliases(supabase));
}

export async function deleteSet(id: number): Promise<void> {
  await requireOwnerSettings();
  const setId = rowId.parse(id);
  const supabase = await createSessionClient();
  const { error } = await supabase.from("sets").delete().eq("id", setId);
  if (error) {
    throw error;
  }
  refresh();
}
