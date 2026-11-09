import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "./supabase";

export const readOwnerSettings = cache(async () => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("settings")
    .select("unit, time_zone, rollover_hour, rest_rule, start_date")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
});

export async function requireOwnerSettings() {
  const settings = await readOwnerSettings();
  if (!settings) {
    redirect("/login");
  }
  return settings;
}
