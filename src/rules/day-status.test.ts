import { describe, expect, it } from "vitest";
import {
  type DayHistory,
  dayStatus,
  ordinal,
  restCheck,
  restIsFree,
  restWindow,
  skipCountWith,
  skipsThisMonth,
  trainedBefore,
  unresolvedDays,
} from "./day-status";
import { addDays } from "./days";

const START = "2026-11-01";

function history(trained: string[], marks: [string, "rest" | "skip"][] = [], startDate = START): DayHistory {
  return { startDate, trained: new Set(trained), marks: new Map(marks) };
}

function run(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

describe("dayStatus", () => {
  const past = history(["2026-11-02"], [["2026-11-03", "rest"], ["2026-11-04", "skip"]]);

  it.each([
    ["2026-11-02", "trained"],
    ["2026-11-03", "rest"],
    ["2026-11-04", "skipped"],
    ["2026-11-05", "unresolved"],
    ["2026-11-06", "in_progress"],
    ["2026-10-31", null],
    ["2026-11-07", null],
  ])("gives %s the status %s when today is Nov 6", (day, expected) => {
    expect(dayStatus(day, "2026-11-06", past)).toBe(expected);
  });

  it("counts a day with sets as trained even if it was marked", () => {
    expect(dayStatus("2026-11-03", "2026-11-06", history(["2026-11-03"], [["2026-11-03", "rest"]]))).toBe("trained");
  });

  it("shows today as trained once it has a set", () => {
    expect(dayStatus("2026-11-06", "2026-11-06", history(["2026-11-06"]))).toBe("trained");
  });
});

describe("unresolvedDays", () => {
  it("lists past days with no sets and no mark, oldest first, never today", () => {
    const days = unresolvedDays("2026-11-06", history(["2026-11-01", "2026-11-03"], [["2026-11-04", "skip"]]));
    expect(days).toEqual(["2026-11-02", "2026-11-05"]);
  });

  it("finds nothing on the first day", () => {
    expect(unresolvedDays(START, history([]))).toEqual([]);
  });

  it("crosses a month boundary", () => {
    const days = unresolvedDays("2026-12-02", history(run(START, 29), [], START));
    expect(days).toEqual(["2026-11-30", "2026-12-01"]);
  });
});

describe("restIsFree", () => {
  it("frees rest under 6 of 7 when 6 of the 7 days before were trained", () => {
    const sixOfSeven = history(["2026-11-01", ...run("2026-11-03", 5)]);
    expect(trainedBefore("2026-11-08", 7, sixOfSeven)).toBe(6);
    expect(restIsFree("2026-11-08", "six_of_seven", sixOfSeven)).toBe(true);
  });

  it("locks rest under 6 of 7 with only 5 of the 7 days trained", () => {
    const fiveOfSeven = history(run("2026-11-03", 5));
    expect(restIsFree("2026-11-08", "six_of_seven", fiveOfSeven)).toBe(false);
  });

  it("lets 6 of 7 take two rest days in a row after a full week, but not strict", () => {
    const fullWeekThenRest = history(run(START, 7), [["2026-11-08", "rest"]]);
    expect(restIsFree("2026-11-09", "six_of_seven", fullWeekThenRest)).toBe(true);
    expect(restIsFree("2026-11-09", "strict", fullWeekThenRest)).toBe(false);
  });

  it("frees rest under strict only when all 6 days before were trained", () => {
    expect(restIsFree("2026-11-08", "strict", history(run("2026-11-02", 6)))).toBe(true);
    expect(restIsFree("2026-11-08", "strict", history(run("2026-11-03", 5)))).toBe(false);
  });

  it("keeps rest locked during the first week, because days before the start count as not trained", () => {
    const everyDaySoFar = history(run(START, 5));
    expect(restIsFree("2026-11-06", "six_of_seven", everyDaySoFar)).toBe(false);
    expect(restIsFree("2026-11-06", "strict", everyDaySoFar)).toBe(false);
    expect(restIsFree("2026-11-07", "strict", history(run(START, 6)))).toBe(true);
    expect(restIsFree("2026-11-07", "six_of_seven", history(run(START, 6)))).toBe(true);
  });

  it("ignores sets dated before the start date", () => {
    const early = history(["2026-10-30", "2026-10-31", ...run(START, 4)]);
    expect(trainedBefore("2026-11-05", 7, early)).toBe(4);
  });

  it("summarizes rest for the sheet with the 7 days before", () => {
    const check = restCheck("2026-11-09", "2026-11-09", "strict", history(run("2026-11-03", 6), [], "2026-11-03"));
    expect(check).toMatchObject({ free: true, trained: 6, days: 6, needed: 6 });
    expect(check.strip.map(({ day, status }) => `${day.slice(8)} ${status}`)).toEqual([
      "02 null",
      "03 trained",
      "04 trained",
      "05 trained",
      "06 trained",
      "07 trained",
      "08 trained",
    ]);
  });

  it("describes each rule's window", () => {
    expect(restWindow("six_of_seven")).toEqual({ days: 7, needed: 6 });
    expect(restWindow("strict")).toEqual({ days: 6, needed: 6 });
  });
});

describe("skipCountWith", () => {
  const skips = history(
    [],
    [
      ["2026-10-10", "skip"],
      ["2026-10-11", "skip"],
      ["2026-10-20", "rest"],
      ["2026-11-02", "skip"],
    ],
    "2026-10-01",
  );

  it("counts skips in the 30 days ending today plus the new one", () => {
    expect(skipCountWith(["2026-11-09"], "2026-11-09", skips)).toBe(3);
  });

  it("counts every new day inside the window, once", () => {
    expect(skipCountWith(["2026-11-07", "2026-11-08", "2026-11-08"], "2026-11-09", skips)).toBe(4);
  });
});

describe("skipsThisMonth", () => {
  it("counts the skips from the 1st of today's month through today", () => {
    const marks = history(
      [],
      [
        ["2026-10-31", "skip"],
        ["2026-11-01", "skip"],
        ["2026-11-05", "rest"],
        ["2026-11-09", "skip"],
        ["2026-12-01", "skip"],
      ],
      "2026-10-01",
    );

    expect(skipsThisMonth("2026-11-09", marks)).toBe(2);
    expect(skipsThisMonth("2026-11-08", marks)).toBe(1);
    expect(skipsThisMonth("2026-10-31", marks)).toBe(1);
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [101, "101st"],
    [111, "111th"],
  ])("writes %s as %s", (count, expected) => {
    expect(ordinal(count)).toBe(expected);
  });
});
