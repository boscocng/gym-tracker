import { refresh } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeResult, fakeSupabase as fake } from "@/test-support/fake-supabase";
import { skipDays, takeRestDay, updateSkipReason } from "./day-actions";
import { requireOwnerSettings } from "./settings";
import { createSessionClient, type SessionClient } from "./supabase";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/settings", () => ({ requireOwnerSettings: vi.fn() }));
vi.mock("@/server/supabase", () => ({ createSessionClient: vi.fn() }));

const TODAY = "2026-11-09";
const REASON = "  Flight home, landed after midnight.  ";

function fakeSupabase(results: Record<string, FakeResult[]>) {
  const { client, calls } = fake(results);
  vi.mocked(createSessionClient).mockResolvedValue(client as unknown as SessionClient);
  return calls;
}

function trained(...days: string[]): FakeResult {
  return { data: days.map((day) => ({ day })), error: null };
}

const noMarks: FakeResult = { data: [], error: null };
const inserts = (calls: unknown[][]) => calls.filter(([method]) => method === "insert");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  vi.mocked(requireOwnerSettings).mockResolvedValue({
    unit: "lb",
    time_zone: "UTC",
    rollover_hour: 4,
    rest_rule: "six_of_seven",
    start_date: "2026-11-01",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("takeRestDay", () => {
  it("marks today as rest when 6 of the 7 days before were trained", async () => {
    const calls = fakeSupabase({
      trained_days: [trained("2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-08")],
      day_marks: [noMarks, { error: null }],
    });

    expect(await takeRestDay(TODAY)).toBeNull();

    expect(calls.slice(0, 7)).toEqual([
      ["from", "trained_days"],
      ["select", "day"],
      ["gte", "day", "2026-11-02"],
      ["lte", "day", TODAY],
      ["order", "day"],
      ["range", 0, 999],
      ["from", "day_marks"],
    ]);
    expect(inserts(calls)).toEqual([["insert", { day: TODAY, kind: "rest", resolved_via: "normal" }]]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("marks a missed past day as rest through the lock", async () => {
    const calls = fakeSupabase({
      trained_days: [trained("2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06")],
      day_marks: [noMarks, { error: null }],
    });

    expect(await takeRestDay("2026-11-08")).toBeNull();
    expect(inserts(calls)).toEqual([["insert", { day: "2026-11-08", kind: "rest", resolved_via: "lock" }]]);
  });

  it("refuses rest that isn't free", async () => {
    const calls = fakeSupabase({
      trained_days: [trained("2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08")],
      day_marks: [noMarks],
    });

    expect(await takeRestDay(TODAY)).toEqual({ error: expect.stringMatching(/counts as a skip/) });
    expect(inserts(calls)).toEqual([]);
  });

  it("refuses a day that already has sets", async () => {
    const calls = fakeSupabase({ trained_days: [trained(TODAY)], day_marks: [noMarks] });
    expect(await takeRestDay(TODAY)).toEqual({ error: expect.any(String) });
    expect(inserts(calls)).toEqual([]);
  });

  it.each(["2026-11-10", "2026-10-31", "yesterday"])("refuses %s without touching the database", async (day) => {
    expect(await takeRestDay(day)).toEqual({ error: expect.any(String) });
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

describe("skipDays", () => {
  it("skips missed days through the lock with the trimmed reason", async () => {
    const calls = fakeSupabase({ trained_days: [trained()], day_marks: [noMarks, { error: null }] });

    expect(await skipDays(["2026-11-08", "2026-11-07"], REASON)).toBeNull();

    expect(inserts(calls)).toEqual([
      [
        "insert",
        [
          { day: "2026-11-07", kind: "skip", reason: "Flight home, landed after midnight.", resolved_via: "lock" },
          { day: "2026-11-08", kind: "skip", reason: "Flight home, landed after midnight.", resolved_via: "lock" },
        ],
      ],
    ]);
  });

  it("skips today normally", async () => {
    const calls = fakeSupabase({ trained_days: [trained()], day_marks: [noMarks, { error: null }] });
    expect(await skipDays([TODAY], REASON)).toBeNull();
    expect(inserts(calls)).toEqual([
      ["insert", [{ day: TODAY, kind: "skip", reason: "Flight home, landed after midnight.", resolved_via: "normal" }]],
    ]);
  });

  it("refuses when any of the days is already sorted", async () => {
    const calls = fakeSupabase({
      trained_days: [trained()],
      day_marks: [{ data: [{ day: "2026-11-07", kind: "rest" }], error: null }],
    });
    expect(await skipDays(["2026-11-07", "2026-11-08"], REASON)).toEqual({ error: expect.any(String) });
    expect(inserts(calls)).toEqual([]);
  });

  it.each([
    ["a reason under 20 characters", [TODAY], "Too tired today"],
    ["no days", [], REASON],
    ["a future day", ["2026-11-10"], REASON],
  ])("refuses %s without touching the database", async (_name, days, reason) => {
    expect(await skipDays(days, reason)).toEqual({ error: expect.any(String) });
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

describe("updateSkipReason", () => {
  it("changes only the reason of a skipped day", async () => {
    const calls = fakeSupabase({ day_marks: [{ data: { day: "2026-11-07" }, error: null }] });

    expect(await updateSkipReason("2026-11-07", REASON)).toBeNull();

    expect(calls).toEqual([
      ["from", "day_marks"],
      ["update", { reason: "Flight home, landed after midnight." }],
      ["eq", "day", "2026-11-07"],
      ["eq", "kind", "skip"],
      ["select", "day"],
      ["maybeSingle"],
    ]);
  });

  it("says so when the day wasn't skipped", async () => {
    fakeSupabase({ day_marks: [{ data: null, error: null }] });
    expect(await updateSkipReason("2026-11-07", REASON)).toEqual({ error: expect.any(String) });
    expect(refresh).not.toHaveBeenCalled();
  });
});
