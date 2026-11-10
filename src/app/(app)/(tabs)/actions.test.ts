import { refresh } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type OwnerSettings, requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";
import { type FakeResult, fakeSupabase as fake } from "@/test-support/fake-supabase";
import { saveManualWeight } from "./actions";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/settings", () => ({ requireOwnerSettings: vi.fn() }));
vi.mock("@/server/supabase", () => ({ createSessionClient: vi.fn() }));

const NOW = new Date("2026-11-08T07:30:00Z");
const SETTINGS: OwnerSettings = {
  unit: "lb",
  time_zone: "America/New_York",
  rollover_hour: 4,
  rest_rule: "six_of_seven",
  start_date: "2026-11-01",
};
const LOOKUP = [
  ["from", "weigh_ins"],
  ["select", "id"],
  ["eq", "day", "2026-11-07"],
  ["eq", "source", "manual"],
  ["maybeSingle"],
];

function fakeSupabase(results: Record<string, FakeResult[]>) {
  const { client, calls } = fake(results);
  vi.mocked(createSessionClient).mockResolvedValue(client as unknown as SessionClient);
  return calls;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(requireOwnerSettings).mockResolvedValue(SETTINGS);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("saveManualWeight", () => {
  it("adds today's manual weight in the owner's unit", async () => {
    const calls = fakeSupabase({});

    expect(await saveManualWeight(" 171.2 ")).toBeNull();

    expect(calls).toEqual([
      ...LOOKUP,
      ["from", "weigh_ins"],
      [
        "insert",
        {
          measured_at: NOW.toISOString(),
          value: 171.2,
          unit: "lb",
          day: "2026-11-07",
          source: "manual",
        },
      ],
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("updates today's manual weight when there already is one", async () => {
    const calls = fakeSupabase({ weigh_ins: [{ data: { id: 9 }, error: null }] });

    expect(await saveManualWeight("170,8")).toBeNull();

    expect(calls).toEqual([
      ...LOOKUP,
      ["from", "weigh_ins"],
      ["update", { measured_at: NOW.toISOString(), value: 170.8, unit: "lb" }],
      ["eq", "id", 9],
    ]);
  });

  it.each(["", "heavy", "171.25.1", "171.234", "-171", "44", "661.4"])("refuses %j in pounds", async (text) => {
    const calls = fakeSupabase({});

    expect(await saveManualWeight(text)).toBe("Enter a weight from 44.1 to 661.3 lb.");
    expect(calls).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("checks the range in the owner's unit", async () => {
    vi.mocked(requireOwnerSettings).mockResolvedValue({ ...SETTINGS, unit: "kg" });
    fakeSupabase({});

    expect(await saveManualWeight("19.9")).toBe("Enter a weight from 20 to 300 kg.");
    expect(await saveManualWeight("300.01")).toBe("Enter a weight from 20 to 300 kg.");
    expect(await saveManualWeight("20")).toBeNull();
  });

  it("fails without refreshing when the weight can't be saved", async () => {
    const failure = { message: "rejected" };
    fakeSupabase({ weigh_ins: [{ data: null, error: null }, { data: null, error: failure }] });

    await expect(saveManualWeight("171.2")).rejects.toBe(failure);
    expect(refresh).not.toHaveBeenCalled();
  });
});
