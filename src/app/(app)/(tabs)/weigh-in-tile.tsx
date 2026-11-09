import type { Enums } from "@/database.types";
import { formatClock } from "@/rules/format";
import { formatWeight, weightIn } from "@/rules/units";
import type { DayReading } from "@/rules/weigh-in";

type Props = {
  weight: DayReading | null;
  unit: Enums<"weight_unit">;
  timeZone: string;
};

const tileClass = "flex h-[104px] flex-col justify-between rounded-card p-3";

export function WeighInTile({ weight, unit, timeZone }: Props) {
  if (!weight) {
    return (
      <div className={`${tileClass} border border-dashed border-border-todo bg-surface-todo`}>
        <span className="caps-label text-xs">Weigh-in</span>
        <span className="font-condensed text-[22px] leading-none font-semibold">Not yet</span>
        <span className="text-xs text-label">Step on the scale</span>
      </div>
    );
  }

  return (
    <div className={`${tileClass} border border-border bg-surface`}>
      <span className="flex items-center justify-between">
        <span className="caps-label text-xs">Weigh-in</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-accent"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="font-condensed text-[30px] leading-none font-bold">
        {formatWeight(weightIn(unit, weight))}
        <span className="ml-[3px] text-[15px] font-semibold text-text-2">{unit}</span>
      </span>
      <span className="text-xs whitespace-nowrap text-label">
        {weight.source === "scale" ? "Scale" : "Manual"} · {formatClock(weight.measuredAt, timeZone)}
      </span>
    </div>
  );
}
