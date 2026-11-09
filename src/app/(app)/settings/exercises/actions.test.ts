import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";
import { type FakeResult, fakeSupabase as fake } from "@/test-support/fake-supabase";
import {
  addAlias,
  createExercise,
  mergeExercise,
  removeAlias,
  renameExercise,
  setArchived,
  setBodyweight,
} from "./actions";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/settings", () => ({ requireOwnerSettings: vi.fn() }));
vi.mock("@/server/supabase", () => ({ createSessionClient: vi.fn() }));

const IGNORE = { onConflict: "alias", ignoreDuplicates: true };

function fakeSupabase(results: Record<string, FakeResult[]>) {
  const { client, calls } = fake(results);
  vi.mocked(createSessionClient).mockResolvedValue(client as unknown as SessionClient);
  return calls;
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

const writes = (calls: unknown[][]) =>
  calls.filter(([method]) => ["insert", "upsert", "update", "delete", "rpc"].includes(String(method)));

beforeEach(() => {
  vi.mocked(requireOwnerSettings).mockResolvedValue({
    unit: "lb",
    time_zone: "UTC",
    rollover_hour: 4,
    rest_rule: "six_of_seven",
    start_date: "2026-11-01",
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("createExercise", () => {
  it("creates the exercise with its name as an alias and goes back to Settings", async () => {
    const calls = fakeSupabase({ exercises: [{ data: { id: 8 }, error: null }] });

    await createExercise(null, form({ name: " Lateral raise ", is_bodyweight: "on" }));

    expect(writes(calls)).toEqual([
      ["insert", { name: "Lateral raise", is_bodyweight: true }],
      ["upsert", [{ alias: "lateral raise", exercise_id: 8 }], IGNORE],
    ]);
    expect(redirect).toHaveBeenCalledWith("/settings");
  });

  it("keeps the typed name when it's taken", async () => {
    const calls = fakeSupabase({ exercises: [{ data: null, error: { code: "23505" } }] });

    const state = await createExercise(null, form({ name: "Squat" }));

    expect(state).toEqual({ error: "You already have an exercise with that name.", value: "Squat" });
    expect(writes(calls)).toEqual([["insert", { name: "Squat", is_bodyweight: false }]]);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rejects a blank name without touching the database", async () => {
    expect(await createExercise(null, form({ name: "  " }))).toMatchObject({ error: expect.any(String) });
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

describe("renameExercise", () => {
  it("renames the exercise and makes the new name sayable", async () => {
    const calls = fakeSupabase({ exercises: [{ data: { id: 3 }, error: null }] });

    expect(await renameExercise(3, null, form({ name: "Romanian deadlift" }))).toBeNull();

    expect(calls).toEqual([
      ["from", "exercises"],
      ["update", { name: "Romanian deadlift" }],
      ["eq", "id", 3],
      ["select", "id"],
      ["maybeSingle"],
      ["from", "exercise_aliases"],
      ["upsert", [{ alias: "romanian deadlift", exercise_id: 3 }], IGNORE],
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the typed name when it's taken", async () => {
    fakeSupabase({ exercises: [{ data: null, error: { code: "23505" } }] });
    expect(await renameExercise(3, null, form({ name: "Squat" }))).toEqual({
      error: "You already have an exercise with that name.",
      value: "Squat",
    });
  });
});

describe("addAlias", () => {
  it("saves the alias in the parser's form", async () => {
    const calls = fakeSupabase({ exercise_aliases: [{ data: null, error: null }, { error: null }] });

    expect(await addAlias(1, null, form({ alias: " Flat-Bench " }))).toBeNull();

    expect(calls).toEqual([
      ["from", "exercise_aliases"],
      ["select", "exercise_id, exercises(name)"],
      ["eq", "alias", "flat bench"],
      ["maybeSingle"],
      ["from", "exercise_aliases"],
      ["insert", { alias: "flat bench", exercise_id: 1 }],
    ]);
  });

  it("explains an alias that already means another exercise", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [{ data: { exercise_id: 2, exercises: { name: "Squat" } }, error: null }],
    });

    expect(await addAlias(1, null, form({ alias: "squats" }))).toEqual({
      error: "“squats” already means Squat.",
      value: "squats",
    });
    expect(writes(calls)).toEqual([]);
  });

  it("does nothing for an alias the exercise already has", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [{ data: { exercise_id: 1, exercises: { name: "Bench press" } }, error: null }],
    });
    expect(await addAlias(1, null, form({ alias: "bench" }))).toBeNull();
    expect(writes(calls)).toEqual([]);
  });

  it("rejects an alias without letters without touching the database", async () => {
    expect(await addAlias(1, null, form({ alias: "123" }))).toMatchObject({ value: "123" });
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

describe("removeAlias", () => {
  it("removes an alias", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [{ data: { alias: "flat bench", exercises: { name: "Bench press" } }, error: null }, {}],
    });
    await removeAlias("flat bench");
    expect(writes(calls)).toEqual([["delete"]]);
    expect(calls.at(-1)).toEqual(["eq", "alias", "flat bench"]);
  });

  it("never removes the alias that is the exercise's own name", async () => {
    const calls = fakeSupabase({
      exercise_aliases: [{ data: { alias: "bench press", exercises: { name: "Bench press" } }, error: null }],
    });
    await removeAlias("bench press");
    expect(writes(calls)).toEqual([]);
  });
});

describe("mergeExercise", () => {
  it("merges into an exercise of the same kind and opens it", async () => {
    const calls = fakeSupabase({
      exercises: [
        {
          data: [
            { id: 7, is_bodyweight: false },
            { id: 2, is_bodyweight: false },
          ],
          error: null,
        },
      ],
    });

    await mergeExercise(7, null, form({ target: "2" }));

    expect(calls.slice(0, 3)).toEqual([["from", "exercises"], ["select", "id, is_bodyweight"], ["in", "id", [7, 2]]]);
    expect(writes(calls)).toEqual([["rpc", "merge_exercises", { source_id: 7, target_id: 2 }]]);
    expect(redirect).toHaveBeenCalledWith("/settings/exercises/2");
  });

  it("refuses to merge exercises of different kinds", async () => {
    const calls = fakeSupabase({
      exercises: [
        {
          data: [
            { id: 7, is_bodyweight: true },
            { id: 2, is_bodyweight: false },
          ],
          error: null,
        },
      ],
    });

    expect(await mergeExercise(7, null, form({ target: "2" }))).toMatchObject({ error: expect.any(String) });
    expect(writes(calls)).toEqual([]);
  });

  it("refuses to merge an exercise into itself without touching the database", async () => {
    expect(await mergeExercise(7, null, form({ target: "7" }))).toMatchObject({ error: expect.any(String) });
    expect(createSessionClient).not.toHaveBeenCalled();
  });
});

describe("type and archive", () => {
  it("switches an exercise to bodyweight", async () => {
    const calls = fakeSupabase({ exercises: [{ error: null }] });
    await setBodyweight(4, form({ is_bodyweight: "true" }));
    expect(calls).toEqual([["from", "exercises"], ["update", { is_bodyweight: true }], ["eq", "id", 4]]);
  });

  it("archives an exercise", async () => {
    const calls = fakeSupabase({ exercises: [{ error: null }] });
    await setArchived(4, true);
    expect(calls).toEqual([["from", "exercises"], ["update", { archived: true }], ["eq", "id", 4]]);
  });
});
