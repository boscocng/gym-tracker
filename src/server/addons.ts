import type { Addon } from "@/rules/addons";
import type { SessionClient } from "./supabase";

const ADDON_COLUMNS = "id, name, addon_periods(id, details, start_day, end_day)";

type AddonRow = {
  id: number;
  name: string;
  addon_periods: { id: number; details: string; start_day: string; end_day: string | null }[];
};

function toAddon(row: AddonRow): Addon {
  return {
    id: row.id,
    name: row.name,
    periods: row.addon_periods.map((period) => ({
      id: period.id,
      details: period.details,
      startDay: period.start_day,
      endDay: period.end_day,
    })),
  };
}

export async function readAddons(supabase: SessionClient): Promise<Addon[]> {
  const { data, error } = await supabase.from("addons").select(ADDON_COLUMNS);
  if (error) {
    throw error;
  }
  return data.map(toAddon);
}

export async function readAddon(supabase: SessionClient, id: number): Promise<Addon | null> {
  const { data, error } = await supabase.from("addons").select(ADDON_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    throw error;
  }
  return data && toAddon(data);
}
