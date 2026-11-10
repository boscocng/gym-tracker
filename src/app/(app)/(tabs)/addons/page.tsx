import Link from "next/link";
import { addonOverview } from "@/rules/addons";
import { formatShortDate } from "@/rules/format";
import { trainingDay } from "@/rules/training-day";
import { readAddons } from "@/server/addons";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

type Overview = ReturnType<typeof addonOverview>;

function ActiveList({ active }: { active: Overview["active"] }) {
  return (
    <>
      <h2 className="caps-label mb-0.5 text-[13px]">Active · {active.length}</h2>
      {active.length === 0 && <p className="text-[15px] text-text-2">Nothing running right now.</p>}
      {active.map((addon) => (
        <Link
          key={addon.id}
          href={`/addons/${addon.id}`}
          className="flex flex-col gap-1.5 rounded-card border border-border bg-surface px-4 py-3.5"
        >
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 font-condensed text-[22px] leading-[1.1] font-bold break-words">{addon.name}</span>
            <span className="flex-none font-condensed text-[17px] font-semibold text-accent">Day {addon.day}</span>
          </span>
          <span className="text-[15px] text-text-2">
            {addon.details && `${addon.details} · `}since {formatShortDate(addon.since)}
          </span>
        </Link>
      ))}
    </>
  );
}

function PastList({ past }: { past: Overview["past"] }) {
  return (
    <>
      <h2 className="caps-label mt-4 mb-0.5 text-[13px]">Past</h2>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {past.map((period, index) => (
          <Link
            key={period.periodId}
            href={`/addons/${period.addonId}`}
            className={`flex items-center justify-between gap-3 px-4 py-3.5 ${index > 0 ? "border-t border-divider" : ""}`}
          >
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className="text-base font-semibold">{period.name}</span>
              {period.details && <span className="text-sm text-label">{period.details}</span>}
            </span>
            <span className="flex flex-none flex-col items-end gap-[3px] text-right">
              <span className="text-sm text-text-2">
                {formatShortDate(period.startDay)} to {formatShortDate(period.endDay)}
              </span>
              <span className="text-[13px] text-label">
                {period.days} {period.days === 1 ? "day" : "days"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

export default async function AddOnsPage() {
  const settings = await requireOwnerSettings();
  const today = trainingDay(new Date(), settings.time_zone, settings.rollover_hour);
  const { active, past } = addonOverview(await readAddons(await createSessionClient()), today);

  return (
    <div className="flex flex-col">
      <header className="flex items-end justify-between gap-3 px-4 pt-safe pb-3">
        <div className="flex flex-col gap-1.5">
          <span className="caps-label text-[13px]">The extras you’re running</span>
          <h1 className="font-condensed text-[40px] leading-none font-bold">Add-ons</h1>
        </div>
        <Link
          href="/addons/new"
          aria-label="Add an add-on"
          className="flex size-11 flex-none items-center justify-center rounded-icon bg-accent text-on-accent"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </header>
      <main className="flex flex-col gap-2.5 px-4 pt-2 pb-5">
        {active.length === 0 && past.length === 0 ? (
          <p className="text-[15px] leading-[1.45] text-text-2">
            Nothing yet. Add a supplement, cardio or anything else you’re running, and each day shows what you were on.
          </p>
        ) : (
          <>
            <ActiveList active={active} />
            {past.length > 0 && <PastList past={past} />}
          </>
        )}
      </main>
    </div>
  );
}
