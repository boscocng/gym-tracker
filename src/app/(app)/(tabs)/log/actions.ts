"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  type AliasTarget,
  PARSE_ERROR,
  type ParsedSet,
  type ParseResult,
  parseSet,
  setValues,
} from "@/rules/parse-set";
import { trainingDay } from "@/rules/training-day";
import { addAliases, insertExercise } from "@/server/exercises";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";

export type LogResult =
  | { kind: "added"; setId: number }
  | { kind: "unknown"; spokenName: string; loadGiven: boolean }
  | { kind: "error"; message: string };

type Settings = Awaited<ReturnType<typeof requireOwnerSettings>>;

const EXERCISE_GONE = "That exercise isn’t there any more. Pick another one.";
const NAME_TAKEN = "You already have an exercise with that name. Pick it from the list or choose another name.";
const NEEDS_WEIGHT = "That exercise needs a weight. Close this and say the set again with the weight.";
const EDIT_INVALID = "Enter the weight as a number up to 9999.99, and whole reps from 1 to 999.";
const SET_GONE = "That set isn’t there any more.";

const setText = z.string().trim().min(1).max(200);
const rowId = z.number().int().positive();
const exerciseName = z.string().trim().min(1).max(60);
const loadText = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().max(9999.99));
const repsText = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(999));

async function readAliases(supabase: SessionClient): Promise<Map<string, AliasTarget>> {
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

async function insertSet(
  supabase: SessionClient,
  settings: Settings,
  text: string,
  set: ParsedSet,
): Promise<LogResult> {
  const { data, error } = await supabase
    .from("sets")
    .insert({
      day: trainingDay(new Date(), settings.time_zone, settings.rollover_hour),
      exercise_id: set.exerciseId,
      load_value: set.loadValue,
      load_unit: set.loadUnit,
      reps: set.reps,
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

async function store(
  supabase: SessionClient,
  settings: Settings,
  text: string,
  result: ParseResult,
): Promise<LogResult> {
  if (result.kind === "error") {
    return result;
  }
  if (result.kind === "unknown") {
    return { kind: "unknown", spokenName: result.spokenName, loadGiven: result.reading.load !== null };
  }
  return insertSet(supabase, settings, text, result.set);
}

export async function logSet(text: string): Promise<LogResult> {
  const settings = await requireOwnerSettings();
  const input = setText.safeParse(text);
  if (!input.success) {
    return { kind: "error", message: PARSE_ERROR };
  }
  const supabase = await createSessionClient();
  const result = parseSet(input.data, await readAliases(supabase), settings.unit);
  return store(supabase, settings, input.data, result);
}

export async function logSetAs(text: string, exerciseId: number): Promise<LogResult> {
  const settings = await requireOwnerSettings();
  const input = setText.safeParse(text);
  const id = rowId.safeParse(exerciseId);
  if (!input.success || !id.success) {
    return { kind: "error", message: PARSE_ERROR };
  }
  const supabase = await createSessionClient();
  const result = parseSet(input.data, await readAliases(supabase), settings.unit);
  if (result.kind !== "unknown") {
    return store(supabase, settings, input.data, result);
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .select("id, is_bodyweight")
    .eq("id", id.data)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!exercise) {
    return { kind: "error", message: EXERCISE_GONE };
  }
  const values = setValues(result.reading, exercise.is_bodyweight);
  if (!values) {
    return { kind: "error", message: NEEDS_WEIGHT };
  }
  await addAliases(supabase, exercise.id, [result.spokenName]);
  return insertSet(supabase, settings, input.data, { exerciseId: exercise.id, ...values });
}

export async function logSetAsNew(text: string, name: string, isBodyweight: boolean): Promise<LogResult> {
  const settings = await requireOwnerSettings();
  const input = setText.safeParse(text);
  const newName = exerciseName.safeParse(name);
  const bodyweight = z.boolean().safeParse(isBodyweight);
  if (!input.success) {
    return { kind: "error", message: PARSE_ERROR };
  }
  if (!newName.success || !bodyweight.success) {
    return { kind: "error", message: "Give the exercise a name of up to 60 characters." };
  }
  const supabase = await createSessionClient();
  const result = parseSet(input.data, await readAliases(supabase), settings.unit);
  if (result.kind !== "unknown") {
    return store(supabase, settings, input.data, result);
  }
  const values = setValues(result.reading, bodyweight.data);
  if (!values) {
    return { kind: "error", message: NEEDS_WEIGHT };
  }

  const exerciseId = await insertExercise(supabase, newName.data, bodyweight.data, [result.spokenName]);
  if (exerciseId === null) {
    return { kind: "error", message: NAME_TAKEN };
  }
  return insertSet(supabase, settings, input.data, { exerciseId, ...values });
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

export async function updateSet(id: number, load: string, reps: string): Promise<string | null> {
  await requireOwnerSettings();
  const setId = rowId.safeParse(id);
  const loadValue = loadText.safeParse(load);
  const repCount = repsText.safeParse(reps);
  if (!setId.success || !loadValue.success || !repCount.success) {
    return EDIT_INVALID;
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("sets")
    .update({ load_value: loadValue.data, reps: repCount.data })
    .eq("id", setId.data)
    .select("id")
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return SET_GONE;
  }
  refresh();
  return null;
}
