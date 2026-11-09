import Link from "next/link";
import { useId } from "react";
import { DayStrip } from "@/components/day-strip";
import type { RestCheck } from "@/rules/day-status";
import { formatDayLabel, formatShortDate, formatWeekday } from "@/rules/format";

export const MIN_REASON = 20;

type Props = {
  variant: "today" | "missed";
  day: string;
  extraDays: readonly string[];
  rest: RestCheck | null;
  backHref: string;
  reason: string;
  all: boolean;
  onReasonChange: (reason: string) => void;
  onAllChange: (all: boolean) => void;
  onContinue: () => void;
};

const textareaClass =
  "w-full resize-none rounded-control border-[1.5px] border-border-input bg-surface px-4 py-3.5 text-[17px] leading-[1.4] text-text outline-none focus:border-accent";

function coverage(extraDays: readonly string[]): string {
  if (extraDays.length === 1) {
    return `Also covers ${formatWeekday(extraDays[0])}, ${formatShortDate(extraDays[0])}`;
  }
  if (extraDays.length > 3) {
    return `Also covers the other ${extraDays.length} missed days`;
  }
  const dates = extraDays.map(formatShortDate);
  return `Also covers ${dates.slice(0, -1).join(", ")} and ${dates.at(-1)}`;
}

function Header({ variant, day, backHref }: Pick<Props, "variant" | "day" | "backHref">) {
  return (
    <header className="flex items-center justify-between px-3 pt-safe">
      <Link
        href={backHref}
        aria-label={variant === "today" ? "Close" : "Back"}
        className="flex size-11 items-center justify-center rounded-icon"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={variant === "today" ? "M6 6l12 12M18 6 6 18" : "m15 5-7 7 7 7"} />
        </svg>
      </Link>
      <span className="caps-label text-[13px]">{variant === "today" ? "Today" : `${formatDayLabel(day)} · Missed`}</span>
      <span aria-hidden="true" className="w-11" />
    </header>
  );
}

export function SkipReason(props: Props) {
  const { variant, day, extraDays, rest, reason, all } = props;
  const id = useId();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header variant={variant} day={day} backHref={props.backHref} />
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4">
        <h1 className="font-condensed text-[40px] leading-none font-bold">
          {variant === "today" ? "Not training today" : <label htmlFor={id}>What happened?</label>}
        </h1>
        {variant === "missed" && (
          <p className="-mt-1 text-[15px] leading-[1.45] text-text-2">
            {formatShortDate(day)} counts as a skip. Your reason goes on the calendar.
          </p>
        )}
        {rest && !rest.free && (
          <section className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-4">
            <DayStrip days={rest.strip} size="small" />
            <p className="text-[15px] leading-[1.45] text-text-2">
              <strong className="font-semibold text-text">
                {rest.trained} of the last {rest.days} days trained.
              </strong>{" "}
              A free rest day needs {rest.needed}, so today counts as a skip.
            </p>
          </section>
        )}
        <div className="flex flex-col gap-2">
          {variant === "today" && (
            <label htmlFor={id} className="caps-label text-[13px]">
              Why are you skipping?
            </label>
          )}
          <textarea
            id={id}
            rows={4}
            value={reason}
            onChange={(event) => props.onReasonChange(event.target.value)}
            maxLength={500}
            className={textareaClass}
          />
          <span className="text-[13px] text-label">
            At least {MIN_REASON} characters.{variant === "today" ? " It shows on your calendar." : ""}
          </span>
        </div>
        {extraDays.length > 0 && (
          <label className="flex min-h-[60px] items-center gap-3.5 rounded-control border border-border bg-surface px-4 py-3">
            <input
              type="checkbox"
              checked={all}
              onChange={(event) => props.onAllChange(event.target.checked)}
              className="size-[22px] flex-none accent-accent"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">
                Use this reason for {extraDays.length === 1 ? "both days" : `all ${extraDays.length + 1} days`}
              </span>
              <span className="text-[13px] text-label">{coverage(extraDays)}</span>
            </span>
          </label>
        )}
      </main>
      <div className="px-4 pt-4 pb-[max(env(safe-area-inset-bottom),24px)]">
        <button
          type="button"
          onClick={props.onContinue}
          disabled={reason.trim().length < MIN_REASON}
          className="h-14 w-full rounded-control bg-accent font-condensed text-xl font-bold tracking-[0.04em] text-on-accent uppercase disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
