import { describe, expect, it } from "vitest";
import {
  type AliasTarget,
  normalizeAlias,
  PARSE_ERROR,
  type ParseResult,
  parseSet,
  type SetReading,
  setValues,
} from "./parse-set";

const BENCH = 1;
const INCLINE = 2;
const OHP = 3;
const LATERAL = 4;
const PULL_UP = 5;

const weighted = (exerciseId: number): AliasTarget => ({ exerciseId, isBodyweight: false });
const bodyweight = (exerciseId: number): AliasTarget => ({ exerciseId, isBodyweight: true });

const aliases = new Map<string, AliasTarget>([
  ["bench", weighted(BENCH)],
  ["bench press", weighted(BENCH)],
  ["benchpress", weighted(BENCH)],
  ["incline", weighted(INCLINE)],
  ["incline db", weighted(INCLINE)],
  ["ohp", weighted(OHP)],
  ["lateral raises", weighted(LATERAL)],
  ["pull ups", bodyweight(PULL_UP)],
  ["weighted pull ups", bodyweight(PULL_UP)],
]);

function set(exerciseId: number, loadValue: number, loadUnit: "lb" | "kg", reps: number): ParseResult {
  return { kind: "set", set: { exerciseId, loadValue, loadUnit, reps } };
}

const failed: ParseResult = { kind: "error", message: PARSE_ERROR };

function unknown(spokenName: string, load: number | null, unit: "lb" | "kg", reps: number): ParseResult {
  return { kind: "unknown", spokenName, reading: { load, unit, reps } };
}

