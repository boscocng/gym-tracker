import { describe, expect, it } from "vitest";
import {
  classifyReading,
  dailyWeights,
  dayWeight,
  isScaleStale,
  sevenDayAverageKg,
  weekChangeKg,
  type DayReading,
  type PriorReading,
} from "./weigh-in";

const at = new Date("2026-11-08T12:00:00Z");
const minutesBefore = (minutes: number) => new Date(at.getTime() - minutes * 60_000);
const daysBefore = (days: number) => minutesBefore(days * 24 * 60);

function prior(kg: number, measuredAt: Date, overrides: Partial<PriorReading> = {}): PriorReading {
  return { measuredAt, kg, source: "scale", flag: null, ...overrides };
}

describe("classifyReading", () => {
  it("accepts the first reading", () => {
    expect(classifyReading(80, at, [])).toBeNull();
  });

  it("flags the same weight within 10 minutes as a duplicate", () => {
    expect(classifyReading(80.1, at, [prior(80.1, minutesBefore(3))])).toBe("duplicate");
    expect(classifyReading(80.1, at, [prior(80.1, minutesBefore(10))])).toBe("duplicate");
  });

  it("treats weights within 0.05 kg as the same", () => {
    expect(classifyReading(80.15, at, [prior(80.1, minutesBefore(1))])).toBe("duplicate");
    expect(classifyReading(80.16, at, [prior(80.1, minutesBefore(1))])).toBeNull();
  });

  it("accepts the same weight after more than 10 minutes", () => {
    expect(classifyReading(80.1, at, [prior(80.1, minutesBefore(10.5))])).toBeNull();
  });

  it("flags a repeat of an outlier as a duplicate", () => {
    const outlier = prior(95, minutesBefore(1), { flag: "outlier" });
    expect(classifyReading(95, at, [outlier, prior(80, daysBefore(1))])).toBe("duplicate");
  });

  it("flags a reading more than 4 kg from the latest accepted one as an outlier", () => {
    expect(classifyReading(84.2, at, [prior(80.1, daysBefore(1))])).toBe("outlier");
    expect(classifyReading(76, at, [prior(80.1, daysBefore(1))])).toBe("outlier");
  });

  it("accepts a reading exactly 4 kg away", () => {
    expect(classifyReading(84, at, [prior(80, daysBefore(1))])).toBeNull();
  });

  it("compares against the latest accepted reading, skipping flagged ones", () => {
    const readings = [
      prior(70, daysBefore(1), { flag: "outlier" }),
      prior(80, daysBefore(2)),
      prior(90, daysBefore(3)),
    ];
    expect(classifyReading(81, at, readings)).toBeNull();
  });

  it("counts manual entries as accepted readings", () => {
    expect(classifyReading(90, at, [prior(80, daysBefore(1), { source: "manual" })])).toBe("outlier");
  });

  it("accepts any weight when nothing was accepted in the last 14 days", () => {
    expect(classifyReading(90, at, [prior(80, daysBefore(15))])).toBeNull();
    expect(classifyReading(90, at, [prior(80, daysBefore(13.9))])).toBe("outlier");
  });

  it("ignores readings from after this one", () => {
    expect(classifyReading(80, at, [prior(80, minutesBefore(-1))])).toBeNull();
  });
});

function reading(kg: number, measuredAt: Date, overrides: Partial<DayReading> = {}): DayReading {
  return { measuredAt, kg, value: kg, unit: "kg", source: "scale", flag: null, ...overrides };
}

describe("dayWeight", () => {
  it("has no weight without readings", () => {
    expect(dayWeight([])).toBeNull();
  });

  it("uses the first unflagged reading of the day", () => {
    const first = reading(80.2, minutesBefore(30));
    const later = reading(80.4, minutesBefore(5));
    const flagged = reading(95, minutesBefore(60), { flag: "outlier" });
    expect(dayWeight([later, flagged, first])).toBe(first);
  });

  it("lets a manual entry override the scale", () => {
    const manual = reading(81, minutesBefore(1), { source: "manual" });
    expect(dayWeight([reading(80.2, minutesBefore(30)), manual])).toBe(manual);
  });

  it("has no weight when every reading is flagged", () => {
    expect(dayWeight([reading(95, minutesBefore(1), { flag: "outlier" })])).toBeNull();
  });
});

describe("isScaleStale", () => {
  it("is stale with no readings", () => {
    expect(isScaleStale(null, "2026-11-08")).toBe(true);
  });

  it("is fine when the last reading was today or yesterday", () => {
    expect(isScaleStale("2026-11-08", "2026-11-08")).toBe(false);
    expect(isScaleStale("2026-11-07", "2026-11-08")).toBe(false);
  });

  it("is stale after 2 days without a reading, across a month boundary", () => {
    expect(isScaleStale("2026-10-30", "2026-11-01")).toBe(true);
  });
});

describe("dailyWeights", () => {
  it("picks each day's weight with the day rules", () => {
    const early = { ...reading(80.2, minutesBefore(30)), day: "2026-11-08" };
    const late = { ...reading(80.4, minutesBefore(5)), day: "2026-11-08" };
    const outlier = { ...reading(95, daysBefore(1), { flag: "outlier" }), day: "2026-11-07" };
    const weights = dailyWeights([late, outlier, early]);
    expect([...weights]).toEqual([["2026-11-08", early]]);
  });
});

describe("seven-day average and weekly change", () => {
  const daily = new Map([
    ["2026-11-01", 80],
    ["2026-11-03", 81],
    ["2026-11-08", 79],
    ["2026-11-09", 80],
    ["2026-11-14", 81],
  ]);

  it("averages the 7 calendar days ending on the day, skipping days without a weight", () => {
    expect(sevenDayAverageKg("2026-11-07", daily)).toBe(80.5);
    expect(sevenDayAverageKg("2026-11-14", daily)).toBe(80);
  });

  it("has no average when the window has no weights", () => {
    expect(sevenDayAverageKg("2026-10-31", daily)).toBeNull();
  });

  it("compares with the average from 7 days earlier", () => {
    expect(weekChangeKg("2026-11-14", daily)).toBe(-0.5);
    expect(weekChangeKg("2026-11-07", daily)).toBeNull();
  });
});
