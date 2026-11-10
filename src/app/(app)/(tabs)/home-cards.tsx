import Link from "next/link";
import { Chip } from "@/components/chip";
import { DayStrip } from "@/components/day-strip";
import type { Enums } from "@/database.types";
import type { Home } from "./read-home";
import { WeightChart } from "./weight-chart";

const cardClass = "flex flex-col rounded-card border border-border bg-surface p-4";

function ChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-label">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[#6b6a66]" />
        Daily
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-[3px] w-3.5 rounded-sm bg-accent" />
        7-day average
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-text" />
        Today
      </span>
    </div>
  );
}

export function WeightCard({ trend, unit }: { trend: Home["trend"]; unit: Enums<"weight_unit"> }) {
  const hasData = trend.points.some((point) => point.kg !== null || point.averageKg !== null);
  return (
    <section aria-labelledby="weight-title" className={`${cardClass} gap-2.5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="weight-title" className="caps-label text-[13px]">
          Weight · 14 days
        </h2>
        {trend.average && (
          <span className="text-[13px] text-label">
            7-day avg{" "}
            <span className="font-semibold text-text">
              {trend.average} {unit}
            </span>
          </span>
        )}
      </div>
      {trend.change ? (
        <div className="flex items-baseline gap-3">
          <span className="font-condensed text-5xl leading-none font-bold">
            {trend.change}
            <span className="ml-1 text-xl font-semibold text-text-2">{unit}</span>
          </span>
          <span className="text-[15px] text-text-2">
            {trend.perWeek} {unit} per week
          </span>
        </div>
      ) : (
        <p className="text-[15px] text-text-2">
          {hasData ? "The change shows once there are weigh-ins from two weeks ago." : "No weigh-ins in the last two weeks."}
        </p>
      )}
      {hasData && (
        <>
          <WeightChart points={trend.points} unit={unit} />
          <ChartLegend />
        </>
      )}
    </section>
  );
}

export function StrengthCard({ strength }: { strength: Home["strength"] }) {
  return (
    <section aria-labelledby="strength-title" className={`${cardClass} gap-3`}>
      <h2 id="strength-title" className="caps-label text-[13px]">
        Strength · 4 wk
      </h2>
      {strength.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {strength.map((change) => (
            <li key={change.exerciseId} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 text-[15px] leading-tight break-words">{change.name}</span>
              <span className="font-condensed text-xl font-bold">{change.percent}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-2">Needs sets from this week and from 3 weeks ago.</p>
      )}
      <p className="mt-auto text-xs leading-[1.35] text-label">Change in top set, estimated 1RM</p>
    </section>
  );
}

export function ConsistencyCard({ consistency }: { consistency: Home["consistency"] }) {
  const { strip, trained, restFree, skips, month } = consistency;
  return (
    <section aria-labelledby="consistency-title" className={`${cardClass} gap-3`}>
      <h2 id="consistency-title" className="caps-label text-[13px]">
        Consistency
      </h2>
      <div className="flex items-baseline gap-1.5">
        <span className="font-condensed text-[44px] leading-none font-bold">{trained}</span>
        <span className="text-[15px] text-text-2">of last 7</span>
      </div>
      <DayStrip days={strip} size="compact" />
      <div className="flex flex-col gap-1">
        <span className={`text-sm font-semibold ${restFree ? "text-accent" : "text-text-2"}`}>
          {restFree ? "Rest unlocked" : "Rest locked"}
        </span>
        <span className="text-xs text-label">
          {skips} {skips === 1 ? "skip" : "skips"} in {month}
        </span>
      </div>
    </section>
  );
}

export function AddonsCard({ addons }: { addons: Home["addons"] }) {
  return (
    <Link href="/addons" className={`${cardClass} gap-3`}>
      <span className="flex items-center justify-between">
        <span className="caps-label text-[13px]">Active add-ons</span>
        <span className="flex items-center gap-0.5 text-[13px] text-text-2">
          Manage
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        {addons.map((addon) => (
          <Chip key={addon.id} label={addon.name} note={`day ${addon.day}`} />
        ))}
      </span>
    </Link>
  );
}
