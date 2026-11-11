import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database, Enums, TablesInsert } from "@/database.types";
import { requireEnv } from "./env";

const admin = createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false },
});

const DAY = "1999-01-02";

afterAll(async () => {
  await admin.from("photos").delete().eq("day", DAY);
});

function photo(pose: Enums<"photo_pose">, name: string): TablesInsert<"photos"> {
  return { day: DAY, pose, storage_path: `${DAY}/${name}.jpg`, thumb_path: `${DAY}/${name}-thumb.jpg` };
}

async function storedPaths() {
  const { data, error } = await admin.from("photos").select("pose, storage_path").eq("day", DAY).order("pose");
  if (error) {
    throw error;
  }
  return data;
}

describe("photos table", () => {
  it("keeps one front and one back photo per day", async () => {
    expect((await admin.from("photos").insert([photo("front", "front"), photo("back", "back")])).error).toBeNull();

    const second = await admin.from("photos").insert(photo("front", "second-front"));
    expect(second.error?.code).toBe("23505");

    expect((await admin.from("photos").upsert(photo("front", "retake"))).error).toBeNull();
    expect(await storedPaths()).toEqual([
      { pose: "front", storage_path: `${DAY}/retake.jpg` },
      { pose: "back", storage_path: `${DAY}/back.jpg` },
    ]);
  });

  it("needs every photo to name its pose", async () => {
    const withoutPose = { day: DAY, storage_path: `${DAY}/no-pose.jpg`, thumb_path: `${DAY}/no-pose-thumb.jpg` };
    const result = await admin.from("photos").insert(withoutPose as unknown as TablesInsert<"photos">);
    expect(result.error?.code).toBe("23502");
  });
});
