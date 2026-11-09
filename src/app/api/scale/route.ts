import { NextResponse } from "next/server";
import { z } from "zod";
import { trainingDay } from "@/rules/training-day";
import { classifyReading, OUTLIER_WINDOW_MS } from "@/rules/weigh-in";
import { requireEnv } from "@/server/env";
import { createSecretClient } from "@/server/supabase";
import { tokenMatches } from "@/server/token";

const MAX_BODY_BYTES = 1024;

const scaleReading = z.object({ weight_kg: z.number().min(20).max(300) });

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!tokenMatches(request.headers.get("x-scale-token"), requireEnv("SCALE_INGEST_TOKEN"))) {
    return fail(401, "unauthorized");
  }
  const length = request.headers.get("content-length");
  if (length === null) {
    return fail(411, "content-length required");
  }
  if (Number(length) > MAX_BODY_BYTES) {
    return fail(413, "body too large");
  }
  const body = scaleReading.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return fail(400, "expected {\"weight_kg\": number from 20 to 300}");
  }

  const supabase = createSecretClient();
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select("time_zone, rollover_hour")
    .maybeSingle();
  if (settingsError) {
    throw settingsError;
  }
  if (!settings) {
    return fail(503, "sign in to the app once before sending readings");
  }

  const now = new Date();
  const { data: recent, error: recentError } = await supabase
    .from("weigh_ins")
    .select("measured_at, kg, source, flag")
    .gte("measured_at", new Date(now.getTime() - OUTLIER_WINDOW_MS).toISOString());
  if (recentError) {
    throw recentError;
  }

  const kg = body.data.weight_kg;
  const flag = classifyReading(
    kg,
    now,
    recent.map((reading) => ({ ...reading, measuredAt: new Date(reading.measured_at) })),
  );
  const { data: stored, error: insertError } = await supabase
    .from("weigh_ins")
    .insert({
      measured_at: now.toISOString(),
      day: trainingDay(now, settings.time_zone, settings.rollover_hour),
      value: kg,
      unit: "kg",
      source: "scale",
      flag,
    })
    .select()
    .single();
  if (insertError) {
    throw insertError;
  }
  return NextResponse.json(stored, { status: flag === "duplicate" ? 200 : 201 });
}
