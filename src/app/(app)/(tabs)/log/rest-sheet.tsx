"use client";

import { useState, useTransition } from "react";
import { DayStrip } from "@/components/day-strip";
import { SAVE_FAILED } from "@/components/messages";
import { Sheet } from "@/components/sheet";
import type { RestCheck } from "@/rules/day-status";
import { takeRestDay } from "@/server/day-actions";

type Props = { day: string; rest: RestCheck; onClose: () => void };

const bigButton = "h-14 rounded-control font-condensed text-xl font-bold tracking-[0.04em] uppercase disabled:opacity-60";

export function RestSheet({ day, rest, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await takeRestDay(day).catch(() => ({ error: SAVE_FAILED }));
      if (result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <Sheet open eyebrow="Rest unlocked" title="Take a rest day?" onClose={onClose}>
      <p className="text-base leading-[1.45] text-text-2">
        You trained {rest.trained} of the last {rest.days} days, so no excuse needed.
      </p>
      <DayStrip days={rest.strip} size="large" />
      {error && (
        <p role="alert" className="text-sm text-error-text">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={confirm} disabled={pending} className={`${bigButton} bg-accent text-on-accent`}>
          Log rest day
        </button>
        <button type="button" onClick={onClose} className={`${bigButton} border border-border-input bg-surface-2`}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
