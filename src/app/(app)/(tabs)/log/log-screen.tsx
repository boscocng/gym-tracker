"use client";

import { useState, useTransition } from "react";
import { deleteSet, type LogResult, logSet, logSetAs, logSetAsNew } from "./actions";
import { LogDock } from "./log-dock";
import { type ExerciseOption, UnknownExerciseSheet } from "./unknown-exercise";

export type LogRow = { id: number; number: number; load: string; unit: string | null; reps: number };
export type LogGroup = { exerciseId: number; name: string; rows: LogRow[] };

type Props = { dayLabel: string; summary: string; groups: LogGroup[]; exercises: ExerciseOption[] };
type Unknown = { text: string; spokenName: string; loadGiven: boolean };

const SAVE_FAILED = "Couldn’t save that. Check your connection and try again.";

function describeSet(group: LogGroup, row: LogRow): string {
  return `${group.name} · set ${row.number} · ${row.load}${row.unit ? ` ${row.unit}` : ""} × ${row.reps}`;
}

function lastAdded(groups: readonly LogGroup[], id: number | null): string | null {
  for (const group of groups) {
    const row = group.rows.find((candidate) => candidate.id === id);
    if (row) {
      return describeSet(group, row);
    }
  }
  return null;
}

function EmptyState() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-border-todo"
      >
        <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
      </svg>
      <p className="font-condensed text-[26px] leading-[1.1] font-bold">No sets yet</p>
      <p className="text-[15px] leading-normal text-text-2">
        Tap the box below and say a set, like “bench 185 for 6”. The set number fills in by itself.
      </p>
    </main>
  );
}

function SetCard({ group, lastId }: { group: LogGroup; lastId: number | null }) {
  return (
    <section className="flex flex-col rounded-card border border-border bg-surface px-3.5 pt-3 pb-1">
      <h2 className="mb-1.5 font-condensed text-[21px] leading-[1.2] font-bold">{group.name}</h2>
      {group.rows.map((row) => (
        <div key={row.id} className="flex min-h-[46px] items-center justify-between gap-3 border-t border-divider">
          <span className="flex items-center gap-2 text-[15px] text-text-2">
            Set {row.number}
            {row.id === lastId && (
              <span className="rounded-full bg-accent px-2 py-[3px] font-condensed text-[11px] font-bold tracking-[0.08em] text-on-accent uppercase">
                Just now
              </span>
            )}
          </span>
          <span className="font-condensed text-[21px] font-semibold">
            {row.load}
            {row.unit && <span className="mr-1.5 ml-0.5 text-sm text-text-2">{row.unit}</span>}
            {!row.unit && " "}× {row.reps}
          </span>
        </div>
      ))}
    </section>
  );
}

function LogHeader({ dayLabel, summary }: { dayLabel: string; summary: string }) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pt-safe pb-3">
      <div className="flex flex-col gap-1.5">
        <span className="caps-label text-[13px]">{dayLabel}</span>
        <h1 className="font-condensed text-[40px] leading-none font-bold">Log</h1>
      </div>
      <span className="pb-1 text-sm text-text-2">{summary}</span>
    </header>
  );
}

function LogBody({ groups, lastId }: { groups: readonly LogGroup[]; lastId: number | null }) {
  if (groups.length === 0) {
    return <EmptyState />;
  }
  return (
    <main className="flex flex-1 flex-col gap-2.5 px-4 pt-1 pb-4">
      {groups.map((group) => (
        <SetCard key={group.exerciseId} group={group} lastId={lastId} />
      ))}
    </main>
  );
}

export function LogScreen({ dayLabel, summary, groups, exercises }: Props) {
  const [draft, setDraft] = useState("");
  const [lastId, setLastId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unknown, setUnknown] = useState<Unknown | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(text: string, fromSheet: boolean, action: () => Promise<LogResult>) {
    startTransition(async () => {
      const result = await action().catch((): LogResult => ({ kind: "error", message: SAVE_FAILED }));
      setSheetError(null);
      if (result.kind === "added") {
        setDraft("");
        setLastId(result.setId);
        setMessage(null);
        setUnknown(null);
      } else if (result.kind === "unknown") {
        setUnknown({ text, spokenName: result.spokenName, loadGiven: result.loadGiven });
      } else if (fromSheet) {
        setSheetError(result.message);
      } else {
        setMessage(result.message);
      }
    });
  }

  function undo(id: number) {
    startTransition(async () => {
      await deleteSet(id).then(
        () => setLastId(null),
        () => setMessage(SAVE_FAILED),
      );
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh_-_var(--tab-bar-height))] flex-col">
      <LogHeader dayLabel={dayLabel} summary={summary} />

      <LogBody groups={groups} lastId={lastId} />

      <LogDock
        draft={draft}
        lastText={lastAdded(groups, lastId)}
        message={message}
        pending={pending}
        onDraftChange={(text) => {
          setDraft(text);
          setMessage(null);
        }}
        onSubmit={() => run(draft, false, () => logSet(draft))}
        onUndo={() => lastId !== null && undo(lastId)}
      />

      {unknown && (
        <UnknownExerciseSheet
          key={unknown.text}
          spokenName={unknown.spokenName}
          loadGiven={unknown.loadGiven}
          exercises={exercises}
          pending={pending}
          error={sheetError}
          onClose={() => setUnknown(null)}
          onPick={(exerciseId) => run(unknown.text, true, () => logSetAs(unknown.text, exerciseId))}
          onCreate={(name, bodyweight) => run(unknown.text, true, () => logSetAsNew(unknown.text, name, bodyweight))}
        />
      )}
    </div>
  );
}
