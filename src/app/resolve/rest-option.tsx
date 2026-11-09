"use client";

import { useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";
import { takeRestDay } from "@/server/day-actions";
import { OptionCard } from "./option-card";

export function RestOption({ day, detail }: { day: string; detail: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rest() {
    startTransition(async () => {
      const result = await takeRestDay(day).catch(() => ({ error: SAVE_FAILED }));
      setError(result?.error ?? null);
    });
  }

  return (
    <>
      <OptionCard icon="rest" title="It was a rest day" detail={detail} onClick={rest} disabled={pending} />
      {error && (
        <p role="alert" className="text-sm text-error-text">
          {error}
        </p>
      )}
    </>
  );
}
