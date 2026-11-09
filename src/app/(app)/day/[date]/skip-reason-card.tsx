"use client";

import { useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";
import { MIN_REASON } from "@/components/skip/skip-reason";
import { updateSkipReason } from "@/server/day-actions";

export function SkipReasonCard({ day, reason }: { day: string; reason: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reason);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateSkipReason(day, draft).catch(() => ({ error: SAVE_FAILED }));
      setError(result?.error ?? null);
      if (!result) {
        setEditing(false);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="caps-label text-[13px]">Skip reason</h2>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-1 text-sm font-semibold text-accent">
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={500}
            aria-label="Skip reason"
            className="w-full resize-none rounded-control border-[1.5px] border-border-input bg-bg px-4 py-3 text-base leading-[1.4] text-text outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || draft.trim().length < MIN_REASON}
            className="h-12 rounded-control bg-accent font-condensed text-lg font-bold text-on-accent disabled:opacity-40"
          >
            Save reason
          </button>
        </>
      ) : (
        <p className="font-condensed text-[22px] leading-[1.2] font-semibold break-words">“{reason}”</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-error-text">
          {error}
        </p>
      )}
    </section>
  );
}
