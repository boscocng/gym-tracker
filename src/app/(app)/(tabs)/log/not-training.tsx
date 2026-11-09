"use client";

import Link from "next/link";
import { useState } from "react";
import type { Enums } from "@/database.types";
import type { RestCheck } from "@/rules/day-status";
import { RestSheet } from "./rest-sheet";

export type TodayMark = { kind: Enums<"day_mark_kind">; reason: string | null };

type Props = { day: string; rest: RestCheck; mark: TodayMark | null };

const cardClass = "flex min-h-16 items-center justify-between gap-3 rounded-control border border-border bg-surface";

function MarkCard({ mark }: { mark: TodayMark }) {
  return (
    <div className={`${cardClass} px-4 py-2.5`}>
      <span className="flex flex-col gap-[3px]">
        <span className="flex items-center gap-2 text-base font-semibold">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${mark.kind === "rest" ? "bg-rest" : "border-[1.5px] border-text"}`}
          />
          {mark.kind === "rest" ? "Rest day" : "Skipped today"}
        </span>
        <span className="text-[13px] text-text-2">
          {mark.kind === "rest" ? "Log a set if you train after all." : `“${mark.reason}”`}
        </span>
      </span>
    </div>
  );
}

export function NotTraining({ day, rest, mark }: Props) {
  const [open, setOpen] = useState(false);
  if (mark) {
    return (
      <div className="flex-none px-4 pb-3">
        <MarkCard mark={mark} />
      </div>
    );
  }

  const summary = `${rest.trained} of last ${rest.days} trained`;
  const content = (
    <>
      <span className="flex flex-col gap-[3px]">
        <span className="text-base font-semibold">Not training today</span>
        <span className={`text-[13px] ${rest.free ? "text-accent" : "text-label"}`}>
          {rest.free ? `Rest unlocked · ${summary}` : `Counts as a skip · ${summary}`}
        </span>
      </span>
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
        className="flex-none text-label"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </>
  );
  const className = `${cardClass} py-2.5 pr-3.5 pl-4 text-left`;

  return (
    <div className="flex-none px-4 pb-3">
      {rest.free ? (
        <button type="button" onClick={() => setOpen(true)} className={`w-full ${className}`}>
          {content}
        </button>
      ) : (
        <Link href="/log/skip" className={className}>
          {content}
        </Link>
      )}
      {open && <RestSheet day={day} rest={rest} onClose={() => setOpen(false)} />}
    </div>
  );
}
