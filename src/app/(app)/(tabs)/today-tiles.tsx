import Link from "next/link";
import { CheckIcon } from "@/components/check-icon";
import { StatusMark } from "@/components/status-mark";
import type { DayStatus } from "@/rules/day-status";

const tileClass = "flex h-[104px] flex-col justify-between rounded-card p-3";
const todoClass = `${tileClass} border border-dashed border-border-todo bg-surface-todo`;
const doneClass = `${tileClass} border border-border bg-surface`;

export function PhotoTile({ time }: { time: string | null }) {
  if (!time) {
    return (
      <Link href="/photo" className={todoClass}>
        <span className="caps-label text-xs">Photo</span>
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-accent"
        >
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        <span className="text-[15px] font-semibold text-accent">Take photo</span>
      </Link>
    );
  }
  return (
    <Link href="/photo" aria-label={`Photo, taken at ${time}. Tap to retake.`} className={doneClass}>
      <span className="flex items-center justify-between">
        <span className="caps-label text-xs">Photo</span>
        <CheckIcon />
      </span>
      <span className="font-condensed text-[22px] leading-none font-semibold">Taken</span>
      <span className="text-xs text-label">{time}</span>
    </Link>
  );
}

const MARKED = {
  rest: { title: "Rest", note: "Rest day" },
  skipped: { title: "Skipped", note: "Reason logged" },
};

type WorkoutProps = { status: DayStatus | null; setCount: number; exerciseCount: number };

export function WorkoutTile({ status, setCount, exerciseCount }: WorkoutProps) {
  if (status !== "trained" && status !== "rest" && status !== "skipped") {
    return (
      <Link href="/log" className={todoClass}>
        <span className="caps-label text-xs">Workout</span>
        <span className="font-condensed text-[22px] leading-none font-semibold">Not yet</span>
        <span className="text-[15px] font-semibold text-accent">Log sets</span>
      </Link>
    );
  }
  const sets = `${setCount} ${setCount === 1 ? "set" : "sets"}`;
  const exercises = `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`;
  return (
    <Link
      href="/log"
      aria-label={status === "trained" ? `Workout, ${sets} of ${exercises}.` : `Workout, ${MARKED[status].note}.`}
      className={doneClass}
    >
      <span className="flex items-center justify-between">
        <span className="caps-label text-xs">Workout</span>
        <StatusMark status={status} />
      </span>
      {status === "trained" ? (
        <span className="font-condensed text-[30px] leading-none font-bold">
          {setCount}
          <span className="ml-[3px] text-[15px] font-semibold text-text-2">{setCount === 1 ? "set" : "sets"}</span>
        </span>
      ) : (
        <span className="font-condensed text-[22px] leading-none font-semibold">{MARKED[status].title}</span>
      )}
      <span className="text-xs text-label">{status === "trained" ? exercises : MARKED[status].note}</span>
    </Link>
  );
}