describe("parseSet", () => {
  it.each([
    ["benchpress: first set, 50lbs 8 reps", set(BENCH, 50, "lb", 8)],
    ["Bench press, first set, 50 pounds, 8 reps.", set(BENCH, 50, "lb", 8)],
    ["bench 185 for 6", set(BENCH, 185, "lb", 6)],
    ["8 reps bench press 140lbs", set(BENCH, 140, "lb", 8)],
    ["incline db 70 x 8", set(INCLINE, 70, "lb", 8)],
    ["OHP 115 lbs 7 reps", set(OHP, 115, "lb", 7)],
    ["set 2 bench 185 5", set(BENCH, 185, "lb", 5)],
    ["lateral raises 25 for 12", set(LATERAL, 25, "lb", 12)],
    ["bench press fifty pounds eight reps", set(BENCH, 50, "lb", 8)],
    ["pull ups 12 reps", set(PULL_UP, 0, "lb", 12)],
    ["weighted pull ups plus 45 for 6", set(PULL_UP, 45, "lb", 6)],
  ])("reads the spec example %j", (text, expected) => {
    expect(parseSet(text, aliases, "lb")).toEqual(expected);
  });

  it("rejects the spec's unreadable example", () => {
    expect(parseSet("hello there", aliases, "lb")).toEqual(failed);
  });

  it.each([
    ["bench 100 kg for 5", "lb", set(BENCH, 100, "kg", 5)],
    ["bench 185 for 6", "kg", set(BENCH, 185, "kg", 6)],
    ["bench 60 kilos 8 reps", "lb", set(BENCH, 60, "kg", 8)],
    ["bench 135 pounds 5 times", "kg", set(BENCH, 135, "lb", 5)],
    ["incline 12.5kg x 10", "lb", set(INCLINE, 12.5, "kg", 10)],
    ["incline 70×8", "lb", set(INCLINE, 70, "lb", 8)],
  ] as const)("reads the unit in %j (default %s)", (text, defaultUnit, expected) => {
    expect(parseSet(text, aliases, defaultUnit)).toEqual(expected);
  });

  it.each([
    ["bench one eighty five for six", set(BENCH, 185, "lb", 6)],
    ["bench two twenty five for five", set(BENCH, 225, "lb", 5)],
    ["bench a hundred and thirty five pounds five reps", set(BENCH, 135, "lb", 5)],
    ["bench four oh five for one", set(BENCH, 405, "lb", 1)],
    ["lateral raises twenty five for twelve", set(LATERAL, 25, "lb", 12)],
    ["bench press set one fifty pounds eight reps", set(BENCH, 50, "lb", 8)],
  ])("reads number words in %j", (text, expected) => {
    expect(parseSet(text, aliases, "lb")).toEqual(expected);
  });

  it.each([
    ["set number three bench 185 for 5", set(BENCH, 185, "lb", 5)],
    ["set two bench 185 5", set(BENCH, 185, "lb", 5)],
    ["bench 2nd set 185 for 6", set(BENCH, 185, "lb", 6)],
    ["last set, bench 185 for 4", set(BENCH, 185, "lb", 4)],
  ])("ignores the spoken set number in %j", (text, expected) => {
    expect(parseSet(text, aliases, "lb")).toEqual(expected);
  });

  it.each([
    ["pull ups 12", set(PULL_UP, 0, "lb", 12)],
    ["pull ups +25 for 8", set(PULL_UP, 25, "lb", 8)],
    ["weighted pull ups plus 20 kg 5 reps", set(PULL_UP, 20, "kg", 5)],
    ["8 pull ups plus 25", set(PULL_UP, 25, "lb", 8)],
  ])("treats a bodyweight load as added weight in %j", (text, expected) => {
    expect(parseSet(text, aliases, "lb")).toEqual(expected);
  });

  it("matches the longest alias first", () => {
    const overlapping = new Map<string, AliasTarget>([
      ["press", weighted(1)],
      ["bench press", weighted(2)],
      ["row", weighted(3)],
      ["barbell row", weighted(4)],
      ["db", weighted(5)],
      ["incline press", weighted(6)],
    ]);
    expect(parseSet("bench press 185 for 6", overlapping, "lb")).toEqual(set(2, 185, "lb", 6));
    expect(parseSet("135 for 8 barbell row", overlapping, "lb")).toEqual(set(4, 135, "lb", 8));
    expect(parseSet("db incline press 70 for 8", overlapping, "lb")).toEqual(unknown("db incline press", 70, "lb", 8));
  });

  it("asks about an alias with extra exercise words instead of dropping them", () => {
    const withSquat = new Map([...aliases, ["squat", weighted(6)]]);
    expect(parseSet("zercher squat 100 for 5", withSquat, "lb")).toEqual(unknown("zercher squat", 100, "lb", 5));
    expect(parseSet("squat 100 for 5", withSquat, "lb")).toEqual(set(6, 100, "lb", 5));
  });

  it("reads “weighted” as a description of a bodyweight load, not a different exercise", () => {
    const pullUpsOnly = new Map([["pull ups", bodyweight(PULL_UP)]]);
    expect(parseSet("weighted pull ups plus 45 for 6", pullUpsOnly, "lb")).toEqual(set(PULL_UP, 45, "lb", 6));
  });

  it.each([
    ["zercher squat 100 kilos for 5", unknown("zercher squat", 100, "kg", 5)],
    ["dips 12 reps", unknown("dips", null, "lb", 12)],
    ["I did hammer curls 30 for 10", unknown("hammer curls", 30, "lb", 10)],
    ["first set, landmine press 45 for 10", unknown("landmine press", 45, "lb", 10)],
  ])("asks about the unknown exercise in %j", (text, expected) => {
    expect(parseSet(text, aliases, "lb")).toEqual(expected);
  });

  it.each([
    ["bench 8 reps", "a weighted exercise without a weight"],
    ["bench 185 lbs", "a weight without reps"],
    ["bench", "no numbers"],
    ["185 for 6", "no exercise"],
    ["bench 185 for 6 and 185 for 5", "two sets at once"],
    ["bench 185 for 0", "zero reps"],
    ["bench 185 for 6.5", "fractional reps"],
    ["bench 10000 for 5", "an impossible weight"],
    ["", "nothing"],
  ])("rejects %j (%s)", (text) => {
    expect(parseSet(text, aliases, "lb")).toEqual(failed);
  });
});

describe("setValues", () => {
  const noLoad: SetReading = { load: null, unit: "kg", reps: 12 };

  it("treats a missing load as bodyweight only for a bodyweight exercise", () => {
    expect(setValues(noLoad, true)).toEqual({ loadValue: 0, loadUnit: "kg", reps: 12 });
    expect(setValues(noLoad, false)).toBeNull();
  });

  it("keeps the load and unit that were said", () => {
    expect(setValues({ load: 45, unit: "lb", reps: 6 }, true)).toEqual({ loadValue: 45, loadUnit: "lb", reps: 6 });
  });
});

describe("normalizeAlias", () => {
  it.each([
    ["Weighted pull-up", "weighted pull up"],
    ["  OHP ", "ohp"],
    ["Pull-Ups!", "pull ups"],
    ["Incline  DB", "incline db"],
    ["123", ""],
  ])("normalizes %j to %j", (text, expected) => {
    expect(normalizeAlias(text)).toBe(expected);
  });
});
