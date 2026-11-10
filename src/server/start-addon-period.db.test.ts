import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/database.types";
import { requireEnv } from "./env";

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
const anon = createClient<Database>(url, requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { persistSession: false },
});

const created: number[] = [];

afterAll(async () => {
  await admin.from("addons").delete().in("id", created);
});

async function addonStartingOn(startDay: string) {
  const { data, error } = await admin
    .from("addons")
    .insert({ name: `period test ${Date.now()} ${created.length}` })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  created.push(data.id);
  const period = await admin.from("addon_periods").insert({ addon_id: data.id, details: "old", start_day: startDay });
  if (period.error) {
    throw period.error;
  }
  return data.id;
}

async function periodsOf(addonId: number) {
  const { data, error } = await admin
    .from("addon_periods")
    .select("details, start_day, end_day")
    .eq("addon_id", addonId)
    .order("start_day");
  if (error) {
    throw error;
  }
  return data;
}

function startPeriod(client: typeof admin, addonId: number, startDay: string) {
  return client.rpc("start_addon_period", { target_addon_id: addonId, new_details: "new", new_start_day: startDay });
}

describe("start_addon_period", () => {
  it("closes the open period the day before the new one starts", async () => {
    const id = await addonStartingOn("2000-01-01");

    expect((await startPeriod(admin, id, "2000-01-10")).error).toBeNull();

    expect(await periodsOf(id)).toEqual([
      { details: "old", start_day: "2000-01-01", end_day: "2000-01-09" },
      { details: "new", start_day: "2000-01-10", end_day: null },
    ]);
  });

  it("starts a stopped add-on again without touching its old period", async () => {
    const id = await addonStartingOn("2000-01-01");
    await admin.from("addon_periods").update({ end_day: "2000-01-05" }).eq("addon_id", id);

    expect((await startPeriod(admin, id, "2000-02-01")).error).toBeNull();

    expect(await periodsOf(id)).toEqual([
      { details: "old", start_day: "2000-01-01", end_day: "2000-01-05" },
      { details: "new", start_day: "2000-02-01", end_day: null },
    ]);
  });

  it("changes nothing when the open period would end before it started", async () => {
    const id = await addonStartingOn("2000-01-10");

    expect((await startPeriod(admin, id, "2000-01-10")).error).not.toBeNull();

    expect(await periodsOf(id)).toEqual([{ details: "old", start_day: "2000-01-10", end_day: null }]);
  });

  it("can't be called by signed-out callers", async () => {
    const id = await addonStartingOn("2000-01-01");

    expect((await startPeriod(anon, id, "2000-01-10")).error?.code).toBe("42501");

    expect(await periodsOf(id)).toEqual([{ details: "old", start_day: "2000-01-01", end_day: null }]);
  });
});
