"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { dayStatus, restIsFree } from "@/rules/day-status";
import { addDays, isDay } from "@/rules/days";
import { trainingDay } from "@/rules/training-day";
import { readDayHistory } from "./days";
import { requireOwnerSettings } from "./settings";
import { createSessionClient } from "./supabase";

export type DayActionResult = { error: string } | null;

const OUT_OF_RANGE = "That day can’t be changed.";
const ALREADY_SORTED = "That day already has sets or a rest or skip.";
const REASON_RULE = "Write at least 20 characters.";

const reasonText = z.string().trim().min(20).max(500);

function openForMarking(status: ReturnType<typeof dayStatus>): boolean {
  return status === "unresolved" || status === "in_progress";
}

export async function takeRestDay(day: string): Promise<DayActionResult> {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  if (!isDay(day) || day < settings.start_date || day > today) {
    return { error: OUT_OF_RANGE };
  }
  const supabase = await createSessionClient();
  const history = await readDayHistory(supabase, settings.start_date, addDays(day, -7), day);
  if (!openForMarking(dayStatus(day, today, history))) {
    return { error: ALREADY_SORTED };
  }
  if (!restIsFree(day, settings.rest_rule, history)) {
    return { error: "Rest isn’t free on that day, so it counts as a skip." };
  }
  const { error } = await supabase
    .from("day_marks")
    .insert({ day, kind: "rest", resolved_via: day === today ? "normal" : "lock" });
  if (error) {
    throw error;
  }
  refresh();
  return null;
}

export async function skipDays(days: readonly string[], reason: string): Promise<DayActionResult> {
  const settings = await requireOwnerSettings();
  const text = reasonText.safeParse(reason);
  if (!text.success) {
    return { error: REASON_RULE };
  }
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const unique = [...new Set(days)].sort();
  if (unique.length === 0 || unique.some((day) => !isDay(day) || day < settings.start_date || day > today)) {
    return { error: OUT_OF_RANGE };
  }
  const supabase = await createSessionClient();
  const history = await readDayHistory(supabase, settings.start_date, unique[0], unique.at(-1) ?? unique[0]);
  if (!unique.every((day) => openForMarking(dayStatus(day, today, history)))) {
    return { error: ALREADY_SORTED };
  }
  const { error } = await supabase.from("day_marks").insert(
    unique.map((day) => ({
      day,
      kind: "skip" as const,
      reason: text.data,
      resolved_via: day === today ? ("normal" as const) : ("lock" as const),
    })),
  );
  if (error) {
    throw error;
  }
  refresh();
  return null;
}

export async function updateSkipReason(day: string, reason: string): Promise<DayActionResult> {
  await requireOwnerSettings();
  const text = reasonText.safeParse(reason);
  if (!text.success) {
    return { error: REASON_RULE };
  }
  if (!isDay(day)) {
    return { error: OUT_OF_RANGE };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("day_marks")
    .update({ reason: text.data })
    .eq("day", day)
    .eq("kind", "skip")
    .select("day")
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return { error: "That day wasn’t skipped." };
  }
  refresh();
  return null;
}
