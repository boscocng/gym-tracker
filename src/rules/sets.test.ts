import { describe, expect, it } from "vitest";
import { groupByExercise, loadLabel, logSummary } from "./sets";

describe("groupByExercise", () => {
  it("groups in order of each exercise's first set and numbers sets within each exercise", () => {
    const sets = [
      { id: 10, exerciseId: 1 },
      { id: 11, exerciseId: 2 },
      { id: 12, exerciseId: 1 },
      { id: 13, exerciseId: 3 },
      { id: 14, exerciseId: 2 },
    ];
    expect(groupByExercise(sets)).toEqual([
      {
        exerciseId: 1,
        sets: [
          { id: 10, exerciseId: 1, number: 1 },
          { id: 12, exerciseId: 1, number: 2 },
        ],
      },
      {
        exerciseId: 2,
        sets: [
          { id: 11, exerciseId: 2, number: 1 },
          { id: 14, exerciseId: 2, number: 2 },
        ],
      },
      { exerciseId: 3, sets: [{ id: 13, exerciseId: 3, number: 1 }] },
    ]);
  });

  it("renumbers without gaps after a set is deleted", () => {
    const remaining = [
      { id: 10, exerciseId: 1 },
      { id: 12, exerciseId: 1 },
    ];
    expect(groupByExercise(remaining)[0].sets.map((set) => set.number)).toEqual([1, 2]);
  });

  it("returns no groups for a day without sets", () => {
    expect(groupByExercise([])).toEqual([]);
  });
});

describe("loadLabel", () => {
  it.each([
    [false, 185, "185"],
    [false, 102.3, "102.3"],
    [true, 0, "BW"],
    [true, 45, "+45"],
    [true, 22.5, "+22.5"],
  ])("labels bodyweight=%s load %s as %j", (isBodyweight, amount, expected) => {
    expect(loadLabel(isBodyweight, amount)).toBe(expected);
  });
});

describe("logSummary", () => {
  it.each([
    [0, 0, "0 sets"],
    [1, 1, "1 set · 1 exercise"],
    [5, 3, "5 sets · 3 exercises"],
  ])("summarizes %s sets of %s exercises", (setCount, exerciseCount, expected) => {
    expect(logSummary(setCount, exerciseCount)).toBe(expected);
  });
});
