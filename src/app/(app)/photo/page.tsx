import type { Enums } from "@/database.types";
import { addDays } from "@/rules/days";
import { formatShortDate, formatShortDayLabel } from "@/rules/format";
import { trainingDay } from "@/rules/training-day";
import { signPhotoUrls } from "@/server/photos";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";
import { Camera, type Ghost } from "./camera";

type Previous = { day: string; storage_path: string } | null;

async function previousPhoto(supabase: SessionClient, pose: Enums<"photo_pose">, today: string): Promise<Previous> {
  const { data, error } = await supabase
    .from("photos")
    .select("day, storage_path")
    .eq("pose", pose)
    .lt("day", today)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export default async function PhotoPage() {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const supabase = await createSessionClient();
  const [front, back] = await Promise.all([
    previousPhoto(supabase, "front", today),
    previousPhoto(supabase, "back", today),
  ]);
  const urls = await signPhotoUrls(
    supabase,
    [front, back].flatMap((photo) => (photo ? [photo.storage_path] : [])),
  );
  const ghost = (photo: Previous, name: string): Ghost | null => {
    const url = photo && urls.get(photo.storage_path);
    if (!photo || !url) {
      return null;
    }
    const hint =
      photo.day === addDays(today, -1)
        ? `Line up with yesterday’s ${name}`
        : `Line up with your ${formatShortDate(photo.day)} ${name}`;
    return { url, hint };
  };

  return (
    <Camera
      dayLabel={formatShortDayLabel(today)}
      ghosts={{ front: ghost(front, "photo"), back: ghost(back, "back photo") }}
    />
  );
}
