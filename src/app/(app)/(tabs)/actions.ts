"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { trainingDay } from "@/rules/training-day";
import { formatLoad } from "@/rules/units";
import { weightRangeIn } from "@/rules/weigh-in";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

const weightText = z
  .string()
  .trim()
  .regex(/^\d{1,4}([.,]\d{1,2})?$/)
  .transform((text) => Number(text.replace(",", ".")));

export async function saveManualWeight(text: string): Promise<string | null> {
  const settings = await requireOwnerSettings();
  const range = weightRangeIn(settings.unit);
  const weight = weightText.safeParse(text);
  if (!weight.success || weight.data < range.min || weight.data > range.max) {
    return `Enter a weight from ${formatLoad(range.min)} to ${formatLoad(range.max)} ${settings.unit}.`;
  }

  const now = new Date();
  const day = trainingDay(now, settings.time_zone, settings.rollover_hour);
  const supabase = await createSessionClient();
  const { data: existing, error } = await supabase
    .from("weigh_ins")
    .select("id")
    .eq("day", day)
    .eq("source", "manual")
    .maybeSingle();
  if (error) {
    throw error;
  }
  const reading = { measured_at: now.toISOString(), value: weight.data, unit: settings.unit };
  const { error: saveError } = existing
    ? await supabase.from("weigh_ins").update(reading).eq("id", existing.id)
    : await supabase.from("weigh_ins").insert({ ...reading, day, source: "manual" });
  if (saveError) {
    throw saveError;
  }
  refresh();
  return null;
}
