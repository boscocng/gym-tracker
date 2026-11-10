import Image from "next/image";
import type { ReactNode } from "react";
import { BackHeader } from "@/components/back-header";
import { isDay } from "@/rules/days";
import { formatShortDate } from "@/rules/format";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { DayPicker } from "./day-picker";
import { readCompare } from "./read-compare";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Side = { day: string; url: string | null; weight: string | null };

function PhotoFigure({ side, unit }: { side: Side; unit: string }) {
  return (
    <figure className="relative self-start overflow-hidden rounded-card bg-surface">
      {side.url && (
        <Image
          src={side.url}
          alt={`Photo for ${formatShortDate(side.day)}`}
          width={1080}
          height={1920}
          unoptimized
          className="block h-auto w-full"
        />
      )}
      <figcaption className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-bg/88 px-3 py-2.5 font-condensed text-[17px] font-semibold">
        <span>{formatShortDate(side.day)}</span>
        {side.weight && (
          <span>
            {side.weight} {unit}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-border bg-surface px-4 py-3.5">
      <span className="caps-label text-xs">{label}</span>
      <span className="font-condensed text-[34px] leading-none font-bold">{children}</span>
    </div>
  );
}

export default async function ComparePage({ searchParams }: Props) {
  const settings = await requireOwnerSettings();
  const { a, b } = await searchParams;
  const requestedB = typeof b === "string" && isDay(b) ? b : null;
  const compare = await readCompare(await createSessionClient(), settings, typeof a === "string" ? a : null, requestedB);
  const backDay = requestedB ?? compare?.after.day;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader
        href={backDay ? `/day/${backDay}` : "/calendar"}
        label={backDay ? `Back to ${formatShortDate(backDay)}` : "Back to calendar"}
        title="Compare"
      />
      {compare ? (
        <main className="flex flex-col gap-2.5 px-4 pb-6">
          <div className="grid grid-cols-2 gap-2">
            {(["a", "b"] as const).map((param) => (
              <DayPicker
                key={param}
                label={param === "a" ? "Before" : "After"}
                param={param}
                pair={{ a: compare.before.day, b: compare.after.day }}
                days={compare.photoDays}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PhotoFigure side={compare.before} unit={settings.unit} />
            <PhotoFigure side={compare.after} unit={settings.unit} />
          </div>
          <section aria-label="Change between the two days" className="grid grid-cols-2 gap-2">
            <Stat label="Weight change">
              {compare.change ?? <span className="text-[17px] font-semibold text-text-2">Needs both weigh-ins</span>}
              {compare.change && <span className="ml-1 text-base font-semibold text-text-2">{settings.unit}</span>}
            </Stat>
            <Stat label="Days apart">{compare.daysApart}</Stat>
          </section>
        </main>
      ) : (
        <p className="px-4 text-base text-text-2">Take photos on two different days to compare them.</p>
      )}
    </div>
  );
}
