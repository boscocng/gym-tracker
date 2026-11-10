import { describe, expect, it } from "vitest";
import { addDays, dayRange, daysBetween, isDay } from "./days";

describe("days", () => {
  it.each([
    ["2026-11-01", -1, "2026-10-31"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-03-08", 1, "2026-03-09"],
  ])("adds to %s %s day to get %s", (day, amount, expected) => {
    expect(addDays(day, amount)).toBe(expected);
    expect(daysBetween(day, expected)).toBe(amount);
  });

  it.each([
    ["2026-11-09", true],
    ["2026-02-30", false],
    ["2026-11-9", false],
    ["2026-11-09T00:00", false],
    ["", false],
  ])("accepts %j as a day: %s", (value, expected) => {
    expect(isDay(value)).toBe(expected);
  });
});

describe("dayRange", () => {
  it("lists every day from the first through the last", () => {
    expect(dayRange("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(dayRange("2026-11-02", "2026-11-02")).toEqual(["2026-11-02"]);
  });

  it("is empty when the range is backwards", () => {
    expect(dayRange("2026-11-03", "2026-11-02")).toEqual([]);
  });
});
