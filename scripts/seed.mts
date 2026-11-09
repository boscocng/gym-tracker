import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/database.types.ts";
import { trainingDay } from "../src/rules/training-day.ts";

const OWNER = { email: "owner@example.com", password: "local-only-password" };
const TIME_ZONE = "UTC";
const ROLLOVER_HOUR = 4;
const DAYS = 14;
const DAY_MS = 86_400_000;
const FAKE_WEIGHTS_KG = [81.4, 81.2, 81.5, 81.0, 80.9, 81.1, 80.7, 80.8, 80.5, 80.6, 80.3, 80.4, 80.1, 80.0];

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  console.error(`Refusing to seed ${url}: npm run seed only runs against the local Supabase stack.`);
  process.exit(1);
}

const supabase = createClient<Database>(url, secretKey, { auth: { persistSession: false } });

const { data: created, error: userError } = await supabase.auth.admin.createUser({
  email: OWNER.email,
  password: OWNER.password,
  email_confirm: true,
});
if (userError) {
  console.error(`Couldn't create ${OWNER.email}: ${userError.message}. Run npx supabase db reset to start over.`);
  process.exit(1);
}

const now = Date.now();
const { error: settingsError } = await supabase.from("settings").insert({
  owner_id: created.user.id,
  unit: "lb",
  time_zone: TIME_ZONE,
  rollover_hour: ROLLOVER_HOUR,
  start_date: trainingDay(new Date(now - (DAYS - 1) * DAY_MS), TIME_ZONE, ROLLOVER_HOUR),
});
if (settingsError) {
  throw settingsError;
}

const weighIns = FAKE_WEIGHTS_KG.map((kg, index) => {
  const measuredAt = new Date(now - (DAYS - 1 - index) * DAY_MS - 30 * 60_000);
  return {
    measured_at: measuredAt.toISOString(),
    day: trainingDay(measuredAt, TIME_ZONE, ROLLOVER_HOUR),
    value: kg,
    unit: "kg" as const,
    source: "scale" as const,
  };
});
const { error: weighInError } = await supabase.from("weigh_ins").insert(weighIns);
if (weighInError) {
  throw weighInError;
}

console.log(`Seeded ${OWNER.email} (password: ${OWNER.password}) with ${DAYS} days of fake weigh-ins.`);
