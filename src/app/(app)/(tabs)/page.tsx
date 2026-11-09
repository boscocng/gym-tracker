import Link from "next/link";
import { formatDayLabel } from "@/rules/format";
import { trainingDay } from "@/rules/training-day";
import { dayWeight } from "@/rules/weigh-in";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { WeighInTile } from "./weigh-in-tile";

export default async function HomePage() {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);

  const supabase = await createSessionClient();
  const { data: readings, error } = await supabase
    .from("weigh_ins")
    .select("measured_at, value, unit, kg, source, flag")
    .eq("day", today);
  if (error) {
    throw error;
  }
  const weight = dayWeight(readings.map((reading) => ({ ...reading, measuredAt: new Date(reading.measured_at) })));

  return (
    <main className="flex flex-col gap-5 px-4 pt-safe pb-5">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="caps-label text-[13px]">{formatDayLabel(today)}</span>
          <h1 className="font-condensed text-[40px] leading-none font-bold">Today</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex size-11 flex-none items-center justify-center rounded-icon border border-border bg-surface"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="9" cy="17" r="2" />
          </svg>
        </Link>
      </header>

      <section aria-label="Today's checklist" className="grid grid-cols-3 gap-2">
        <WeighInTile weight={weight} unit={settings.unit} timeZone={settings.time_zone} />
      </section>
    </main>
  );
}
