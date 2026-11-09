import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/database.types";
import { requireEnv } from "@/server/env";
import { KG_PER_LB } from "./units";

const supabase = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
);

describe("to_kg in SQL", () => {
  it("uses the same pound conversion as the app", async () => {
    const { data, error } = await supabase.rpc("to_kg", { value: 1, unit: "lb" });
    expect(error).toBeNull();
    expect(data).toBe(KG_PER_LB);
  });
});
