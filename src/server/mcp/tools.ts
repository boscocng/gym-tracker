import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { addDays, isDay } from "@/rules/days";
import { trainingDay } from "@/rules/training-day";
import { dailyWeights } from "@/rules/weigh-in";
import { readAddons } from "@/server/addons";
import { readDayHistory } from "@/server/days";
import type { OwnerSettings } from "@/server/settings";
import { createSecretClient } from "@/server/supabase";
import {
  readCounts,
  readExercises,
  readPhotos,
  readReadings,
  readSets,
  readSettings,
  readSkipReasons,
  type SecretClient,
} from "./read";
import {
  addonReport,
  dayReport,
  type Exercise,
  exerciseHistory,
  findExercise,
  overviewReport,
  rangeError,
  setsReport,
  weightReport,
} from "./reports";

type Owner = { supabase: SecretClient; settings: OwnerSettings; today: string };

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const day = z.string().refine(isDay, "Use a date like 2026-11-09.");
const range = { from: day.describe("First day, YYYY-MM-DD"), to: day.describe("Last day, YYYY-MM-DD") };
const exerciseName = z.string().trim().min(1).max(60).describe("Exercise name or one of its aliases");

function json(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function failure(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function asOwner(run: (owner: Owner) => Promise<CallToolResult>): Promise<CallToolResult> {
  const supabase = createSecretClient();
  const settings = await readSettings(supabase);
  if (!settings) {
    return failure("The app has no owner yet. Sign in to it once to set it up.");
  }
  return run({ supabase, settings, today: trainingDay(new Date(), settings.time_zone, settings.rollover_hour) });
}

async function exerciseNamed(supabase: SecretClient, name: string): Promise<Exercise | string> {
  const { exercises, aliases } = await readExercises(supabase);
  const exercise = findExercise(name, exercises, aliases);
  return exercise ?? `No exercise matches "${name}". Exercises: ${exercises.map((entry) => entry.name).join(", ")}.`;
}

function getOverview(): Promise<CallToolResult> {
  return asOwner(async ({ supabase, settings, today }) => {
    const [history, counts, readings] = await Promise.all([
      readDayHistory(supabase, settings.start_date, settings.start_date, today),
      readCounts(supabase),
      readReadings(supabase, addDays(today, -20), today),
    ]);
    return json(overviewReport(settings, today, history, counts, readings));
  });
}

function getWeights({ from, to }: { from: string; to: string }): Promise<CallToolResult> {
  return asOwner(async ({ supabase, settings }) => {
    const problem = rangeError(from, to);
    return problem
      ? failure(problem)
      : json(weightReport(settings.unit, from, to, await readReadings(supabase, addDays(from, -6), to)));
  });
}

function getSets({ from, to, exercise }: { from: string; to: string; exercise?: string }): Promise<CallToolResult> {
  return asOwner(async ({ supabase, settings }) => {
    const problem = rangeError(from, to);
    if (problem) {
      return failure(problem);
    }
    const found = exercise ? await exerciseNamed(supabase, exercise) : undefined;
    if (typeof found === "string") {
      return failure(found);
    }
    return json(setsReport(settings.unit, await readSets(supabase, { from, to, exerciseId: found?.id })));
  });
}

function getExerciseHistory({ exercise }: { exercise: string }): Promise<CallToolResult> {
  return asOwner(async ({ supabase, settings }) => {
    const found = await exerciseNamed(supabase, exercise);
    if (typeof found === "string") {
      return failure(found);
    }
    const sets = await readSets(supabase, { exerciseId: found.id });
    const last = sets.at(-1);
    const readings = found.isBodyweight && last ? await readReadings(supabase, sets[0].day, last.day) : [];
    const bodyweightKg = new Map([...dailyWeights(readings)].map(([weighDay, reading]) => [weighDay, reading.kg]));
    return json(exerciseHistory(settings.unit, found, sets, bodyweightKg));
  });
}

function getDays({ from, to }: { from: string; to: string }): Promise<CallToolResult> {
  return asOwner(async ({ supabase, settings, today }) => {
    const problem = rangeError(from, to);
    if (problem) {
      return failure(problem);
    }
    const [history, skipReasons, photos] = await Promise.all([
      readDayHistory(supabase, settings.start_date, from, to),
      readSkipReasons(supabase, from, to),
      readPhotos(supabase, from, to),
    ]);
    return json(dayReport(from, to, today, history, skipReasons, photos));
  });
}

function getAddons(): Promise<CallToolResult> {
  return asOwner(async ({ supabase }) => json(addonReport(await readAddons(supabase))));
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_overview",
    {
      description:
        "Start here. Today's training day, when tracking started, the owner's unit and settings, how many days were trained, rest, skipped or unresolved, record counts, and the latest weight. A training day runs from the rollover hour to the next one in the owner's time zone, so a set logged at 1 am belongs to the day before.",
      annotations: READ_ONLY,
    },
    getOverview,
  );
  server.registerTool(
    "get_weights",
    {
      description:
        "Body weight for each day from `from` to `to` (at most 366 days), in `unit`, with its 7-day average. A day's weight is a manual entry if there is one, otherwise its first scale reading; duplicate broadcasts and other people's weigh-ins are excluded.",
      inputSchema: z.object(range),
      annotations: READ_ONLY,
    },
    getWeights,
  );
  server.registerTool(
    "get_sets",
    {
      description:
        "Every set logged from `from` to `to` (at most 366 days), grouped by day and exercise, optionally for one exercise. Loads are in `unit`. For bodyweight exercises the load is the weight added to bodyweight, so 0 means bodyweight only.",
      inputSchema: z.object({ ...range, exercise: exerciseName.optional() }),
      annotations: READ_ONLY,
    },
    getSets,
  );
  server.registerTool(
    "get_exercise_history",
    {
      description:
        "One exercise's whole history: for each day it was trained, the number of sets, the top set, and the estimated one-rep max (Epley). Bodyweight exercises add that day's bodyweight to the estimate.",
      inputSchema: z.object({ exercise: exerciseName }),
      annotations: READ_ONLY,
    },
    getExerciseHistory,
  );
  server.registerTool(
    "get_days",
    {
      description:
        "Each day from `from` to `to` (at most 366 days, limited to tracked days up to today): trained, rest, skipped (with the written reason), unresolved, or in_progress for today, whether a front progress photo exists, and back_photo on days that also have a back photo. Photos themselves are never shared.",
      inputSchema: z.object(range),
      annotations: READ_ONLY,
    },
    getDays,
  );
  server.registerTool(
    "get_addons",
    {
      description:
        "Every add-on period (supplements, cardio and other extras): name, details, and start and end day. Changing the details starts a new period, so the history shows when a dose or routine changed.",
      annotations: READ_ONLY,
    },
    getAddons,
  );
}
