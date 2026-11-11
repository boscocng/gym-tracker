import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../src/database.types.ts";
import { requireEnv } from "../src/server/env.ts";
import { PHOTO_BUCKET } from "../src/server/photos.ts";
import {
  aliasesOf,
  EXERCISES,
  PHOTO_VARIANTS,
  type PlannedAddon,
  type PlannedPhoto,
  type PlannedSet,
  ROLLOVER_HOUR,
  seedPlan,
  TIME_ZONE,
} from "./seed-plan.mts";

const OWNER = { email: "owner@example.com", password: "local-only-password" };

process.loadEnvFile(".env.local");
const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  console.error(`Refusing to seed ${url}: npm run seed only runs against the local Supabase stack.`);
  process.exit(1);
}
const supabase = createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });

function check(result: { error: unknown }): void {
  if (result.error) {
    throw result.error;
  }
}

function idOf(ids: ReadonlyMap<string, number>, name: string): number {
  const id = ids.get(name);
  if (id === undefined) {
    throw new Error(`${name} wasn't created`);
  }
  return id;
}

async function insertExercises(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("exercises")
    .insert(EXERCISES.map(({ name, isBodyweight }) => ({ name, is_bodyweight: isBodyweight })))
    .select("id, name");
  if (error) {
    throw error;
  }
  const ids = new Map(data.map(({ id, name }) => [name, id]));
  const aliases = EXERCISES.flatMap((exercise) =>
    aliasesOf(exercise).map((alias) => ({ alias, exercise_id: idOf(ids, exercise.name) })),
  );
  check(await supabase.from("exercise_aliases").insert(aliases));
  return ids;
}

async function insertSets(sets: readonly PlannedSet[], exerciseIds: ReadonlyMap<string, number>): Promise<void> {
  const rows = sets.map(({ exercise, ...set }) => ({ ...set, exercise_id: idOf(exerciseIds, exercise) }));
  check(await supabase.from("sets").insert(rows));
}

async function uploadPhotos(photos: readonly PlannedPhoto[]): Promise<void> {
  const files = await Promise.all(
    Array.from({ length: PHOTO_VARIANTS }, async (_, variant) => ({
      photo: await readFile(new URL(`./seed-photos/placeholder-${variant + 1}.jpg`, import.meta.url)),
      thumb: await readFile(new URL(`./seed-photos/placeholder-${variant + 1}-thumb.jpg`, import.meta.url)),
    })),
  );
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const rows: TablesInsert<"photos">[] = [];
  for (const { day, pose, variant, takenAt } of photos) {
    const id = randomUUID();
    const paths = { storage_path: `${day}/${id}.jpg`, thumb_path: `${day}/${id}-thumb.jpg` };
    const uploads = await Promise.all([
      bucket.upload(paths.storage_path, files[variant].photo, { contentType: "image/jpeg" }),
      bucket.upload(paths.thumb_path, files[variant].thumb, { contentType: "image/jpeg" }),
    ]);
    uploads.forEach(check);
    rows.push({ day, pose, ...paths, taken_at: takenAt });
  }
  check(await supabase.from("photos").insert(rows));
}

async function insertAddons(addons: readonly PlannedAddon[]): Promise<void> {
  const { data, error } = await supabase
    .from("addons")
    .insert(addons.map(({ name }) => ({ name })))
    .select("id, name");
  if (error) {
    throw error;
  }
  const ids = new Map(data.map(({ id, name }) => [name, id]));
  const periods = addons.flatMap(({ name, periods: planned }) =>
    planned.map((period) => ({ ...period, addon_id: idOf(ids, name) })),
  );
  check(await supabase.from("addon_periods").insert(periods));
}

const { data: created, error: userError } = await supabase.auth.admin.createUser({
  email: OWNER.email,
  password: OWNER.password,
  email_confirm: true,
});
if (userError) {
  console.error(`Couldn't create ${OWNER.email}: ${userError.message}. Run npx supabase db reset to start over.`);
  process.exit(1);
}

const plan = seedPlan(new Date());
check(
  await supabase.from("settings").insert({
    owner_id: created.user.id,
    unit: "lb",
    time_zone: TIME_ZONE,
    rollover_hour: ROLLOVER_HOUR,
    start_date: plan.startDate,
  }),
);
const exerciseIds = await insertExercises();
check(await supabase.from("weigh_ins").insert(plan.weighIns));
check(await supabase.from("day_marks").insert(plan.dayMarks));
await insertSets(plan.sets, exerciseIds);
await uploadPhotos(plan.photos);
await insertAddons(plan.addons);

const restDays = plan.dayMarks.filter((mark) => mark.kind === "rest").length;
console.log(
  `Seeded ${OWNER.email} (password: ${OWNER.password}) with fake data from ${plan.startDate} to ${plan.today}: ` +
    `${plan.sets.length} sets, ${plan.weighIns.length} weigh-ins, ${restDays} rest days, ` +
    `${plan.dayMarks.length - restDays} skips, ${plan.photos.length} photos and ${plan.addons.length} add-ons.`,
);
