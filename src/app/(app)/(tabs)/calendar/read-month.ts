import { monthGrid, shiftMonth } from "@/rules/calendar";
import { dayStatus } from "@/rules/day-status";
import { addDays } from "@/rules/days";
import { formatWeight, weightIn } from "@/rules/units";
import { dailyWeights } from "@/rules/weigh-in";
import { readDayHistory } from "@/server/days";
import { signPhotoUrls } from "@/server/photos";
import type { OwnerSettings } from "@/server/settings";
import type { SessionClient } from "@/server/supabase";

export async function readMonth(supabase: SessionClient, settings: OwnerSettings, month: string, today: string) {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const [history, readings, photos] = await Promise.all([
    readDayHistory(supabase, settings.start_date, first, last),
    supabase
      .from("weigh_ins")
      .select("day, measured_at, value, unit, kg, source, flag")
      .gte("day", first)
      .lte("day", last),
    supabase.from("photos").select("day, thumb_path").eq("pose", "front").gte("day", first).lte("day", last),
  ]);
  if (readings.error || photos.error) {
    throw readings.error ?? photos.error;
  }
  const weights = dailyWeights(
    readings.data.map((reading) => ({ ...reading, measuredAt: new Date(reading.measured_at) })),
  );
  const thumbUrls = await signPhotoUrls(
    supabase,
    photos.data.map((photo) => photo.thumb_path),
  );
  const thumbs = new Map(photos.data.map((photo) => [photo.day, thumbUrls.get(photo.thumb_path) ?? null]));

  return monthGrid(month).map(({ day, inMonth }) => {
    const weight = weights.get(day);
    return {
      day,
      inMonth,
      status: inMonth ? dayStatus(day, today, history) : null,
      tracked: inMonth && day >= settings.start_date && day <= today,
      isToday: day === today,
      weight: weight ? formatWeight(weightIn(settings.unit, weight)) : null,
      thumbUrl: inMonth ? (thumbs.get(day) ?? null) : null,
    };
  });
}
