import { describe, expect, it } from "vitest";
import { type DayHistory, restIsFree, unresolvedDays } from "@/rules/day-status";
import { daysBetween } from "@/rules/days";
import { type AliasTarget, parseSet } from "@/rules/parse-set";
import { KG_PER_LB } from "@/rules/units";
import { classifyReading, OUTLIER_WINDOW_MS } from "@/rules/weigh-in";
import { aliasesOf, BACK_PHOTO_EVERY_DAYS, EXERCISES, type SeedPlan, seedPlan } from "./seed-plan.mts";

const NOW = new Date("2026-11-10T05:00:00Z");
const PLANS = Array.from({ length: 10 }, () => seedPlan(NOW));

function historyOf(plan: SeedPlan): DayHistory {
  return {
    startDate: plan.startDate,
    trained: new Set(plan.sets.map((set) => set.day)),
    marks: new Map(plan.dayMarks.map((mark) => [mark.day, mark.kind])),
  };
}

describe("seedPlan", () => {
  it("covers 90 days up to now and leaves no day before today unresolved", () => {
    for (const plan of PLANS) {
      const history = historyOf(plan);
      const times = [...plan.weighIns.map((reading) => reading.measured_at), ...plan.photos.map((photo) => photo.takenAt)];

      expect([plan.startDate, plan.today]).toEqual(["2026-08-13", "2026-11-10"]);
      expect(unresolvedDays(plan.today, history)).toEqual([]);
      expect(plan.dayMarks.filter((mark) => history.trained.has(mark.day))).toEqual([]);
      expect(times.filter((time) => Date.parse(time) >= NOW.getTime())).toEqual([]);
    }
  });

  it("adds a back photo once a week, on days that also have a front photo", () => {
    for (const plan of PLANS) {
      const fronts = plan.photos.filter((photo) => photo.pose === "front").map((photo) => photo.day);
      const backs = plan.photos.filter((photo) => photo.pose === "back").map((photo) => photo.day);

      expect(backs).toEqual(fronts.filter((day) => daysBetween(day, plan.today) % BACK_PHOTO_EVERY_DAYS === 0));
      expect(backs).toContain(plan.today);
    }
  });

  it("rests only where the rest rule allows it, under either rule", () => {
    for (const plan of PLANS) {
      const history = historyOf(plan);
      const restDays = plan.dayMarks.filter((mark) => mark.kind === "rest").map((mark) => mark.day);

      expect(restDays.length).toBeGreaterThan(5);
      expect(
        restDays.filter((day) => !restIsFree(day, "six_of_seven", history) || !restIsFree(day, "strict", history)),
      ).toEqual([]);
    }
  });

  it("writes set text that the parser reads back as the same set", () => {
    const aliases = new Map<string, AliasTarget>(
      EXERCISES.flatMap((exercise, exerciseId) =>
        aliasesOf(exercise).map((alias) => [alias, { exerciseId, isBodyweight: exercise.isBodyweight }] as const),
      ),
    );

    for (const set of PLANS.flatMap((plan) => plan.sets)) {
      expect(parseSet(set.raw_input, aliases, "lb")).toEqual({
        kind: "set",
        set: {
          exerciseId: EXERCISES.findIndex((exercise) => exercise.name === set.exercise),
          loadValue: set.load_value,
          loadUnit: "lb",
          reps: set.reps,
        },
      });
    }
  });

  it("flags weigh-ins the way the scale endpoint would", () => {
    for (const plan of PLANS) {
      const readings = plan.weighIns
        .map((reading) => ({
          measuredAt: new Date(reading.measured_at),
          kg: reading.unit === "kg" ? reading.value : reading.value * KG_PER_LB,
          source: reading.source,
          flag: reading.flag ?? null,
        }))
        .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
      const expected = readings.map((reading, index) => {
        const since = reading.measuredAt.getTime() - OUTLIER_WINDOW_MS;
        const prior = readings.slice(0, index).filter((earlier) => earlier.measuredAt.getTime() >= since);
        return reading.source === "scale" ? classifyReading(reading.kg, reading.measuredAt, prior) : null;
      });

      expect(readings.map((reading) => reading.flag)).toEqual(expected);
      expect(expected).toContain("duplicate");
      expect(expected.filter((flag) => flag === "outlier")).toHaveLength(1);
    }
  });
});
