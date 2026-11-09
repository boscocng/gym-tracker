import type { Tables } from "@/database.types";
import { formatClock, formatRelativeDay } from "@/rules/format";
import { trainingDay } from "@/rules/training-day";
import { formatWeight, weightIn } from "@/rules/units";
import { isScaleStale } from "@/rules/weigh-in";
import { createSessionClient } from "@/server/supabase";

type Props = {
  settings: Pick<Tables<"settings">, "unit" | "time_zone" | "rollover_hour">;
};

export async function ScaleStatus({ settings }: Props) {
  const supabase = await createSessionClient();
  const { data: last, error } = await supabase
    .from("weigh_ins")
    .select("measured_at, day, value, unit, kg")
    .eq("source", "scale")
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }

  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const stale = isScaleStale(last?.day ?? null, today);

  return (
    <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2.5">
      <span className="flex flex-col gap-[3px]">
        <span className="text-base">Scale</span>
        <span className="text-[13px] text-label">
          {last ? `Last reading ${formatWeight(weightIn(settings.unit, last))} ${settings.unit}` : "No readings yet"}
        </span>
      </span>
      {last && (
        <span className={`text-right text-sm font-semibold ${stale ? "text-error-text" : "text-text-2"}`}>
          {formatRelativeDay(last.day, today)}, {formatClock(new Date(last.measured_at), settings.time_zone)}
        </span>
      )}
    </div>
  );
}
