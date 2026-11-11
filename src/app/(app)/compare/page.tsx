import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackHeader } from "@/components/back-header";
import { Constants, type Enums } from "@/database.types";
import { isDay } from "@/rules/days";
import { formatShortDate } from "@/rules/format";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { DayPicker } from "./day-picker";
import { readCompare } from "./read-compare";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Pose = Enums<"photo_pose">;
type Side = { day: string; url: string | null; weight: string | null };

function PoseLinks({ pose }: { pose: Pose }) {
  return (
    <nav aria-label="Pose" className="grid grid-cols-2 gap-1 rounded-control border border-border bg-surface p-1">
      {Constants.public.Enums.photo_pose.map((option) => (
        <Link
          key={option}
          href={`/compare?pose=${option}`}
          aria-current={pose === option ? "page" : undefined}
          className={`flex h-11 items-center justify-center rounded-[10px] font-condensed text-lg font-bold capitalize ${pose === option ? "bg-accent text-on-accent" : "text-text-2"}`}
        >
          {option}
        </Link>
      ))}
    </nav>
  );
}

function PhotoFigure({ side, pose, unit }: { side: Side; pose: Pose; unit: string }) {
  return (
    <figure className="relative self-start overflow-hidden rounded-card bg-surface">
      {side.url && (
        <Image
          src={side.url}
          alt={`${pose === "back" ? "Back photo" : "Photo"} for ${formatShortDate(side.day)}`}
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
  const { a, b, pose: requestedPose } = await searchParams;
  const pose = Constants.public.Enums.photo_pose.find((option) => option === requestedPose) ?? "front";
  const requestedB = typeof b === "string" && isDay(b) ? b : null;
  const supabase = await createSessionClient();
  const compare = await readCompare(supabase, settings, pose, typeof a === "string" ? a : null, requestedB);
  const backDay = requestedB ?? compare?.after.day;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader
        href={backDay ? `/day/${backDay}` : "/calendar"}
        label={backDay ? `Back to ${formatShortDate(backDay)}` : "Back to calendar"}
        title="Compare"
      />
      <main className="flex flex-col gap-2.5 px-4 pb-6">
        <PoseLinks pose={pose} />
        {compare ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(["a", "b"] as const).map((param) => (
                <DayPicker
                  key={param}
                  label={param === "a" ? "Before" : "After"}
                  param={param}
                  pose={pose}
                  pair={{ a: compare.before.day, b: compare.after.day }}
                  days={compare.photoDays}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PhotoFigure side={compare.before} pose={pose} unit={settings.unit} />
              <PhotoFigure side={compare.after} pose={pose} unit={settings.unit} />
            </div>
            <section aria-label="Change between the two days" className="grid grid-cols-2 gap-2">
              <Stat label="Weight change">
                {compare.change ?? <span className="text-[17px] font-semibold text-text-2">Needs both weigh-ins</span>}
                {compare.change && <span className="ml-1 text-base font-semibold text-text-2">{settings.unit}</span>}
              </Stat>
              <Stat label="Days apart">{compare.daysApart}</Stat>
            </section>
          </>
        ) : (
          <p className="text-base text-text-2">
            Take {pose === "back" ? "back photos" : "photos"} on two different days to compare them.
          </p>
        )}
      </main>
    </div>
  );
}
