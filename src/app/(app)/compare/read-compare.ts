import { daysBetween } from "@/rules/days";
import { comparePair } from "@/rules/photos";
import { formatChange, formatWeight, weightIn } from "@/rules/units";
import { dailyWeights } from "@/rules/weigh-in";
import { readAll } from "@/server/days";
import { signPhotoUrls } from "@/server/photos";
import type { OwnerSettings } from "@/server/settings";
import type { SessionClient } from "@/server/supabase";

export async function readCompare(supabase: SessionClient, settings: OwnerSettings, a: string | null, b: string | null) {
  const photoDays = (
    await readAll((from, to) => supabase.from("photos").select("day").eq("pose", "front").order("day").range(from, to))
  ).map((photo) => photo.day);
  const pair = comparePair(photoDays, a, b);
  if (!pair) {
    return null;
  }

  const days = [pair.before, pair.after];
  const [photos, readings] = await Promise.all([
    supabase.from("photos").select("day, storage_path").eq("pose", "front").in("day", days),
    supabase.from("weigh_ins").select("day, measured_at, value, unit, kg, source, flag").in("day", days),
  ]);
  if (photos.error || readings.error) {
    throw photos.error ?? readings.error;
  }
  const urls = await signPhotoUrls(
    supabase,
    photos.data.map((photo) => photo.storage_path),
  );
  const weights = dailyWeights(
    readings.data.map((reading) => ({ ...reading, measuredAt: new Date(reading.measured_at) })),
  );
  const side = (day: string) => {
    const path = photos.data.find((photo) => photo.day === day)?.storage_path;
    const weight = weights.get(day);
    return {
      day,
      url: (path && urls.get(path)) ?? null,
      weight: weight ? weightIn(settings.unit, weight) : null,
    };
  };
  const before = side(pair.before);
  const after = side(pair.after);

  return {
    photoDays,
    before: { ...before, weight: before.weight === null ? null : formatWeight(before.weight) },
    after: { ...after, weight: after.weight === null ? null : formatWeight(after.weight) },
    change: before.weight === null || after.weight === null ? null : formatChange(after.weight - before.weight),
    daysApart: Math.abs(daysBetween(pair.before, pair.after)),
  };
}
