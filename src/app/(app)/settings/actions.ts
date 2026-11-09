"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Constants, type TablesUpdate } from "@/database.types";
import { isTimeZone } from "@/rules/time-zone";
import { createSessionClient } from "@/server/supabase";

const unitField = z.enum(Constants.public.Enums.weight_unit);
const restRuleField = z.enum(Constants.public.Enums.rest_rule);
const hourField = z.coerce.number().int().min(0).max(23);
const timeZoneField = z.string().refine(isTimeZone);

async function updateSettings(values: TablesUpdate<"settings">) {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login");
  }
  const { error } = await supabase.from("settings").update(values).eq("owner_id", data.claims.sub);
  if (error) {
    throw error;
  }
  refresh();
}

export async function updateUnit(formData: FormData) {
  await updateSettings({ unit: unitField.parse(formData.get("unit")) });
}

export async function updateRolloverHour(formData: FormData) {
  await updateSettings({ rollover_hour: hourField.parse(formData.get("rollover_hour")) });
}

export async function updateTimeZone(formData: FormData) {
  await updateSettings({ time_zone: timeZoneField.parse(formData.get("time_zone")) });
}

export async function updateRestRule(formData: FormData) {
  await updateSettings({ rest_rule: restRuleField.parse(formData.get("rest_rule")) });
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
