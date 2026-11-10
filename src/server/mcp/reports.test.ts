import { describe, expect, it } from "vitest";
import type { DayHistory } from "@/rules/day-status";
import type { OwnerSettings } from "@/server/settings";
import {
  addonReport,
  dayReport,
  exerciseHistory,
  findExercise,
  overviewReport,
  rangeError,
  type ReadingRow,
  type SetRow,
  setsReport,
  weightReport,
} from "./reports";

function reading(day: string, kg: number, extra: Partial<ReadingRow> = {}): ReadingRow {
  return { day, measuredAt: new Date(`${day}T12:00:00Z`), kg, value: kg, unit: "kg", source: "scale", flag: null, ...extra };
}

function set(day: string, exerciseId: number, loadKg: number, reps: number, extra: Partial<SetRow> = {}): SetRow {
  return {
    day,
    exerciseId,
    name: exerciseId === 1 ? "Bench press" : "Pull-up",
    isBodyweight: exerciseId !== 1,
    loadValue: loadKg,
    loadUnit: "kg",
    loadKg,
    reps,
    ...extra,
  };
}

const HISTORY: DayHistory = {
  startDate: "2026-11-02",
  trained: new Set(["2026-11-02", "2026-11-05"]),
  marks: new Map([
    ["2026-11-03", "rest"],
    ["2026-11-04", "skip"],
  ]),
};

describe("rangeError", () => {
  it("accepts up to 366 days, in order", () => {
    expect(rangeError("2026-01-01", "2027-01-01")).toBeNull();
    expect(rangeError("2026-01-01", "2027-01-02")).toBe("Ask for at most 366 days at a time.");
    expect(rangeError("2026-11-02", "2026-11-01")).toBe("`from` has to be on or before `to`.");
  });
});

describe("findExercise", () => {
  const exercises = [
    { id: 1, name: "Bench press", isBodyweight: false },
    { id: 2, name: "Pull-up", isBodyweight: true },
  ];
  const aliases = new Map([
    ["bench press", 1],
    ["bench", 1],
    ["pull up", 2],
  ]);

  it("matches an alias or the name, ignoring case and punctuation", () => {
    expect(findExercise("Bench", exercises, aliases)?.id).toBe(1);
    expect(findExercise("pull-ups", exercises, aliases)).toBeNull();
    expect(findExercise("Pull-Up", exercises, aliases)?.id).toBe(2);
    expect(findExercise(" BENCH PRESS ", exercises, aliases)?.id).toBe(1);
    expect(findExercise("squat", exercises, aliases)).toBeNull();
  });
});

describe("weightReport", () => {
  it("lists each day's weight and 7-day average in the owner's unit, skipping flagged readings", () => {
    const readings = [
      reading("2026-11-01", 80),
      reading("2026-11-03", 81, { flag: "outlier" }),
      reading("2026-11-03", 79, { measuredAt: new Date("2026-11-03T13:00:00Z") }),
      reading("2026-11-04", 79.2, { source: "manual", value: 174.6, unit: "lb" }),
    ];

    expect(weightReport("lb", "2026-11-02", "2026-11-04", readings)).toEqual({
      unit: "lb",
      days: [
        { day: "2026-11-02", average_7d: 176.4 },
        { day: "2026-11-03", weight: 174.2, source: "scale", average_7d: 175.3 },
        { day: "2026-11-04", weight: 174.6, source: "manual", average_7d: 175 },
      ],
    });
  });

  it("leaves out days with neither a weight nor an average", () => {
    expect(weightReport("kg", "2026-11-01", "2026-11-02", [reading("2026-10-20", 80)]).days).toEqual([]);
  });
});

describe("setsReport", () => {
  it("groups sets by day and exercise in the order they were logged", () => {
    const sets = [
      set("2026-11-02", 1, 100, 5),
      set("2026-11-02", 2, 0, 10),
      set("2026-11-02", 1, 100, 4, { loadValue: 220.5, loadUnit: "lb", loadKg: 100.016 }),
      set("2026-11-05", 2, 10, 8),
    ];

    expect(setsReport("kg", sets).days).toEqual([
      {
        day: "2026-11-02",
        exercises: [
          { name: "Bench press", sets: [{ load: 100, reps: 5 }, { load: 100, reps: 4 }] },
          { name: "Pull-up", bodyweight: true, sets: [{ load: 0, reps: 10 }] },
        ],
      },
      { day: "2026-11-05", exercises: [{ name: "Pull-up", bodyweight: true, sets: [{ load: 10, reps: 8 }] }] },
    ]);
  });
});

