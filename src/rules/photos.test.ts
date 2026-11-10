import { describe, expect, it } from "vitest";
import { comparePair, defaultBefore } from "./photos";

describe("defaultBefore", () => {
  it("picks the photo from four weeks earlier", () => {
    expect(defaultBefore("2026-10-29", ["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-28"])).toBe("2026-10-01");
  });

  it("picks the closest photo to four weeks earlier when that day has none", () => {
    expect(defaultBefore("2026-10-29", ["2026-09-20", "2026-10-04", "2026-10-20"])).toBe("2026-10-04");
    expect(defaultBefore("2026-10-29", ["2026-09-28", "2026-10-04"])).toBe("2026-09-28");
  });

  it("prefers the earlier photo when two are equally close", () => {
    expect(defaultBefore("2026-10-29", ["2026-09-30", "2026-10-02"])).toBe("2026-09-30");
  });

  it("only looks at days before the later photo", () => {
    expect(defaultBefore("2026-10-29", ["2026-10-29", "2026-10-30", "2026-11-26"])).toBeNull();
    expect(defaultBefore("2026-10-29", ["2026-10-25", "2026-10-30"])).toBe("2026-10-25");
  });

  it("finds nothing without photos", () => {
    expect(defaultBefore("2026-10-29", [])).toBeNull();
  });
});

describe("comparePair", () => {
  const days = ["2026-10-01", "2026-10-15", "2026-10-29"];

  it("compares the latest photo with the one from four weeks earlier by default", () => {
    expect(comparePair(days, null, null)).toEqual({ before: "2026-10-01", after: "2026-10-29" });
  });

  it("keeps the days that were picked", () => {
    expect(comparePair(days, "2026-10-15", "2026-10-29")).toEqual({ before: "2026-10-15", after: "2026-10-29" });
    expect(comparePair(days, "2026-10-29", "2026-10-01")).toEqual({ before: "2026-10-29", after: "2026-10-01" });
  });

  it("replaces days without a photo, or a before day equal to the after day", () => {
    expect(comparePair(days, "2026-10-02", "2026-10-30")).toEqual({ before: "2026-10-01", after: "2026-10-29" });
    expect(comparePair(days, "2026-10-15", "2026-10-15")).toEqual({ before: "2026-10-01", after: "2026-10-15" });
    expect(comparePair(days, "not a day", "2026-10-15")).toEqual({ before: "2026-10-01", after: "2026-10-15" });
  });

  it("compares the first photo with the latest when nothing comes before it", () => {
    expect(comparePair(days, null, "2026-10-01")).toEqual({ before: "2026-10-01", after: "2026-10-29" });
  });

  it("needs photos from two days", () => {
    expect(comparePair([], null, null)).toBeNull();
    expect(comparePair(["2026-10-01"], null, "2026-10-01")).toBeNull();
  });
});
