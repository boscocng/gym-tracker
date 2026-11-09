import { describe, expect, it } from "vitest";
import { isMonth, monthGrid, monthName, shiftMonth } from "./calendar";

describe("monthGrid", () => {
  it("covers October 2026 with whole Monday-first weeks", () => {
    const cells = monthGrid("2026-10");
    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 4)).toEqual([
      { day: "2026-09-28", inMonth: false },
      { day: "2026-09-29", inMonth: false },
      { day: "2026-09-30", inMonth: false },
      { day: "2026-10-01", inMonth: true },
    ]);
    expect(cells.at(-1)).toEqual({ day: "2026-11-01", inMonth: false });
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it("needs six weeks for a month that starts on a Sunday", () => {
    const cells = monthGrid("2026-11");
    expect(cells).toHaveLength(42);
    expect(cells[6]).toEqual({ day: "2026-11-01", inMonth: true });
  });

  it("handles February in a leap year", () => {
    expect(monthGrid("2028-02").filter((cell) => cell.inMonth).at(-1)?.day).toBe("2028-02-29");
  });
});

describe("months", () => {
  it.each([
    ["2026-11", 1, "2026-12"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
  ])("shifts %s by %s to %s", (month, amount, expected) => {
    expect(shiftMonth(month, amount)).toBe(expected);
  });

  it.each([
    ["2026-11", true],
    ["2026-13", false],
    ["2026-1", false],
    ["november", false],
  ])("accepts %s as a month: %s", (value, expected) => {
    expect(isMonth(value)).toBe(expected);
  });

  it("names the month", () => {
    expect(monthName("2026-10")).toBe("October");
  });
});
