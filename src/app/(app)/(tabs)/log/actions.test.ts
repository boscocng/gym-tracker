import { refresh } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PARSE_ERROR } from "@/rules/parse-set";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";
import { type FakeResult, fakeSupabase as fake } from "@/test-support/fake-supabase";
import { deleteSet, logSet, logSetAs, logSetAsNew, updateSet } from "./actions";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/settings", () => ({ requireOwnerSettings: vi.fn() }));
vi.mock("@/server/supabase", () => ({ createSessionClient: vi.fn() }));


const NOW = new Date("2026-11-08T07:30:00Z");
const ALIASES: FakeResult = {
  data: [
    { alias: "bench", exercise_id: 1, exercises: { is_bodyweight: false } },
    { alias: "pull ups", exercise_id: 2, exercises: { is_bodyweight: true } },
  ],
  error: null,
};

function fakeSupabase(results: Record<string, FakeResult[]>) {
  const { client, calls } = fake(results);
  vi.mocked(createSessionClient).mockResolvedValue(client as unknown as SessionClient);
  return calls;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(requireOwnerSettings).mockResolvedValue({
    unit: "lb",
    time_zone: "America/New_York",
    rollover_hour: 4,
    rest_rule: "six_of_seven",
    start_date: "2026-11-01",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("logSet", () => {
  it("stores the parsed set on the owner's training day", async () => {
    const calls = fakeSupabase({ exercise_aliases: [ALIASES], sets: [{ data: { id: 42 }, error: null }] });

    const result = await logSet("  bench 185 for 6 ");

    expect(result).toEqual({ kind: "added", setId: 42 });
    expect(calls).toEqual([
      ["from", "exercise_aliases"],
      ["select", "alias, exercise_id, exercises(is_bodyweight)"],
      ["from", "sets"],
      [
        "insert",
        {
          day: "2026-11-07",
          exercise_id: 1,
          load_value: 185,
          load_unit: "lb",
          reps: 6,
          raw_input: "bench 185 for 6",
        },
      ],
      ["select", "id"],
      ["single"],
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("returns an unknown exercise without storing anything", async () => {
    const calls = fakeSupabase({ exercise_aliases: [ALIASES] });

    const result = await logSet("zercher squat 100 for 5");

    expect(result).toEqual({ kind: "unknown", spokenName: "zercher squat", loadGiven: true });
    expect(calls.filter(([method]) => method === "insert")).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["blank text", "   "],
    ["text over 200 characters", "bench 185 for 6 ".repeat(13)],
  ])("rejects %s without touching the database", async (_name, text) => {
    expect(await logSet(text)).toEqual({ kind: "error", message: PARSE_ERROR });
    expect(createSessionClient).not.toHaveBeenCalled();
  });

  it("checks the session before anything else", async () => {
    vi.mocked(requireOwnerSettings).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(logSet("bench 185 for 6")).rejects.toThrow("NEXT_REDIRECT");
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

const writes = (calls: unknown[][]) => calls.filter(([method]) => ["insert", "upsert"].includes(String(method)));

describe("logSetAs", () => {
  it("saves the spoken name as an alias of the picked exercise and logs the set to it", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [ALIASES, { error: null }],
      exercises: [{ data: { id: 9, is_bodyweight: false }, error: null }],
      sets: [{ data: { id: 43 }, error: null }],
    });

    const result = await logSetAs("zercher squat 100 for 5", 9);

    expect(result).toEqual({ kind: "added", setId: 43 });
    expect(calls.slice(2)).toEqual([
      ["from", "exercises"],
      ["select", "id, is_bodyweight"],
      ["eq", "id", 9],
      ["maybeSingle"],
      ["from", "exercise_aliases"],
      ["upsert", [{ alias: "zercher squat", exercise_id: 9 }], { onConflict: "alias", ignoreDuplicates: true }],
      ["from", "sets"],
      [
        "insert",
        {
          day: "2026-11-07",
          exercise_id: 9,
          load_value: 100,
          load_unit: "lb",
          reps: 5,
          raw_input: "zercher squat 100 for 5",
        },
      ],
      ["select", "id"],
      ["single"],
    ]);
  });

  it("logs a set said without a weight as bodyweight when the picked exercise is bodyweight", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [ALIASES, { error: null }],
      exercises: [{ data: { id: 2, is_bodyweight: true }, error: null }],
      sets: [{ data: { id: 44 }, error: null }],
    });

    await logSetAs("dips 12 reps", 2);

    expect(writes(calls).at(-1)).toEqual([
      "insert",
      expect.objectContaining({ exercise_id: 2, load_value: 0, reps: 12 }),
    ]);
  });

  it.each([
    ["the exercise is gone", null, "zercher squat 100 for 5", /isn’t there/],
    [
      "a weighted exercise gets a set without a weight",
      { id: 9, is_bodyweight: false },
      "dips 12 reps",
      /needs a weight/,
    ],
  ])("saves nothing when %s", async (_name, exercise, text, message) => {
    const calls = fakeSupabase({ exercise_aliases: [ALIASES], exercises: [{ data: exercise, error: null }] });

    expect(await logSetAs(text, 9)).toEqual({ kind: "error", message: expect.stringMatching(message) });
    expect(writes(calls)).toEqual([]);
  });
});

describe("logSetAsNew", () => {
  it("creates the exercise, saves its name and the spoken name as aliases, and logs the set", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [ALIASES, { error: null }],
      exercises: [{ data: { id: 10 }, error: null }],
      sets: [{ data: { id: 45 }, error: null }],
    });

    const result = await logSetAsNew("zercher squat 100 for 5", " Zercher front squat ", false);

    expect(result).toEqual({ kind: "added", setId: 45 });
    expect(writes(calls)).toEqual([
      ["insert", { name: "Zercher front squat", is_bodyweight: false }],
      [
        "upsert",
        [
          { alias: "zercher front squat", exercise_id: 10 },
          { alias: "zercher squat", exercise_id: 10 },
        ],
        { onConflict: "alias", ignoreDuplicates: true },
      ],
      ["insert", expect.objectContaining({ exercise_id: 10, load_value: 100, reps: 5 })],
    ]);
  });

  it("explains a name that's already taken and saves nothing else", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [ALIASES],
      exercises: [{ data: null, error: { code: "23505" } }],
    });

    const result = await logSetAsNew("zercher squat 100 for 5", "Squat", false);

    expect(result).toEqual({ kind: "error", message: expect.stringMatching(/already have an exercise/) });
    expect(writes(calls)).toEqual([["insert", { name: "Squat", is_bodyweight: false }]]);
  });

  it("refuses a weighted exercise for a set said without a weight, before creating it", async () => {
    const calls = fakeSupabase({ exercise_aliases: [ALIASES] });

    const result = await logSetAsNew("dips 12 reps", "Dips", false);

    expect(result).toEqual({ kind: "error", message: expect.stringMatching(/needs a weight/) });
    expect(writes(calls)).toEqual([]);
  });

  it("rejects a blank name without touching the database", async () => {
    expect(await logSetAsNew("zercher squat 100 for 5", "  ", false)).toEqual({
      kind: "error",
      message: expect.any(String),
    });
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

describe("deleteSet", () => {
  it("deletes the set by id", async () => {
    const calls = fakeSupabase({ sets: [{ error: null }] });

    await deleteSet(7);

    expect(calls).toEqual([["from", "sets"], ["delete"], ["eq", "id", 7]]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("rejects an id that isn't a row id", async () => {
    await expect(deleteSet(1.5)).rejects.toThrow();
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

describe("updateSet", () => {
  it("updates the load and reps of the set", async () => {
    const calls = fakeSupabase({ sets: [{ data: { id: 7 }, error: null }] });

    expect(await updateSet(7, " 187.5 ", "5")).toBeNull();

    expect(calls).toEqual([
      ["from", "sets"],
      ["update", { load_value: 187.5, reps: 5 }],
      ["eq", "id", 7],
      ["select", "id"],
      ["maybeSingle"],
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each([
    ["an empty weight", "", "5"],
    ["a weight that isn't a number", "heavy", "5"],
    ["a negative weight", "-5", "5"],
    ["an impossible weight", "10000", "5"],
    ["zero reps", "185", "0"],
    ["fractional reps", "185", "5.5"],
    ["too many reps", "185", "1000"],
  ])("rejects %s without touching the database", async (_name, load, reps) => {
    expect(await updateSet(7, load, reps)).toMatch(/whole reps/);
    expect(createSessionClient).not.toHaveBeenCalled();
  });

  it("says so when the set is gone", async () => {
    fakeSupabase({ sets: [{ data: null, error: null }] });
    expect(await updateSet(7, "185", "5")).toMatch(/isn’t there/);
    expect(refresh).not.toHaveBeenCalled();
  });
});
