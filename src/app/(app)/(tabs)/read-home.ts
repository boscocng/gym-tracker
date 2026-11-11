import { addonOverview } from "@/rules/addons";
import { monthName } from "@/rules/calendar";
import { dayStatus, restCheck, skipsThisMonth } from "@/rules/day-status";
import { addDays } from "@/rules/days";
import { formatClock } from "@/rules/format";
import { strengthChanges } from "@/rules/strength";
import { formatChange, formatWeight, fromKg, weightIn } from "@/rules/units";
import { dailyWeights, weightTrend } from "@/rules/weigh-in";
import { readAddons } from "@/server/addons";
import { readAll, readDayHistory } from "@/server/days";
import type { OwnerSettings } from "@/server/settings";
import type { SessionClient } from "@/server/supabase";

async function readRecent(supabase: SessionClient, settings: OwnerSettings, today: string) {
  const windowStart = addDays(today, -27);
  const weekStart = addDays(today, -7);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [readings, sets, history, photo, addons] = await Promise.all([
    supabase
      .from("weigh_ins")
      .select("day, measured_at, value, unit, kg, source, flag")
      .gte("day", windowStart)
      .lte("day", today),
    readAll((from, to) =>
      supabase
        .from("sets")
        .select("day, exercise_id, load_kg, reps, exercises(name, is_bodyweight)")
        .gte("day", windowStart)
        .lte("day", today)
        .order("id")
        .range(from, to),
    ),
    readDayHistory(supabase, settings.start_date, monthStart < weekStart ? monthStart : weekStart, today),
    supabase.from("photos").select("taken_at").eq("day", today).eq("pose", "front").maybeSingle(),
    readAddons(supabase),
  ]);
  if (readings.error || photo.error) {
    throw readings.error ?? photo.error;
  }
  const weights = dailyWeights(
    readings.data.map((reading) => ({ ...reading, measuredAt: new Date(reading.measured_at) })),
  );
  return { weights, sets, history, photo: photo.data, addons };
}

export async function readHome(supabase: SessionClient, settings: OwnerSettings, today: string) {
  const { weights, sets, history, photo, addons } = await readRecent(supabase, settings, today);
  const { unit, time_zone: timeZone } = settings;
  const dailyKg = new Map([...weights].map(([day, reading]) => [day, reading.kg]));
  const weight = weights.get(today);
  const trend = weightTrend(today, dailyKg);
  const strength = strengthChanges(
    today,
    sets.map((set) => ({
      day: set.day,
      exerciseId: set.exercise_id,
      name: set.exercises.name,
      isBodyweight: set.exercises.is_bodyweight,
      loadKg: set.load_kg,
      reps: set.reps,
    })),
    dailyKg,
  );
  const todaySets = sets.filter((set) => set.day === today);
  const rest = restCheck(today, today, settings.rest_rule, history);

  return {
    weighIn: weight
      ? { value: formatWeight(weightIn(unit, weight)), source: weight.source, time: formatClock(weight.measuredAt, timeZone) }
      : null,
    photoTime: photo ? formatClock(new Date(photo.taken_at), timeZone) : null,
    workout: {
      status: dayStatus(today, today, history),
      setCount: todaySets.length,
      exerciseCount: new Set(todaySets.map((set) => set.exercise_id)).size,
    },
    trend: {
      points: trend.points,
      average: trend.averageKg === null ? null : formatWeight(fromKg(unit, trend.averageKg)),
      change: trend.changeKg === null ? null : formatChange(fromKg(unit, trend.changeKg)),
      perWeek: trend.perWeekKg === null ? null : formatWeight(Math.abs(fromKg(unit, trend.perWeekKg))),
    },
    strength: strength.map((change) => ({ ...change, percent: `${formatChange(change.percent)}%` })),
    addons: addonOverview(addons, today).active.map(({ id, name, day }) => ({ id, name, day })),
    consistency: {
      strip: rest.strip,
      trained: rest.strip.filter((day) => day.status === "trained").length,
      restFree: rest.free,
      skips: skipsThisMonth(today, history),
      month: monthName(today.slice(0, 7)),
    },
  };
}

export type Home = Awaited<ReturnType<typeof readHome>>;
