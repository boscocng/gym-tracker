import { describe, expect, it } from "vitest";
import { formatWeight, weightIn } from "./units";

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
