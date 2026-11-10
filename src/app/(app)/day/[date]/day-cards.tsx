import Image from "next/image";
import Link from "next/link";
import { Chip } from "@/components/chip";
import { StatusMark } from "@/components/status-mark";
import type { DayStatus } from "@/rules/day-status";
import { formatShortDate, formatWeekday } from "@/rules/format";

const STATUS_LABELS: Record<DayStatus, string> = {
  trained: "Trained",
  rest: "Rest",
  skipped: "Skipped",
  in_progress: "Today",
  unresolved: "Not logged",
};

export function DayHeader({ date, status }: { date: string; status: DayStatus | null }) {
  return (
    <header className="flex items-center gap-2 px-4 pt-safe pb-3.5">
      <Link
        href={`/calendar?month=${date.slice(0, 7)}`}
        aria-label="Back to calendar"
        className="flex size-11 flex-none items-center justify-center rounded-icon border border-border bg-surface"
      >
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
          <path d="m15 5-7 7 7 7" />
        </svg>
      </Link>
      <div className="flex flex-1 flex-col gap-1 pl-1">
        <span className="caps-label text-[13px]">{formatWeekday(date)}</span>
        <h1 className="font-condensed text-[32px] leading-none font-bold">{formatShortDate(date)}</h1>
      </div>
      {status && (
        <span className="flex flex-none items-center gap-[7px] rounded-full border border-border bg-surface px-3 py-[7px] text-sm font-semibold">
          <StatusMark status={status} />
          {STATUS_LABELS[status]}
        </span>
      )}
    </header>
  );
}

export function DayPhoto({ date, photo }: { date: string; photo: { url: string; takenAt: string } }) {
  return (
    <figure className="relative overflow-hidden rounded-[20px] bg-surface">
      <Image
        src={photo.url}
        alt={`Photo for ${formatShortDate(date)}`}
        width={1080}
        height={1920}
        unoptimized
        className="block h-auto w-full"
      />
      <figcaption className="absolute top-3 left-3 rounded-full bg-bg/85 px-2.5 py-1.5 text-[13px]">
        Taken {photo.takenAt}
      </figcaption>
      <Link
        href={`/compare?b=${date}`}
        className="absolute right-3 bottom-3 flex h-11 items-center gap-2 rounded-icon border border-border-input bg-bg/88 px-4 text-[15px] font-semibold"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="7.5" height="14" rx="1.5" />
          <rect x="13.5" y="5" width="7.5" height="14" rx="1.5" />
        </svg>
        Compare
      </Link>
    </figure>
  );
}

type WeightProps = { weight: string | null; average: string | null; change: string | null; unit: string };

export function WeightCard({ weight, average, change, unit }: WeightProps) {
  return (
    <section className="flex items-end justify-between gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="caps-label text-[13px]">Weight</h2>
        <span className="font-condensed text-[40px] leading-none font-bold">
          {weight ?? "No weigh-in"}
          {weight && <span className="ml-1 text-lg font-semibold text-text-2">{unit}</span>}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 text-right text-sm text-text-2">
        {average && (
          <span>
            7-day avg <strong className="font-semibold text-text">{average}</strong>
          </span>
        )}
        {change && <span>{change} vs last week</span>}
      </div>
    </section>
  );
}

type WorkoutProps = { exercises: { id: number; name: string; line: string }[]; setCount: number; unit: string };

export function WorkoutCard({ exercises, setCount, unit }: WorkoutProps) {
  return (
    <section className="flex flex-col rounded-card border border-border bg-surface px-4 pt-4 pb-1">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="caps-label text-[13px]">Workout</h2>
        <span className="text-sm text-text-2">
          {setCount} {setCount === 1 ? "set" : "sets"} · {unit} × reps
        </span>
      </div>
      {exercises.map((exercise) => (
        <div key={exercise.id} className="flex items-baseline justify-between gap-3 border-t border-divider py-3">
          <span className="text-base font-medium">{exercise.name}</span>
          <span className="text-right font-condensed text-lg font-semibold">{exercise.line}</span>
        </div>
      ))}
    </section>
  );
}

export function DayAddons({ addons }: { addons: { id: number; name: string; details: string }[] }) {
  return (
    <section aria-labelledby="day-addons" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h2 id="day-addons" className="caps-label text-[13px]">
        Add-ons that day
      </h2>
      <div className="flex flex-wrap gap-2">
        {addons.map((addon) => (
          <Chip key={addon.id} label={addon.name} note={addon.details} />
        ))}
      </div>
    </section>
  );
}
