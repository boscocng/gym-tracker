import { refresh } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";
import { type FakeResult, fakeSupabase as fake } from "@/test-support/fake-supabase";
import { createAddon, restartAddon, saveActiveAddon, saveStoppedAddon, stopAddon } from "./actions";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/settings", () => ({ requireOwnerSettings: vi.fn() }));
vi.mock("@/server/supabase", () => ({ createSessionClient: vi.fn() }));

const NOW = new Date("2026-11-08T07:30:00Z");
const TODAY = "2026-11-07";
const LOOKUP = [
  ["from", "addons"],
  ["select", "id, name, addon_periods(id, details, start_day, end_day)"],
  ["eq", "id", 4],
  ["maybeSingle"],
];
const INPUT = { name: " Preworkout ", details: " 1.5 scoops ", start: TODAY };

function addonRow(periods: { id: number; details: string; start_day: string; end_day: string | null }[]): FakeResult {
  return { data: { id: 4, name: "Preworkout", addon_periods: periods }, error: null };
}

const ACTIVE = addonRow([
  { id: 40, details: "2 scoops", start_day: "2026-10-01", end_day: "2026-10-20" },
  { id: 41, details: "1 scoop", start_day: "2026-10-21", end_day: null },
]);
const STOPPED = addonRow([{ id: 41, details: "1 scoop", start_day: "2026-10-21", end_day: "2026-11-01" }]);

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

describe("createAddon", () => {
  it("adds the add-on with its first period", async () => {
    const calls = fakeSupabase({ addons: [{ data: { id: 9 }, error: null }] });

    expect(await createAddon({ ...INPUT, start: "2026-10-30" })).toBeNull();

    expect(calls).toEqual([
      ["from", "addons"],
      ["insert", { name: "Preworkout" }],
      ["select", "id"],
      ["single"],
      ["from", "addon_periods"],
      ["insert", { addon_id: 9, details: "1.5 scoops", start_day: "2026-10-30" }],
    ]);
  });

  it.each([
    [{ ...INPUT, name: "  " }, "Use a name of 1 to 60 characters."],
    [{ ...INPUT, details: "x".repeat(201) }, "Keep the details to 200 characters."],
    [{ ...INPUT, start: "2026-02-30" }, "Pick a date."],
    [{ ...INPUT, start: "2026-11-08" }, "It can’t start after today."],
  ])("refuses %j", async (input, message) => {
    const calls = fakeSupabase({});

    expect(await createAddon(input)).toBe(message);
    expect(calls).toEqual([]);
  });

  it("refuses a name that's taken", async () => {
    const calls = fakeSupabase({ addons: [{ data: null, error: { code: "23505" } }] });

    expect(await createAddon(INPUT)).toBe("You already have an add-on with that name.");
    expect(calls).toEqual([["from", "addons"], ["insert", { name: "Preworkout" }], ["select", "id"], ["single"]]);
  });

  it("removes the add-on again when its period can't be saved", async () => {
    const failure = { message: "period rejected" };
    const calls = fakeSupabase({
      addons: [{ data: { id: 9 }, error: null }],
      addon_periods: [{ data: null, error: failure }],
    });

    await expect(createAddon(INPUT)).rejects.toBe(failure);
    expect(calls.slice(-3)).toEqual([["from", "addons"], ["delete"], ["eq", "id", 9]]);
  });
});

