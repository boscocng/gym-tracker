import { refresh } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PARSE_ERROR } from "@/rules/parse-set";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { deleteSet, logSet } from "./actions";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/settings", () => ({ requireOwnerSettings: vi.fn() }));
vi.mock("@/server/supabase", () => ({ createSessionClient: vi.fn() }));

type Result = { data?: unknown; error?: unknown };
type Session = Awaited<ReturnType<typeof createSessionClient>>;

const NOW = new Date("2026-11-08T07:30:00Z");
const ALIASES: Result = {
  data: [
    { alias: "bench", exercise_id: 1, exercises: { is_bodyweight: false } },
    { alias: "pull ups", exercise_id: 2, exercises: { is_bodyweight: true } },
  ],
  error: null,
};

function fakeSupabase(results: Record<string, Result[]>) {
  const calls: unknown[][] = [];
  const client = {
    from(table: string) {
      calls.push(["from", table]);
      const chain: Record<string, unknown> = {
        then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(results[table]?.shift() ?? { data: null, error: null }).then(resolve, reject),
      };
      for (const method of ["select", "insert", "upsert", "update", "delete", "eq", "single", "maybeSingle"]) {
        chain[method] = (...args: unknown[]) => {
          calls.push([method, ...args]);
          return chain;
        };
      }
      return chain;
    },
  };
  vi.mocked(createSessionClient).mockResolvedValue(client as unknown as Session);
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
