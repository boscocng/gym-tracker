import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/database.types";
import { requireEnv } from "./env";

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
const anon = createClient<Database>(url, requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { persistSession: false },
});

const DAYS = ["1999-01-01", "1999-01-02"];
let exerciseId: number | undefined;

afterAll(async () => {
  await admin.from("sets").delete().in("day", DAYS);
  if (exerciseId !== undefined) {
    await admin.from("exercises").delete().eq("id", exerciseId);
  }
});

describe("trained_days view", () => {
  it("lists each day with sets once, and only to callers who can read the sets", async () => {
    const name = `view test ${Date.now()}`;
    const { data: exercise, error } = await admin.from("exercises").insert({ name }).select("id").single();
    if (error) {
      throw error;
    }
    exerciseId = exercise.id;
    const set = { exercise_id: exercise.id, load_value: 100, load_unit: "kg" as const, reps: 5, raw_input: "view test" };
    const inserted = await admin.from("sets").insert([
      { ...set, day: DAYS[0] },
      { ...set, day: DAYS[0] },
      { ...set, day: DAYS[1] },
    ]);
    expect(inserted.error).toBeNull();

    const owner = await admin.from("trained_days").select("day").in("day", DAYS).order("day");
    expect(owner.data).toEqual(DAYS.map((day) => ({ day })));

    const outsider = await anon.from("trained_days").select("day").in("day", DAYS);
    expect(outsider.data).toEqual([]);
  });
});
