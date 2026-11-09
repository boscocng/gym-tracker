import { describe, expect, it } from "vitest";
import { defaultUnit, initialSettings } from "./initial-settings";
import { isTimeZone } from "./time-zone";

describe("defaultUnit", () => {
  it.each([
    ["en-US", "lb"],
    ["es-US", "lb"],
    ["en", "lb"],
    ["en-GB", "kg"],
    ["de-DE", "kg"],
    ["", "kg"],
    ["not a locale", "kg"],
  ])("%s gives %s", (locale, unit) => {
    expect(defaultUnit(locale)).toBe(unit);
  });
});

describe("isTimeZone", () => {
  it.each(["America/New_York", "Asia/Kolkata", "Asia/Calcutta", "UTC", "Etc/GMT+5"])("accepts %s", (zone) => {
    expect(isTimeZone(zone)).toBe(true);
  });

  it.each(["Mars/Olympus_Mons", "", "+05:30", "-08:00"])("rejects %s", (zone) => {
    expect(isTimeZone(zone)).toBe(false);
  });
});

describe("initialSettings", () => {
  const now = new Date("2026-11-08T07:30:00Z");

  it("uses the browser's time zone and starts on today's training day", () => {
    expect(initialSettings("America/New_York", "en-US", now)).toEqual({
      time_zone: "America/New_York",
      unit: "lb",
      rollover_hour: 4,
      start_date: "2026-11-07",
    });
  });

  it("falls back to UTC for a time zone it doesn't recognize", () => {
    expect(initialSettings("Mars/Olympus_Mons", "en-GB", now)).toEqual({
      time_zone: "UTC",
      unit: "kg",
      rollover_hour: 4,
      start_date: "2026-11-08",
    });
  });
});