describe("exerciseHistory", () => {
  it("reports each day's top set by estimated 1RM", () => {
    const bench = { id: 1, name: "Bench press", isBodyweight: false };
    const sets = [set("2026-11-02", 1, 100, 5), set("2026-11-02", 1, 105, 1), set("2026-11-02", 1, 90, 10)];

    expect(exerciseHistory("kg", bench, sets, new Map()).sessions).toEqual([
      { day: "2026-11-02", sets: 3, top_set: { load: 90, reps: 10 }, e1rm: 120 },
    ]);
  });

  it("adds the day's bodyweight for bodyweight exercises, and leaves the estimate out without one", () => {
    const pullUp = { id: 2, name: "Pull-up", isBodyweight: true };
    const sets = [set("2026-11-02", 2, 0, 10), set("2026-11-02", 2, 20, 3), set("2026-11-05", 2, 10, 8)];

    const history = exerciseHistory("kg", pullUp, sets, new Map([["2026-11-02", 80]]));

    expect(history.sessions).toEqual([
      { day: "2026-11-02", sets: 2, top_set: { load: 20, reps: 3 }, e1rm: 110 },
      { day: "2026-11-05", sets: 1, top_set: { load: 10, reps: 8 } },
    ]);
    expect(history.bodyweight).toBe(true);
  });
});

describe("dayReport", () => {
  it("lists each tracked day's status, skip reason and whether a photo exists", () => {
    const report = dayReport(
      "2026-11-01",
      "2026-11-30",
      "2026-11-06",
      HISTORY,
      new Map([["2026-11-04", "A reason that is long enough"]]),
      new Set(["2026-11-02"]),
    );

    expect(report.days).toEqual([
      { day: "2026-11-02", status: "trained", photo: true },
      { day: "2026-11-03", status: "rest", photo: false },
      { day: "2026-11-04", status: "skipped", skip_reason: "A reason that is long enough", photo: false },
      { day: "2026-11-05", status: "trained", photo: false },
      { day: "2026-11-06", status: "in_progress", photo: false },
    ]);
  });
});

describe("addonReport", () => {
  it("lists add-ons by name with their periods in order", () => {
    const report = addonReport([
      {
        id: 1,
        name: "Preworkout",
        periods: [
          { id: 2, details: "1 scoop", startDay: "2026-10-21", endDay: null },
          { id: 1, details: "2 scoops", startDay: "2026-10-01", endDay: "2026-10-20" },
        ],
      },
      { id: 2, name: "Creatine", periods: [{ id: 3, details: "5 g", startDay: "2026-09-28", endDay: null }] },
    ]);

    expect(report.addons).toEqual([
      { name: "Creatine", periods: [{ details: "5 g", start: "2026-09-28", end: null }] },
      {
        name: "Preworkout",
        periods: [
          { details: "2 scoops", start: "2026-10-01", end: "2026-10-20" },
          { details: "1 scoop", start: "2026-10-21", end: null },
        ],
      },
    ]);
  });
});

describe("overviewReport", () => {
  it("counts each kind of day since tracking started and gives the latest weight", () => {
    const settings: OwnerSettings = {
      unit: "kg",
      time_zone: "UTC",
      rollover_hour: 4,
      rest_rule: "six_of_seven",
      start_date: "2026-11-02",
    };
    const counts = { sets: 12, weigh_ins: 5, photos: 1, exercises: 2, addons: 1 };

    const report = overviewReport(settings, "2026-11-07", HISTORY, counts, [
      reading("2026-11-04", 80),
      reading("2026-11-06", 81),
    ]);

    expect(report.days).toEqual({ trained: 2, rest: 1, skipped: 1, unresolved: 1, today: "in_progress" });
    expect(report.counts).toBe(counts);
    expect(report.latest_weight).toEqual({ day: "2026-11-06", weight: 81, average_7d: 80.5 });
  });
});
