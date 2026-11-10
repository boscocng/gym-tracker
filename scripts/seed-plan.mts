import type { TablesInsert } from "../src/database.types.ts";
import { addDays, dayRange } from "../src/rules/days.ts";
import { normalizeAlias } from "../src/rules/parse-set.ts";
import { trainingDay } from "../src/rules/training-day.ts";
import { KG_PER_LB } from "../src/rules/units.ts";

type Random = () => number;
type PlannedDay = { day: string; index: number; kind: "trained" | "rest" | "skip" };
type Lift = {
  exercise: string;
  sets: number;
  reps: readonly [number, number];
  lb: number;
  addLb: number;
  addReps: number;
  every: number;
};

export type SeedExercise = { name: string; isBodyweight: boolean; aliases: readonly string[] };
export type PlannedWeighIn = TablesInsert<"weigh_ins"> & { measured_at: string };
export type PlannedSet = Omit<TablesInsert<"sets">, "exercise_id"> & { exercise: string };
export type PlannedPhoto = { day: string; variant: number; takenAt: string };
export type PlannedAddon = { name: string; periods: Omit<TablesInsert<"addon_periods">, "addon_id">[] };
export type SeedPlan = {
  today: string;
  startDate: string;
  weighIns: PlannedWeighIn[];
  dayMarks: TablesInsert<"day_marks">[];
  sets: PlannedSet[];
  photos: PlannedPhoto[];
  addons: PlannedAddon[];
};

export const TIME_ZONE = "UTC";
export const ROLLOVER_HOUR = 4;
export const DAYS = 90;
export const PHOTO_VARIANTS = 4;

export const EXERCISES: readonly SeedExercise[] = [
  { name: "Bench press", isBodyweight: false, aliases: ["bench", "benchpress", "flat bench"] },
  { name: "Overhead press", isBodyweight: false, aliases: ["ohp", "shoulder press"] },
  { name: "Incline dumbbell press", isBodyweight: false, aliases: ["incline db", "incline dumbbell"] },
  { name: "Lateral raise", isBodyweight: false, aliases: ["lateral raises", "laterals"] },
  { name: "Deadlift", isBodyweight: false, aliases: ["deadlifts"] },
  { name: "Pull-up", isBodyweight: true, aliases: ["pull ups", "pullups"] },
  { name: "Barbell row", isBodyweight: false, aliases: ["row", "rows"] },
  { name: "Squat", isBodyweight: false, aliases: ["squats", "back squat"] },
  { name: "Romanian deadlift", isBodyweight: false, aliases: ["rdl", "rdls"] },
  { name: "Leg press", isBodyweight: false, aliases: [] },
];

const WORKOUTS: readonly (readonly Lift[])[] = [
  [
    { exercise: "Bench press", sets: 4, reps: [5, 8], lb: 165, addLb: 5, addReps: 0, every: 14 },
    { exercise: "Overhead press", sets: 3, reps: [6, 8], lb: 95, addLb: 5, addReps: 0, every: 21 },
    { exercise: "Incline dumbbell press", sets: 3, reps: [8, 10], lb: 50, addLb: 5, addReps: 0, every: 30 },
    { exercise: "Lateral raise", sets: 3, reps: [12, 15], lb: 20, addLb: 5, addReps: 0, every: 45 },
  ],
  [
    { exercise: "Deadlift", sets: 3, reps: [4, 5], lb: 245, addLb: 10, addReps: 0, every: 14 },
    { exercise: "Pull-up", sets: 4, reps: [6, 9], lb: 0, addLb: 0, addReps: 1, every: 30 },
    { exercise: "Barbell row", sets: 3, reps: [8, 10], lb: 135, addLb: 5, addReps: 0, every: 14 },
  ],
  [
    { exercise: "Squat", sets: 4, reps: [5, 8], lb: 205, addLb: 10, addReps: 0, every: 14 },
    { exercise: "Romanian deadlift", sets: 3, reps: [8, 10], lb: 155, addLb: 10, addReps: 0, every: 21 },
    { exercise: "Leg press", sets: 3, reps: [10, 12], lb: 270, addLb: 20, addReps: 0, every: 14 },
  ],
];

