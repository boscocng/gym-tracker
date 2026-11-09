import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/test-support/fake-supabase";
import { readDayHistory } from "./days";
import type { SessionClient } from "./supabase";

describe("readDayHistory", () => {
  it("reads every page of trained days and marks in the range", async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({ day: `day-${index}` }));
    const { client, calls } = fakeSupabase({
      trained_days: [
        { data: fullPage, error: null },
        { data: [{ day: "day-1000" }], error: null },
      ],
      day_marks: [{ data: [{ day: "day-5", kind: "skip" }], error: null }],
    });

    const history = await readDayHistory(client as unknown as SessionClient, "2026-11-01", "2026-11-01", "2029-12-31");

    expect(history.trained.size).toBe(1001);
    expect(history.marks).toEqual(new Map([["day-5", "skip"]]));
    expect(calls.filter(([method]) => method === "range")).toEqual([
      ["range", 0, 999],
      ["range", 0, 999],
      ["range", 1000, 1999],
    ]);
    expect(calls).toContainEqual(["gte", "day", "2026-11-01"]);
    expect(calls).toContainEqual(["lte", "day", "2029-12-31"]);
  });
});
