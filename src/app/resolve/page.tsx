import { redirect } from "next/navigation";
import { restCheck } from "@/rules/day-status";
import { formatDayLabel, formatShortDate, formatWeekday } from "@/rules/format";
import { readLockState } from "@/server/lock";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { OptionCard } from "./option-card";
import { RestOption } from "./rest-option";

export default async function ResolvePage() {
  const settings = await requireOwnerSettings();
  const { today, history, unresolved } = await readLockState(await createSessionClient(), settings);
  const [day, next] = unresolved;
  if (!day) {
    redirect("/");
  }
  const rest = restCheck(day, today, settings.rest_rule, history);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 pt-safe">
        <span className="caps-label flex items-center gap-2 text-[13px]">
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
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          App locked
        </span>
        <span className="rounded-full bg-surface-2 px-3 py-[5px] text-[13px] font-semibold">
          1 of {unresolved.length} {unresolved.length === 1 ? "day" : "days"}
        </span>
      </header>
      <main className="flex flex-1 flex-col px-5 pt-10">
        <span className="caps-label text-[13px] text-accent">{formatDayLabel(day)}</span>
        <h1 className="mt-2.5 font-condensed text-[46px] leading-none font-bold">No training logged</h1>
        <p className="mt-3 mb-7 text-base leading-[1.45] text-text-2">Sort out this day to unlock the app.</p>
        <div className="flex flex-col gap-2.5">
          <OptionCard
            icon="trained"
            title="I trained"
            detail={`Log the sets for ${formatShortDate(day)}`}
            href={`/resolve/${day}/log`}
          />
          {rest.free && (
            <RestOption day={day} detail={`Allowed: ${rest.trained} of the ${rest.days} days before it were trained`} />
          )}
          <OptionCard icon="missed" title="I missed it" detail="Write what happened" href={`/resolve/${day}/missed`} />
        </div>
      </main>
      {next && (
        <p className="px-5 pb-[max(env(safe-area-inset-bottom),32px)] text-sm text-label">
          Next up: {formatWeekday(next)}, {formatShortDate(next)}
        </p>
      )}
    </div>
  );
}