describe("saveActiveAddon", () => {
  it("starts a new period when the details change from a later day", async () => {
    const calls = fakeSupabase({ addons: [ACTIVE] });

    expect(await saveActiveAddon(4, INPUT)).toBeNull();

    expect(calls).toEqual([
      ...LOOKUP,
      ["rpc", "start_addon_period", { target_addon_id: 4, new_details: "1.5 scoops", new_start_day: TODAY }],
    ]);
  });

  it("corrects the details when the new period would start on the same day", async () => {
    const calls = fakeSupabase({ addons: [ACTIVE] });

    expect(await saveActiveAddon(4, { ...INPUT, start: "2026-10-21" })).toBeNull();

    expect(calls.slice(LOOKUP.length)).toEqual([
      ["from", "addon_periods"],
      ["update", { details: "1.5 scoops" }],
      ["eq", "id", 41],
    ]);
  });

  it("only renames when the details stay the same", async () => {
    const calls = fakeSupabase({ addons: [ACTIVE] });

    expect(await saveActiveAddon(4, { name: "Pre", details: "1 scoop", start: TODAY })).toBeNull();

    expect(calls.slice(LOOKUP.length)).toEqual([["from", "addons"], ["update", { name: "Pre" }], ["eq", "id", 4]]);
  });

  it("refuses a new period before the current one, without saving the name", async () => {
    const calls = fakeSupabase({ addons: [ACTIVE] });

    expect(await saveActiveAddon(4, { ...INPUT, name: "Pre", start: "2026-10-20" })).toBe(
      "The new period can’t start before Oct 21, when the current one started.",
    );
    expect(calls).toEqual(LOOKUP);
  });

  it("refuses a name that's taken, before changing any period", async () => {
    const calls = fakeSupabase({ addons: [ACTIVE, { data: null, error: { code: "23505" } }] });

    expect(await saveActiveAddon(4, { ...INPUT, name: "Creatine" })).toBe("You already have an add-on with that name.");
    expect(calls.map(([method]) => method)).not.toContain("rpc");
  });

  it("refuses stopped and missing add-ons", async () => {
    fakeSupabase({ addons: [STOPPED, { data: null, error: null }] });

    expect(await saveActiveAddon(4, INPUT)).toBe("This add-on changed since you opened it. Go back and open it again.");
    expect(await saveActiveAddon(4, INPUT)).toBe("That add-on isn’t there any more.");
  });
});

describe("saveStoppedAddon", () => {
  it("moves the last day", async () => {
    const calls = fakeSupabase({ addons: [STOPPED] });

    expect(await saveStoppedAddon(4, { name: "Preworkout", lastDay: "2026-10-25" })).toBeNull();

    expect(calls.slice(LOOKUP.length)).toEqual([
      ["from", "addon_periods"],
      ["update", { end_day: "2026-10-25" }],
      ["eq", "id", 41],
    ]);
  });

  it("refuses a last day outside the period", async () => {
    const calls = fakeSupabase({ addons: [STOPPED, STOPPED] });

    expect(await saveStoppedAddon(4, { name: "Preworkout", lastDay: "2026-10-20" })).toBe(
      "The last day can’t be before Oct 21, when this period started.",
    );
    expect(await saveStoppedAddon(4, { name: "Preworkout", lastDay: "2026-11-08" })).toBe(
      "The last day can’t be after today.",
    );
    expect(calls).toEqual([...LOOKUP, ...LOOKUP]);
  });

  it("refuses an add-on that's running", async () => {
    fakeSupabase({ addons: [ACTIVE] });

    expect(await saveStoppedAddon(4, { name: "Preworkout", lastDay: TODAY })).toBe(
      "This add-on changed since you opened it. Go back and open it again.",
    );
  });
});

describe("stopAddon", () => {
  it("ends the open period today", async () => {
    const calls = fakeSupabase({ addons: [ACTIVE] });

    expect(await stopAddon(4)).toBeNull();

    expect(calls.slice(LOOKUP.length)).toEqual([
      ["from", "addon_periods"],
      ["update", { end_day: TODAY }],
      ["eq", "id", 41],
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refuses an add-on that's already stopped", async () => {
    const calls = fakeSupabase({ addons: [STOPPED] });

    expect(await stopAddon(4)).toBe("This add-on changed since you opened it. Go back and open it again.");
    expect(calls).toEqual(LOOKUP);
  });
});

describe("restartAddon", () => {
  it("starts a new period today with the last details", async () => {
    const calls = fakeSupabase({ addons: [STOPPED] });

    expect(await restartAddon(4)).toBeNull();

    expect(calls.slice(LOOKUP.length)).toEqual([
      ["rpc", "start_addon_period", { target_addon_id: 4, new_details: "1 scoop", new_start_day: TODAY }],
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("reopens a period that stopped today", async () => {
    const stoppedToday = addonRow([{ id: 41, details: "1 scoop", start_day: "2026-10-21", end_day: TODAY }]);
    const calls = fakeSupabase({ addons: [stoppedToday] });

    expect(await restartAddon(4)).toBeNull();

    expect(calls.slice(LOOKUP.length)).toEqual([
      ["from", "addon_periods"],
      ["update", { end_day: null }],
      ["eq", "id", 41],
    ]);
  });

  it("refuses an add-on that's running", async () => {
    const calls = fakeSupabase({ addons: [ACTIVE] });

    expect(await restartAddon(4)).toBe("This add-on changed since you opened it. Go back and open it again.");
    expect(calls).toEqual(LOOKUP);
    expect(refresh).not.toHaveBeenCalled();
  });
});
