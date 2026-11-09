import { describe, expect, it } from "vitest";
import { formatChange, formatLoad, formatWeight, weightIn } from "./units";

describe("weightIn", () => {
  it("shows the entered value when the units match", () => {
    expect(weightIn("lb", { value: 171.2, unit: "lb", kg: 77.655 })).toBe(171.2);
  });

  it("converts a kilogram reading to pounds, rounded to 0.1", () => {
    expect(weightIn("lb", { value: 80.1, unit: "kg", kg: 80.1 })).toBe(176.6);
  });

  it("uses the stored kilograms for a pound reading shown in kilograms", () => {
    expect(weightIn("kg", { value: 170, unit: "lb", kg: 77.111 })).toBe(77.1);
  });
});

describe("formatWeight", () => {
  it("always shows one decimal", () => {
    expect(formatWeight(80)).toBe("80.0");
    expect(formatWeight(176.6)).toBe("176.6");
  });
});

describe("formatLoad", () => {
  it("drops the decimal for whole loads", () => {
    expect(formatLoad(185)).toBe("185");
    expect(formatLoad(220.5)).toBe("220.5");
    expect(formatLoad(0)).toBe("0");
  });
});

describe("formatChange", () => {
  it.each([
    [0.94, "+0.9"],
    [-0.5, "\u22120.5"],
    [0.04, "0.0"],
    [-0.04, "0.0"],
  ])("writes %s as %s", (amount, expected) => {
    expect(formatChange(amount)).toBe(expected);
  });
});
