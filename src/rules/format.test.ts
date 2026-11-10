import { describe, expect, it } from "vitest";
import { daysBetween } from "./days";
import {
  formatClock,
  formatDayLabel,
  formatHour,
  formatRelativeDay,
  formatShortDate,
  formatShortDayLabel,
  formatWeekday,
  formatWeekdayLetter,
} from "./format";

describe("formatClock", () => {
  it("shows the time in the owner's time zone, in lowercase", () => {
    expect(formatClock(new Date("2026-11-08T12:12:00Z"), "America/New_York")).toBe("7:12 am");
    expect(formatClock(new Date("2026-11-08T12:12:00Z"), "UTC")).toBe("12:12 pm");
  });
});

describe("formatHour", () => {
  it.each([
    [0, "12:00 am"],
    [4, "4:00 am"],
    [13, "1:00 pm"],
  ])("%i is %s", (hour, label) => {
    expect(formatHour(hour)).toBe(label);
  });
});

describe("day labels", () => {
  it("formats a training day without shifting it by time zone", () => {
    expect(formatDayLabel("2026-11-01")).toBe("Sunday · Nov 1");
    expect(formatShortDayLabel("2026-11-01")).toBe("Sun, Nov 1");
    expect(formatShortDate("2026-12-31")).toBe("Dec 31");
    expect(formatWeekday("2026-11-01")).toBe("Sunday");
    expect(formatWeekdayLetter("2026-11-02")).toBe("M");
  });

  it("names today and yesterday", () => {
    expect(formatRelativeDay("2026-11-08", "2026-11-08")).toBe("Today");
    expect(formatRelativeDay("2026-11-07", "2026-11-08")).toBe("Yesterday");
    expect(formatRelativeDay("2026-11-05", "2026-11-08")).toBe("Nov 5");
  });
});

describe("daysBetween", () => {
  it("counts calendar days across month and year ends", () => {
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });
});
