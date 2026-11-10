import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/database.types";
import { requireEnv } from "./env";

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const admin = createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });

const FOLDER = "1999-01-01";
const PATH = `${FOLDER}/storage-test.jpg`;
const INTRUDER_PATH = `${FOLDER}/intruder.jpg`;
const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });

let outsiderId: string | undefined;

afterAll(async () => {
  await admin.storage.from("photos").remove([PATH, INTRUDER_PATH]);
  if (outsiderId) {
    await admin.auth.admin.deleteUser(outsiderId);
  }
});

async function signedInOutsider() {
  const email = `outsider-${Date.now()}@example.com`;
  const password = "outsider-password";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) {
    throw created.error;
  }
  outsiderId = created.data.user.id;
  const outsider = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
  const signedIn = await outsider.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    throw signedIn.error;
  }
  return outsider;
}

describe("photos bucket", () => {
  it("hides photos from signed-out callers and from users who aren't the owner", async () => {
    const stored = await admin.storage.from("photos").upload(PATH, JPEG, { contentType: "image/jpeg" });
    expect(stored.error).toBeNull();

    const anon = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
    for (const client of [anon, await signedInOutsider()]) {
      const bucket = client.storage.from("photos");
      expect((await bucket.createSignedUrl(PATH, 60)).data).toBeNull();
      expect((await bucket.list(FOLDER)).data).toEqual([]);
      expect((await bucket.upload(INTRUDER_PATH, JPEG, { contentType: "image/jpeg" })).error).not.toBeNull();
      expect((await bucket.remove([PATH])).data ?? []).toEqual([]);
    }

    expect((await admin.storage.from("photos").list(FOLDER)).data?.map((file) => file.name)).toEqual([
      "storage-test.jpg",
    ]);
    const publicUrl = admin.storage.from("photos").getPublicUrl(PATH).data.publicUrl;
    expect((await fetch(publicUrl)).ok).toBe(false);
  });
});
