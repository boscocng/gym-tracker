import { describe, expect, it } from "vitest";
import {
  type Addon,
  activeOn,
  addonOverview,
  lastDayError,
  latestPeriod,
  type Period,
  periodDay,
  periodLength,
  planDetailsChange,
  restartReopens,
  startError,
} from "./addons";

const TODAY = "2026-11-01";
const OPEN: Period = { id: 7, details: "1 scoop", startDay: "2026-10-21", endDay: null };

describe("day counts", () => {
  it("counts the first day of a period as day 1", () => {
    expect(periodDay("2026-10-21", TODAY)).toBe(12);
    expect(periodDay(TODAY, TODAY)).toBe(1);
  });

  it("counts both ends of a finished period", () => {
    expect(periodLength("2026-10-01", "2026-10-20")).toBe(20);
    expect(periodLength("2026-08-04", "2026-09-02")).toBe(30);
    expect(periodLength("2026-10-01", "2026-10-01")).toBe(1);
  });
});

describe("latestPeriod", () => {
  it("picks the period that started last", () => {
    const old: Period = { id: 1, details: "2 scoops", startDay: "2026-10-01", endDay: "2026-10-20" };
    expect(latestPeriod([OPEN, old])).toBe(OPEN);
    expect(latestPeriod([old, OPEN])).toBe(OPEN);
    expect(latestPeriod([])).toBeNull();
  });
});

describe("startError", () => {
  it("allows today and earlier, but not later", () => {
    expect(startError(TODAY, TODAY)).toBeNull();
    expect(startError("2025-01-01", TODAY)).toBeNull();
    expect(startError("2026-11-02", TODAY)).toBe("It can’t start after today.");
  });
});

describe("planDetailsChange", () => {
  it("closes the current period the day before a later start", () => {
    expect(planDetailsChange(OPEN, "1.5 scoops", TODAY, TODAY)).toEqual({ kind: "split", closesOn: "2026-10-31" });
    expect(planDetailsChange(OPEN, "1.5 scoops", "2026-10-22", TODAY)).toEqual({
      kind: "split",
      closesOn: "2026-10-21",
    });
  });

  it("corrects the details when the new period would start on the same day", () => {
    expect(planDetailsChange(OPEN, "1.5 scoops", "2026-10-21", TODAY)).toEqual({ kind: "rewrite" });
  });

  it("changes nothing when the details are the same", () => {
    expect(planDetailsChange(OPEN, "1 scoop", "2026-10-01", TODAY)).toEqual({ kind: "unchanged" });
  });

  it("refuses a start before the current period or after today", () => {
    expect(planDetailsChange(OPEN, "1.5 scoops", "2026-10-20", TODAY)).toEqual({
      kind: "error",
      message: "The new period can’t start before Oct 21, when the current one started.",
    });
    expect(planDetailsChange(OPEN, "1.5 scoops", "2026-11-02", TODAY)).toEqual({
      kind: "error",
      message: "It can’t start after today.",
    });
  });
});

describe("lastDayError", () => {
  const stopped: Period = { ...OPEN, endDay: "2026-10-25" };

  it("allows any day from the start of the period through today", () => {
    expect(lastDayError(stopped, "2026-10-21", TODAY)).toBeNull();
    expect(lastDayError(stopped, TODAY, TODAY)).toBeNull();
  });

  it("refuses a day before the period started or after today", () => {
    expect(lastDayError(stopped, "2026-10-20", TODAY)).toBe(
      "The last day can’t be before Oct 21, when this period started.",
    );
    expect(lastDayError(stopped, "2026-11-02", TODAY)).toBe("The last day can’t be after today.");
  });
});

describe("restartReopens", () => {
  it("reopens a period that stopped today, and starts a new one otherwise", () => {
    expect(restartReopens({ ...OPEN, endDay: TODAY }, TODAY)).toBe(true);
    expect(restartReopens({ ...OPEN, endDay: "2026-10-31" }, TODAY)).toBe(false);
  });
});

const ADDONS: Addon[] = [
  {
    id: 1,
    name: "Preworkout",
    periods: [
      { id: 10, details: "2 scoops", startDay: "2026-10-01", endDay: "2026-10-20" },
      { id: 11, details: "1 scoop", startDay: "2026-10-21", endDay: null },
    ],
  },
  {
    id: 2,
    name: "Caffeine pills",
    periods: [{ id: 20, details: "200 mg", startDay: "2026-08-04", endDay: "2026-09-02" }],
  },
  { id: 3, name: "Creatine", periods: [{ id: 30, details: "5 g daily", startDay: "2026-09-28", endDay: null }] },
];

describe("addonOverview", () => {
  it("lists open periods by name with their day count, and finished periods newest first", () => {
    expect(addonOverview(ADDONS, TODAY)).toEqual({
      active: [
        { id: 3, name: "Creatine", details: "5 g daily", since: "2026-09-28", day: 35 },
        { id: 1, name: "Preworkout", details: "1 scoop", since: "2026-10-21", day: 12 },
      ],
      past: [
        {
          addonId: 1,
          periodId: 10,
          name: "Preworkout",
          details: "2 scoops",
          startDay: "2026-10-01",
          endDay: "2026-10-20",
          days: 20,
        },
        {
          addonId: 2,
          periodId: 20,
          name: "Caffeine pills",
          details: "200 mg",
          startDay: "2026-08-04",
          endDay: "2026-09-02",
          days: 30,
        },
      ],
    });
  });
});

describe("activeOn", () => {
  it("lists each add-on with the details it had that day", () => {
    expect(activeOn(ADDONS, "2026-10-20")).toEqual([
      { id: 3, name: "Creatine", details: "5 g daily" },
      { id: 1, name: "Preworkout", details: "2 scoops" },
    ]);
    expect(activeOn(ADDONS, "2026-10-21")).toEqual([
      { id: 3, name: "Creatine", details: "5 g daily" },
      { id: 1, name: "Preworkout", details: "1 scoop" },
    ]);
  });

  it("includes the first and last day of a period", () => {
    expect(activeOn(ADDONS, "2026-08-04").map((addon) => addon.name)).toEqual(["Caffeine pills"]);
    expect(activeOn(ADDONS, "2026-09-02").map((addon) => addon.name)).toEqual(["Caffeine pills"]);
    expect(activeOn(ADDONS, "2026-09-03")).toEqual([]);
  });
});
