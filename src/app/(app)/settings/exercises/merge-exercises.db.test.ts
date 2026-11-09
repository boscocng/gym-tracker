import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/database.types";
import { requireEnv } from "@/server/env";

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
const anon = createClient<Database>(url, requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { persistSession: false },
});

const created: number[] = [];

function letters(): string {
  return Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
}

async function exercise(isBodyweight: boolean, setCount: number) {
  const name = letters();
  const { data, error } = await admin
    .from("exercises")
    .insert({ name, is_bodyweight: isBodyweight })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  created.push(data.id);
  const aliases = await admin.from("exercise_aliases").insert({ alias: name, exercise_id: data.id });
  const sets = Array.from({ length: setCount }, () => ({
    day: "2000-01-01",
    exercise_id: data.id,
    load_value: 100,
    load_unit: "kg" as const,
    reps: 5,
    raw_input: "merge test",
  }));
  const inserted = await admin.from("sets").insert(sets);
  if (aliases.error || inserted.error) {
    throw aliases.error ?? inserted.error;
  }
  return { id: data.id, alias: name };
}

async function setCount(exerciseId: number) {
  const { count, error } = await admin
    .from("sets")
    .select("id", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);
  if (error) {
    throw error;
  }
  return count;
}

afterAll(async () => {
  await admin.from("sets").delete().in("exercise_id", created);
  await admin.from("exercises").delete().in("id", created);
});

describe("merge_exercises in SQL", () => {
  it("moves the sets and aliases to the target and removes the source", async () => {
    const source = await exercise(false, 2);
    const target = await exercise(false, 1);

    const { error } = await admin.rpc("merge_exercises", { source_id: source.id, target_id: target.id });

    expect(error).toBeNull();
    expect(await setCount(target.id)).toBe(3);
    const { data: aliases } = await admin.from("exercise_aliases").select("alias").eq("exercise_id", target.id);
    expect(aliases?.map((row) => row.alias).sort()).toEqual([source.alias, target.alias].sort());
    const { data: gone } = await admin.from("exercises").select("id").eq("id", source.id);
    expect(gone).toEqual([]);
  });

  it.each([
    ["a bodyweight exercise into a weighted one", true],
    ["an exercise into itself", null],
  ])("refuses to merge %s and changes nothing", async (_name, sourceIsBodyweight) => {
    const target = await exercise(false, 1);
    const source = sourceIsBodyweight === null ? target : await exercise(sourceIsBodyweight, 1);

    const { error } = await admin.rpc("merge_exercises", { source_id: source.id, target_id: target.id });

    expect(error?.message).toBe("merge_exercises needs two different exercises of the same kind");
    expect(await setCount(source.id)).toBe(1);
    expect(await setCount(target.id)).toBe(1);
  });

  it("can't be called without signing in", async () => {
    const { error } = await anon.rpc("merge_exercises", { source_id: 1, target_id: 2 });
    expect(error?.code).toBe("42501");
  });
});