const SKIP_REASONS = new Map([
  [17, "Stuck at work late and the gym had closed"],
  [38, "Came down with a cold and stayed in bed"],
  [55, "Away for a wedding and the hotel had no gym"],
  [71, "Car broke down on the way to the gym"],
  [84, "Slept through the alarm and ran out of time"],
]);
const SKIPS_FROM_LOCK = new Set([38, 71]);
const AWAY_FROM_SCALE = new Set([54, 55, 56]);
const TRAINED_DAYS_BEFORE_REST = 6;
const SETS_LOGGED_TODAY = 8;
const OUTLIER_DAYS_AGO = 12;
const OUTLIER_KG = 58.6;
const MINUTE_MS = 60_000;

const ADDONS = [
  { name: "Creatine", periods: [{ details: "5 g daily", from: 0, to: null }] },
  {
    name: "Preworkout",
    periods: [
      { details: "1 scoop", from: 8, to: 41 },
      { details: "2 scoops", from: 42, to: 70 },
    ],
  },
  {
    name: "Cardio",
    periods: [
      { details: "20 min incline walk", from: 30, to: 74 },
      { details: "30 min incline walk", from: 75, to: null },
    ],
  },
] as const;

export function aliasesOf({ name, aliases }: SeedExercise): string[] {
  return [normalizeAlias(name), ...aliases];
}

function exerciseNamed(name: string): SeedExercise {
  const exercise = EXERCISES.find((entry) => entry.name === name);
  if (!exercise) {
    throw new Error(`No seed exercise is named ${name}`);
  }
  return exercise;
}

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

// The fake owner's time zone is UTC, so a clock time on a day is that UTC time. Nothing lands after `now`.
function clockTime(day: string, minutes: number, now: Date): string {
  const at = Date.parse(`${day}T00:00:00Z`) + minutes * MINUTE_MS;
  return new Date(Math.min(at, now.getTime() - MINUTE_MS)).toISOString();
}

function schedule(today: string): PlannedDay[] {
  const days: PlannedDay[] = [];
  let trainedInARow = 0;
  for (const [index, day] of dayRange(addDays(today, 1 - DAYS), today).entries()) {
    if (day !== today && SKIP_REASONS.has(index)) {
      days.push({ day, index, kind: "skip" });
      trainedInARow = 0;
    } else if (day !== today && trainedInARow >= TRAINED_DAYS_BEFORE_REST) {
      days.push({ day, index, kind: "rest" });
      trainedInARow = 0;
    } else {
      days.push({ day, index, kind: "trained" });
      trainedInARow += 1;
    }
  }
  return days;
}

function spoken(exercise: string, load: number, reps: number, random: Random): string {
  const name = pick(aliasesOf(exerciseNamed(exercise)), random);
  if (load === 0) {
    return `${name} ${reps} reps`;
  }
  return pick([`${name} ${load} for ${reps}`, `${name} ${load} x ${reps}`, `${name} ${load} lbs ${reps} reps`], random);
}

function liftSets(day: string, index: number, lift: Lift, random: Random): Omit<PlannedSet, "created_at">[] {
  const steps = Math.floor(index / lift.every);
  const load = lift.lb + lift.addLb * steps;
  const [fewest, most] = lift.reps.map((reps) => reps + lift.addReps * steps);
  const sets: Omit<PlannedSet, "created_at">[] = [];
  let reps = fewest + Math.floor(random() * (most - fewest + 1));
  for (let set = 0; set < lift.sets; set += 1) {
    const raw_input = spoken(lift.exercise, load, reps, random);
    sets.push({ day, exercise: lift.exercise, load_value: load, load_unit: "lb", reps, raw_input });
    reps = Math.max(fewest, reps - (random() < 0.5 ? 1 : 0));
  }
  return sets;
}

