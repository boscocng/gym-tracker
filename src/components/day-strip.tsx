import type { DayStatus, StripDay } from "@/rules/day-status";
import { formatWeekday, formatWeekdayLetter } from "@/rules/format";

const SPOKEN: Record<DayStatus, string> = {
  trained: "trained",
  rest: "rest",
  skipped: "skipped",
  unresolved: "not logged",
  in_progress: "in progress",
};

function fill(status: DayStatus | null): string {
  if (status === "trained") {
    return "bg-accent text-on-accent";
  }
  if (status === "rest") {
    return "bg-rest";
  }
  if (status === "skipped") {
    return "border-[1.5px] border-text";
  }
  return "bg-surface-2";
}

const CELL_SIZES = { large: "h-10 rounded-[10px]", small: "h-7 rounded-lg", compact: "h-3.5 rounded-[4px]" };

export function DayStrip({ days, size }: { days: readonly StripDay[]; size: keyof typeof CELL_SIZES }) {
  const label = days
    .map(({ day, status }) => `${formatWeekday(day)} ${status ? SPOKEN[status] : "not tracked"}`)
    .join(", ");
  return (
    <div
      role="img"
      aria-label={`Last ${days.length} days: ${label}`}
      className={`grid grid-cols-7 ${size === "compact" ? "gap-1" : "gap-1.5"}`}
    >
      {days.map(({ day, status }) => (
        <span key={day} className="flex flex-col items-center gap-1.5">
          <span
            className={`flex w-full items-center justify-center ${CELL_SIZES[size]} ${fill(status)}`}
          >
            {size === "large" && status === "trained" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            )}
          </span>
          {size === "large" && (
            <span className="font-condensed text-[13px] font-semibold text-label">{formatWeekdayLetter(day)}</span>
          )}
        </span>
      ))}
    </div>
  );
}
