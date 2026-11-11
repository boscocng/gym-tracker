"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PHOTO_UNREADABLE } from "@/components/messages";
import { Constants } from "@/database.types";
import { trainingDay } from "@/rules/training-day";
import { PHOTO_BUCKET } from "@/server/photos";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_THUMB_BYTES = 256 * 1024;
const poseField = z.enum(Constants.public.Enums.photo_pose);

async function jpeg(entry: FormDataEntryValue | null, maxBytes: number): Promise<File | null> {
  if (!(entry instanceof File) || entry.size === 0 || entry.size > maxBytes) {
    return null;
  }
  const [first, second, third] = new Uint8Array(await entry.slice(0, 3).arrayBuffer());
  return first === 0xff && second === 0xd8 && third === 0xff ? entry : null;
}

export async function savePhoto(form: FormData): Promise<string | null> {
  const settings = await requireOwnerSettings();
  const pose = poseField.parse(form.get("pose"));
  const [photo, thumb] = await Promise.all([
    jpeg(form.get("photo"), MAX_PHOTO_BYTES),
    jpeg(form.get("thumb"), MAX_THUMB_BYTES),
  ]);
  if (!photo || !thumb) {
    return PHOTO_UNREADABLE;
  }

  const now = new Date();
  const day = trainingDay(now, settings.time_zone, settings.rollover_hour);
  const supabase = await createSessionClient();
  const { data: previous, error } = await supabase
    .from("photos")
    .select("storage_path, thumb_path")
    .eq("day", day)
    .eq("pose", pose)
    .maybeSingle();
  if (error) {
    throw error;
  }

  const id = randomUUID();
  const paths = { storage_path: `${day}/${id}.jpg`, thumb_path: `${day}/${id}-thumb.jpg` };
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const uploads = await Promise.all([
    bucket.upload(paths.storage_path, photo, { contentType: "image/jpeg" }),
    bucket.upload(paths.thumb_path, thumb, { contentType: "image/jpeg" }),
  ]);
  const uploadError = uploads.find((upload) => upload.error)?.error;
  const rowError = uploadError
    ? null
    : (await supabase.from("photos").upsert({ day, pose, ...paths, taken_at: now.toISOString() })).error;
  if (uploadError || rowError) {
    await bucket.remove([paths.storage_path, paths.thumb_path]);
    throw uploadError ?? rowError;
  }

  if (previous) {
    const removed = await bucket.remove([previous.storage_path, previous.thumb_path]);
    if (removed.error) {
      console.error("Couldn't remove the replaced photo", removed.error);
    }
  }
  return null;
}
