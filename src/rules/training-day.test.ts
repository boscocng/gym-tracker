import { describe, expect, it } from "vitest";
import { trainingDay } from "./training-day";
import { trainingDayCases } from "./training-day.cases";

describe("trainingDay", () => {
  it.each(trainingDayCases)("$name", ({ at, timeZone, rolloverHour, day }) => {
    expect(trainingDay(new Date(at), timeZone, rolloverHour)).toBe(day);
  });
});
