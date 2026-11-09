import Link from "next/link";
import { StatusMark } from "@/components/status-mark";
import type { DayStatus } from "@/rules/day-status";
import { formatShortDate } from "@/rules/format";

type Props = {
  day: string;
  inMonth: boolean;
  status: DayStatus | null;
  tracked: boolean;
  isToday: boolean;
  weight: string | null;
  unit: string;
};

const STATUS_WORDS: Partial<Record<DayStatus, string>> = { trained: "trained", rest: "rest", skipped: "skipped" };

export function CalendarCell({ day, inMonth, status, tracked, isToday, weight, unit }: Props) {
  const number = Number(day.slice(8));
  if (!inMonth) {
    return (
      <div aria-hidden="true" className="relative h-[84px] rounded-lg bg-surface-todo">
        <span className="absolute top-[5px] left-1.5 font-condensed text-[13px] leading-none font-semibold text-border-todo">
          {number}
        </span>
      </div>
    );
  }

  const label = [
    formatShortDate(day),
    status && STATUS_WORDS[status],
    weight && `${weight} ${unit}`,
    tracked && "no photo",
  ]
    .filter(Boolean)
    .join(", ");
  const content = (
    <>
      {tracked && <span aria-hidden="true" className="absolute inset-0 rounded-lg border border-dashed border-border-todo" />}
      <span className="absolute top-[5px] left-1.5 font-condensed text-[13px] leading-none font-semibold">{number}</span>
      <StatusMark status={status} className="absolute top-1.5 right-1.5" />
      {weight && (
        <span className="absolute inset-x-0 bottom-0 h-5 bg-bg/85 text-center font-condensed text-xs leading-5 font-semibold">
          {weight}
        </span>
      )}
      {isToday && <span aria-hidden="true" className="absolute inset-0 rounded-lg border-2 border-accent" />}
    </>
  );
  const className = "relative block h-[84px] overflow-hidden rounded-lg bg-surface";
  return tracked ? (
    <Link href={`/day/${day}`} aria-label={label} className={className}>
      {content}
    </Link>
  ) : (
    <div aria-label={label} className={className}>
      {content}
    </div>
  );
}
