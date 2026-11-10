import { addDays } from "@/rules/days";
import { formatShortDate, formatShortDayLabel } from "@/rules/format";
import { trainingDay } from "@/rules/training-day";
import { signPhotoUrls } from "@/server/photos";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { Camera } from "./camera";

export default async function PhotoPage() {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const supabase = await createSessionClient();
  const { data: previous, error } = await supabase
    .from("photos")
    .select("day, storage_path")
    .lt("day", today)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  const urls = await signPhotoUrls(supabase, previous ? [previous.storage_path] : []);
  const url = previous && urls.get(previous.storage_path);
  const ghost =
    previous && url
      ? {
          url,
          hint:
            previous.day === addDays(today, -1)
              ? "Line up with yesterday’s photo"
              : `Line up with your ${formatShortDate(previous.day)} photo`,
        }
      : null;

  return <Camera title={`Photo · ${formatShortDayLabel(today)}`} ghost={ghost} />;
}
