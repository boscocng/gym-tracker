import Link from "next/link";
import { StatusMark } from "@/components/status-mark";
import { isMonth, monthName, shiftMonth } from "@/rules/calendar";
import type { DayStatus } from "@/rules/day-status";
import { trainingDay } from "@/rules/training-day";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { CalendarCell } from "./calendar-cell";
import { readMonth } from "./read-month";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function MonthLink({ month, label, direction }: { month: string | null; label: string; direction: -1 | 1 }) {
  const className =
    "flex size-11 items-center justify-center rounded-icon border border-border bg-surface aria-disabled:opacity-30";
  const icon = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === -1 ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
  return month ? (
    <Link href={`/calendar?month=${month}`} aria-label={label} className={className}>
      {icon}
    </Link>
  ) : (
    <span role="link" aria-label={label} aria-disabled="true" className={className}>
      {icon}
    </span>
  );
}

const LEGEND_LABELS = { trained: "Trained", rest: "Rest", skipped: "Skipped" } as const;

function Legend({ count, noPhoto }: { count: (status: DayStatus) => number; noPhoto: number }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-[18px] gap-y-2.5 text-sm text-text-2">
      {(Object.keys(LEGEND_LABELS) as (keyof typeof LEGEND_LABELS)[]).map((status) => (
        <span key={status} className="flex items-center gap-2">
          <StatusMark status={status} className="size-[9px]" />
          {LEGEND_LABELS[status]} <strong className="font-semibold text-text">{count(status)}</strong>
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="h-3 w-2.5 rounded-[3px] border border-dashed border-label" />
        No photo <strong className="font-semibold text-text">{noPhoto}</strong>
      </span>
    </div>
  );
}

export default async function CalendarPage({ searchParams }: Props) {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const requested = (await searchParams).month;
  const month = typeof requested === "string" && isMonth(requested) ? requested : today.slice(0, 7);
  const cells = await readMonth(await createSessionClient(), settings, month, today);
  const count = (status: DayStatus) => cells.filter((cell) => cell.status === status).length;
  const noPhoto = cells.filter((cell) => cell.tracked && !cell.thumbUrl).length;

  return (
    <main className="flex flex-col gap-2 px-4 pt-safe pb-4">
      <header className="flex items-end justify-between gap-3 pb-2.5">
        <div className="flex flex-col gap-1.5">
          <span className="caps-label text-[13px]">{month.slice(0, 4)}</span>
          <h1 className="font-condensed text-[40px] leading-none font-bold">{monthName(month)}</h1>
        </div>
        <div className="flex gap-2">
          <MonthLink
            month={month > settings.start_date.slice(0, 7) ? shiftMonth(month, -1) : null}
            label="Previous month"
            direction={-1}
          />
          <MonthLink month={month < today.slice(0, 7) ? shiftMonth(month, 1) : null} label="Next month" direction={1} />
        </div>
      </header>

      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 text-center font-condensed text-xs font-semibold tracking-[0.06em] text-label"
      >
        {["M", "T", "W", "T", "F", "S", "S"].map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <CalendarCell key={cell.day} {...cell} unit={settings.unit} />
        ))}
      </div>

      <Legend count={count} noPhoto={noPhoto} />
    </main>
  );
}
