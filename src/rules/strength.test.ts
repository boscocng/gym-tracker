import { describe, expect, it } from "vitest";
import { epleyKg, type StrengthSet, strengthChanges } from "./strength";

const TODAY = "2026-11-28";
const RECENT = "2026-11-25";
const EARLIER = "2026-11-03";

function sets(name: string, exerciseId: number, entries: [day: string, loadKg: number, reps: number][]) {
  return entries.map(([day, loadKg, reps]): StrengthSet => ({ day, exerciseId, name, isBodyweight: false, loadKg, reps }));
}

describe("epleyKg", () => {
  it("estimates a one-rep max as load times one plus reps over 30", () => {
    expect(epleyKg(100, 5)).toBeCloseTo(116.667);
    expect(epleyKg(60, 30)).toBe(120);
  });
});

describe("strengthChanges", () => {
  it("compares the best set of the last 7 days with the week that ended 21 days ago", () => {
    const bench = sets("Bench press", 1, [
      ["2026-10-31", 100, 5],
      ["2026-11-01", 90, 5],
      ["2026-11-07", 95, 8],
      ["2026-11-08", 200, 1],
      ["2026-11-21", 200, 1],
      ["2026-11-22", 105, 5],
      [TODAY, 100, 6],
    ]);

    const [change] = strengthChanges(TODAY, bench, new Map());

    expect(change.exerciseId).toBe(1);
    expect(change.name).toBe("Bench press");
    expect(change.percent).toBeCloseTo((epleyKg(105, 5) / epleyKg(95, 8) - 1) * 100);
  });

  it("shows the 3 exercises with the most sets in the last 28 days, most first", () => {
    const all = [
      ...sets("Squat", 2, [
        [EARLIER, 100, 5],
        [RECENT, 110, 5],
      ]),
      ...sets("Bench press", 1, [
        [EARLIER, 80, 5],
        [EARLIER, 80, 5],
        [RECENT, 80, 5],
      ]),
      ...sets("Row", 3, [
        [EARLIER, 60, 5],
        [RECENT, 60, 5],
        ["2026-10-01", 60, 5],
        ["2026-10-01", 60, 5],
      ]),
      ...sets("Deadlift", 4, [
        [EARLIER, 140, 5],
        [RECENT, 150, 5],
      ]),
    ];

    expect(strengthChanges(TODAY, all, new Map()).map((change) => change.name)).toEqual([
      "Bench press",
      "Deadlift",
      "Row",
    ]);
  });

  it("hides an exercise without sets in both weeks, without showing the next one instead", () => {
    const all = [
      ...sets("Bench press", 1, [
        [EARLIER, 80, 5],
        [RECENT, 82, 5],
        [RECENT, 82, 5],
      ]),
      ...sets("Squat", 2, [
        ["2026-11-15", 100, 5],
        [RECENT, 110, 5],
        [RECENT, 110, 5],
      ]),
      ...sets("Row", 3, [
        [EARLIER, 60, 5],
        [RECENT, 62, 5],
      ]),
      ...sets("Deadlift", 4, [[EARLIER, 140, 5]]),
    ];

    expect(strengthChanges(TODAY, all, new Map()).map((change) => change.name)).toEqual(["Bench press", "Row"]);
  });

  it("adds the day's bodyweight to bodyweight exercises, and skips sets on days without one", () => {
    const pullUps: StrengthSet[] = [
      { day: EARLIER, exerciseId: 5, name: "Pull-up", isBodyweight: true, loadKg: 0, reps: 10 },
      { day: "2026-11-04", exerciseId: 5, name: "Pull-up", isBodyweight: true, loadKg: 100, reps: 10 },
      { day: RECENT, exerciseId: 5, name: "Pull-up", isBodyweight: true, loadKg: 10, reps: 10 },
    ];
    const bodyweight = new Map([
      [EARLIER, 80],
      [RECENT, 81],
    ]);

    const [change] = strengthChanges(TODAY, pullUps, bodyweight);

    expect(change.percent).toBeCloseTo((epleyKg(91, 10) / epleyKg(80, 10) - 1) * 100);
  });

  it("finds nothing without sets", () => {
    expect(strengthChanges(TODAY, [], new Map())).toEqual([]);
  });
});
