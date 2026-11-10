"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  type Addon,
  lastDayError,
  latestPeriod,
  planDetailsChange,
  restartReopens,
  startError,
} from "@/rules/addons";
import { isDay } from "@/rules/days";
import { trainingDay } from "@/rules/training-day";
import { readAddon } from "@/server/addons";
import { type OwnerSettings, requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";

const UNIQUE_VIOLATION = "23505";
const NAME_RULE = "Use a name of 1 to 60 characters.";
const NAME_TAKEN = "You already have an add-on with that name.";
const ADDON_GONE = "That add-on isn’t there any more.";
const ADDON_CHANGED = "This add-on changed since you opened it. Go back and open it again.";

const rowId = z.number().int().positive();
const name = z.string().trim().min(1, NAME_RULE).max(60, NAME_RULE);
const details = z.string().trim().max(200, "Keep the details to 200 characters.");
const dayText = z.string().refine(isDay, "Pick a date.");
const activeFields = z.object({ name, details, start: dayText });
const stoppedFields = z.object({ name, lastDay: dayText });

export type ActiveAddonInput = z.input<typeof activeFields>;
export type StoppedAddonInput = z.input<typeof stoppedFields>;

function today(settings: OwnerSettings): string {
  return trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
}

async function rename(supabase: SessionClient, addon: Addon, newName: string): Promise<string | null> {
  if (newName === addon.name) {
    return null;
  }
  const { error } = await supabase.from("addons").update({ name: newName }).eq("id", addon.id);
  if (error?.code === UNIQUE_VIOLATION) {
    return NAME_TAKEN;
  }
  if (error) {
    throw error;
  }
  return null;
}

async function throwIfError(request: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await request;
  if (error) {
    throw error;
  }
}

export async function createAddon(input: ActiveAddonInput): Promise<string | null> {
  const settings = await requireOwnerSettings();
  const fields = activeFields.safeParse(input);
  if (!fields.success) {
    return fields.error.issues[0].message;
  }
  const problem = startError(fields.data.start, today(settings));
  if (problem) {
    return problem;
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from("addons").insert({ name: fields.data.name }).select("id").single();
  if (error?.code === UNIQUE_VIOLATION) {
    return NAME_TAKEN;
  }
  if (error) {
    throw error;
  }
  const period = await supabase
    .from("addon_periods")
    .insert({ addon_id: data.id, details: fields.data.details, start_day: fields.data.start });
  if (period.error) {
    await supabase.from("addons").delete().eq("id", data.id);
    throw period.error;
  }
  return null;
}

export async function saveActiveAddon(id: number, input: ActiveAddonInput): Promise<string | null> {
  const settings = await requireOwnerSettings();
  const fields = activeFields.safeParse(input);
  if (!fields.success) {
    return fields.error.issues[0].message;
  }
  const supabase = await createSessionClient();
  const addon = await readAddon(supabase, rowId.parse(id));
  const open = addon?.periods.find((period) => period.endDay === null);
  if (!addon || !open) {
    return addon ? ADDON_CHANGED : ADDON_GONE;
  }
  const change = planDetailsChange(open, fields.data.details, fields.data.start, today(settings));
  if (change.kind === "error") {
    return change.message;
  }
  const renameProblem = await rename(supabase, addon, fields.data.name);
  if (renameProblem) {
    return renameProblem;
  }
  if (change.kind === "rewrite") {
    await throwIfError(supabase.from("addon_periods").update({ details: fields.data.details }).eq("id", open.id));
  }
  if (change.kind === "split") {
    await throwIfError(
      supabase.rpc("start_addon_period", {
        target_addon_id: addon.id,
        new_details: fields.data.details,
        new_start_day: fields.data.start,
      }),
    );
  }
  return null;
}

export async function saveStoppedAddon(id: number, input: StoppedAddonInput): Promise<string | null> {
  const settings = await requireOwnerSettings();
  const fields = stoppedFields.safeParse(input);
  if (!fields.success) {
    return fields.error.issues[0].message;
  }
  const supabase = await createSessionClient();
  const addon = await readAddon(supabase, rowId.parse(id));
  const last = addon && latestPeriod(addon.periods);
  if (!addon || !last?.endDay) {
    return addon ? ADDON_CHANGED : ADDON_GONE;
  }
  const problem = lastDayError(last, fields.data.lastDay, today(settings));
  if (problem) {
    return problem;
  }
  const renameProblem = await rename(supabase, addon, fields.data.name);
  if (renameProblem) {
    return renameProblem;
  }
  if (fields.data.lastDay !== last.endDay) {
    await throwIfError(supabase.from("addon_periods").update({ end_day: fields.data.lastDay }).eq("id", last.id));
  }
  return null;
}

export async function stopAddon(id: number): Promise<string | null> {
  const settings = await requireOwnerSettings();
  const supabase = await createSessionClient();
  const addon = await readAddon(supabase, rowId.parse(id));
  const open = addon?.periods.find((period) => period.endDay === null);
  if (!addon || !open) {
    return addon ? ADDON_CHANGED : ADDON_GONE;
  }
  await throwIfError(supabase.from("addon_periods").update({ end_day: today(settings) }).eq("id", open.id));
  refresh();
  return null;
}

export async function restartAddon(id: number): Promise<string | null> {
  const settings = await requireOwnerSettings();
  const supabase = await createSessionClient();
  const addon = await readAddon(supabase, rowId.parse(id));
  const last = addon && latestPeriod(addon.periods);
  if (!addon || !last?.endDay) {
    return addon ? ADDON_CHANGED : ADDON_GONE;
  }
  const day = today(settings);
  await throwIfError(
    restartReopens(last, day)
      ? supabase.from("addon_periods").update({ end_day: null }).eq("id", last.id)
      : supabase.rpc("start_addon_period", { target_addon_id: addon.id, new_details: last.details, new_start_day: day }),
  );
  refresh();
  return null;
}
