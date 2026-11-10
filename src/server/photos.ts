import type { SessionClient } from "./supabase";

export const PHOTO_BUCKET = "photos";
const SIGNED_URL_SECONDS = 600;

export async function signPhotoUrls(supabase: SessionClient, paths: readonly string[]): Promise<Map<string, string>> {
  if (paths.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls([...paths], SIGNED_URL_SECONDS);
  if (error) {
    throw error;
  }
  return new Map(data.flatMap(({ path, signedUrl }) => (path && signedUrl ? [[path, signedUrl] as const] : [])));
}
