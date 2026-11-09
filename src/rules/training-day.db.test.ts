import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/database.types";
import { requireEnv } from "@/server/env";
import { trainingDayCases } from "./training-day.cases";

const supabase = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
);

describe("training_day in SQL", () => {
  it.each(trainingDayCases)("$name", async ({ at, timeZone, rolloverHour, day }) => {
    const { data, error } = await supabase.rpc("training_day", {
      at,
      time_zone: timeZone,
      rollover_hour: rolloverHour,
    });
    expect(error).toBeNull();
    expect(data).toBe(day);
  });
});
