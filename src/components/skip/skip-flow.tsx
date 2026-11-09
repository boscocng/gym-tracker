"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";
import type { RestCheck } from "@/rules/day-status";
import { skipDays } from "@/server/day-actions";
import { SkipConfirm } from "./skip-confirm";
import { SkipReason } from "./skip-reason";

type Props = {
  variant: "today" | "missed";
  day: string;
  extraDays: string[];
  rest: RestCheck | null;
  skipCount: number;
  skipCountAll: number;
  backHref: string;
};

export function SkipFlow({ variant, day, extraDays, rest, skipCount, skipCountAll, backHref }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"reason" | "confirm">("reason");
  const [reason, setReason] = useState("");
  const [all, setAll] = useState(extraDays.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const days = all ? [day, ...extraDays] : [day];

  function confirm() {
    startTransition(async () => {
      const result = await skipDays(days, reason).catch(() => ({ error: SAVE_FAILED }));
      if (result) {
        setError(result.error);
      } else {
        router.push(backHref);
      }
    });
  }

  if (step === "reason") {
    return (
      <SkipReason
        variant={variant}
        day={day}
        extraDays={extraDays}
        rest={rest}
        backHref={backHref}
        reason={reason}
        all={all}
        onReasonChange={setReason}
        onAllChange={setAll}
        onContinue={() => setStep("confirm")}
      />
    );
  }
  return (
    <SkipConfirm
      variant={variant}
      days={days}
      reason={reason}
      skipCount={all ? skipCountAll : skipCount}
      backHref={backHref}
      pending={pending}
      error={error}
      onEdit={() => setStep("reason")}
      onConfirm={confirm}
    />
  );
}
