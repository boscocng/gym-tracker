"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeAlias } from "@/rules/parse-set";
import { addAliases, insertExercise } from "@/server/exercises";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

export type FormState = { error: string; value: string } | null;

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const NAME_RULE = "Use a name of 1 to 60 characters.";
const NAME_TAKEN = "You already have an exercise with that name.";
const EXERCISE_GONE = "That exercise isn’t there any more.";

const rowId = z.coerce.number().int().positive();
const exerciseName = z.string().trim().min(1).max(60);
const flag = z.enum(["true", "false"]).transform((value) => value === "true");

export async function createExercise(_state: FormState, formData: FormData): Promise<FormState> {
  await requireOwnerSettings();
  const value = String(formData.get("name") ?? "");
  const name = exerciseName.safeParse(value);
  if (!name.success) {
    return { error: NAME_RULE, value };
  }
  const supabase = await createSessionClient();
  const id = await insertExercise(supabase, name.data, formData.get("is_bodyweight") === "on");
  if (id === null) {
    return { error: NAME_TAKEN, value };
  }
  redirect("/settings");
}

export async function renameExercise(id: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireOwnerSettings();
  const exerciseId = rowId.parse(id);
  const value = String(formData.get("name") ?? "");
  const name = exerciseName.safeParse(value);
  if (!name.success) {
    return { error: NAME_RULE, value };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("exercises")
    .update({ name: name.data })
    .eq("id", exerciseId)
    .select("id")
    .maybeSingle();
  if (error?.code === UNIQUE_VIOLATION) {
    return { error: NAME_TAKEN, value };
  }
  if (error) {
    throw error;
  }
  if (!data) {
    return { error: EXERCISE_GONE, value };
  }
  await addAliases(supabase, exerciseId, [normalizeAlias(name.data)]);
  refresh();
  return null;
}

export async function setBodyweight(id: number, formData: FormData): Promise<void> {
  await requireOwnerSettings();
  const exerciseId = rowId.parse(id);
  const isBodyweight = flag.parse(formData.get("is_bodyweight"));
  const supabase = await createSessionClient();
  const { error } = await supabase.from("exercises").update({ is_bodyweight: isBodyweight }).eq("id", exerciseId);
  if (error) {
    throw error;
  }
  refresh();
}

export async function setArchived(id: number, archived: boolean): Promise<void> {
  await requireOwnerSettings();
  const exerciseId = rowId.parse(id);
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("exercises")
    .update({ archived: z.boolean().parse(archived) })
    .eq("id", exerciseId);
  if (error) {
    throw error;
  }
  refresh();
}

export async function addAlias(id: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireOwnerSettings();
  const exerciseId = rowId.parse(id);
  const value = String(formData.get("alias") ?? "");
  const alias = normalizeAlias(value);
  if (!alias) {
    return { error: "Use letters, like “flat bench”.", value };
  }
  const supabase = await createSessionClient();
  const { data: existing, error: readError } = await supabase
    .from("exercise_aliases")
    .select("exercise_id, exercises(name)")
    .eq("alias", alias)
    .maybeSingle();
  if (readError) {
    throw readError;
  }
  if (existing) {
    return existing.exercise_id === exerciseId
      ? null
      : { error: `“${alias}” already means ${existing.exercises.name}.`, value };
  }
  const { error } = await supabase.from("exercise_aliases").insert({ alias, exercise_id: exerciseId });
  if (error?.code === FOREIGN_KEY_VIOLATION) {
    return { error: EXERCISE_GONE, value };
  }
  if (error) {
    throw error;
  }
  refresh();
  return null;
}

export async function removeAlias(alias: string): Promise<void> {
  await requireOwnerSettings();
  const spoken = z.string().min(1).parse(alias);
  const supabase = await createSessionClient();
  const { data: row, error } = await supabase
    .from("exercise_aliases")
    .select("alias, exercises(name)")
    .eq("alias", spoken)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (row && normalizeAlias(row.exercises.name) !== spoken) {
    const { error: deleteError } = await supabase.from("exercise_aliases").delete().eq("alias", spoken);
    if (deleteError) {
      throw deleteError;
    }
  }
  refresh();
}

export async function mergeExercise(id: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireOwnerSettings();
  const sourceId = rowId.parse(id);
  const value = String(formData.get("target") ?? "");
  const targetId = rowId.safeParse(value);
  if (!targetId.success || targetId.data === sourceId) {
    return { error: "Pick the exercise to merge into.", value };
  }
  const supabase = await createSessionClient();
  const { data: rows, error } = await supabase
    .from("exercises")
    .select("id, is_bodyweight")
    .in("id", [sourceId, targetId.data]);
  if (error) {
    throw error;
  }
  if (rows.length !== 2) {
    return { error: EXERCISE_GONE, value };
  }
  if (rows[0].is_bodyweight !== rows[1].is_bodyweight) {
    return { error: "Only exercises of the same kind (weighted or bodyweight) can be merged.", value };
  }
  const { error: mergeError } = await supabase.rpc("merge_exercises", {
    source_id: sourceId,
    target_id: targetId.data,
  });
  if (mergeError) {
    throw mergeError;
  }
  redirect(`/settings/exercises/${targetId.data}`);
}