function plannedSets(days: readonly PlannedDay[], today: string, now: Date, random: Random): PlannedSet[] {
  return days
    .filter(({ kind }) => kind === "trained")
    .flatMap(({ day, index }, session) => {
      const workout = WORKOUTS[session % WORKOUTS.length].flatMap((lift) => liftSets(day, index, lift, random));
      const logged = day === today ? workout.slice(0, SETS_LOGGED_TODAY) : workout;
      const firstAt =
        day === today ? now.getTime() - logged.length * 3 * MINUTE_MS : Date.parse(`${day}T18:00:00Z`);
      return logged.map((set, order) => ({
        ...set,
        created_at: new Date(firstAt + order * 3 * MINUTE_MS).toISOString(),
      }));
    });
}

function weighIns(days: readonly PlannedDay[], today: string, now: Date, random: Random): PlannedWeighIn[] {
  const readings: PlannedWeighIn[] = [];
  for (const { day, index } of days) {
    const kg = 84.2 - (3.6 * index) / (DAYS - 1) + (random() - 0.5) * 0.8;
    const measuredAt = clockTime(day, 6 * 60 + 30 + Math.floor(random() * 40), now);
    if (AWAY_FROM_SCALE.has(index)) {
      const lb = Math.round((kg / KG_PER_LB) * 10) / 10;
      readings.push({ day, measured_at: measuredAt, value: lb, unit: "lb", source: "manual" });
      continue;
    }
    if (day !== today && random() < 0.07) {
      continue;
    }
    const reading = { day, measured_at: measuredAt, value: Math.round(kg * 20) / 20, unit: "kg", source: "scale" } as const;
    readings.push(reading);
    if (random() < 0.25) {
      readings.push({ ...reading, measured_at: new Date(Date.parse(measuredAt) + 40_000).toISOString(), flag: "duplicate" });
    }
  }
  const outlierDay = addDays(today, -OUTLIER_DAYS_AGO);
  const outlierAt = clockTime(outlierDay, 19 * 60 + 42, now);
  readings.push({ day: outlierDay, measured_at: outlierAt, value: OUTLIER_KG, unit: "kg", source: "scale", flag: "outlier" });
  return readings;
}

function dayMarks(days: readonly PlannedDay[]): TablesInsert<"day_marks">[] {
  return days.flatMap(({ day, index, kind }): TablesInsert<"day_marks">[] =>
    kind === "trained"
      ? []
      : [
          {
            day,
            kind,
            reason: SKIP_REASONS.get(index) ?? null,
            resolved_via: SKIPS_FROM_LOCK.has(index) ? "lock" : "normal",
          },
        ],
  );
}

function photos(days: readonly PlannedDay[], today: string, now: Date, random: Random): PlannedPhoto[] {
  return days
    .filter(({ day }) => day === today || random() < 0.85)
    .map(({ day, index }) => ({
      day,
      variant: Math.floor((index * PHOTO_VARIANTS) / DAYS),
      takenAt: clockTime(day, 7 * 60 + 10 + Math.floor(random() * 20), now),
    }));
}

export function seedPlan(now: Date, random: Random = Math.random): SeedPlan {
  const today = trainingDay(now, TIME_ZONE, ROLLOVER_HOUR);
  const days = schedule(today);
  const startDate = days[0].day;
  return {
    today,
    startDate,
    weighIns: weighIns(days, today, now, random),
    dayMarks: dayMarks(days),
    sets: plannedSets(days, today, now, random),
    photos: photos(days, today, now, random),
    addons: ADDONS.map(({ name, periods }) => ({
      name,
      periods: periods.map(({ details, from, to }) => ({
        details,
        start_day: addDays(startDate, from),
        end_day: to === null ? null : addDays(startDate, to),
      })),
    })),
  };
}
