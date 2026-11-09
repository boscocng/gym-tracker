"use client";

import { type FormEvent, useState, useTransition } from "react";
import { deleteSet, type LogResult, logSet } from "./actions";

export type LogRow = { id: number; number: number; load: string; unit: string | null; reps: number };
export type LogGroup = { exerciseId: number; name: string; rows: LogRow[] };

type Props = { dayLabel: string; summary: string; groups: LogGroup[] };

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

function UndoBar({ text, onUndo, disabled }: { text: string; onUndo: () => void; disabled: boolean }) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-2.5 rounded-icon border border-border bg-surface py-1 pr-1 pl-3"
    >
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-none text-accent"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
        <span className="truncate">{text}</span>
      </span>
      <button
        type="button"
        onClick={onUndo}
        disabled={disabled}
        className="flex h-10 flex-none items-center gap-1.5 rounded-[9px] bg-border px-3 text-sm font-semibold disabled:opacity-60"
      >
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
          <path d="M9 6 4 11l5 5" />
          <path d="M4 11h11a5 5 0 0 1 0 10h-3" />
        </svg>
        Undo
      </button>
    </div>
  );
}

export function LogScreen({ dayLabel, summary, groups }: Props) {
  const [draft, setDraft] = useState("");
  const [lastId, setLastId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastText = lastAdded(groups, lastId);

  function handle(result: LogResult) {
    if (result.kind === "added") {
      setDraft("");
      setLastId(result.setId);
      setMessage(null);
    } else if (result.kind === "unknown") {
      setMessage(`“${result.spokenName}” isn’t one of your exercises yet.`);
    } else {
      setMessage(result.message);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft;
    startTransition(async () => {
      try {
        handle(await logSet(text));
      } catch {
        setMessage(SAVE_FAILED);
      }
    });
  }

  function undo() {
    const id = lastId;
    if (id === null) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteSet(id);
        setLastId(null);
      } catch {
        setMessage(SAVE_FAILED);
      }
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh_-_var(--tab-bar-height))] flex-col">
      <header className="flex items-end justify-between gap-3 px-4 pt-safe pb-3">
        <div className="flex flex-col gap-1.5">
          <span className="caps-label text-[13px]">{dayLabel}</span>
          <h1 className="font-condensed text-[40px] leading-none font-bold">Log</h1>
        </div>
        <span className="pb-1 text-sm text-text-2">{summary}</span>
      </header>

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <main className="flex flex-1 flex-col gap-2.5 px-4 pt-1 pb-4">
          {groups.map((group) => (
            <SetCard key={group.exerciseId} group={group} lastId={lastId} />
          ))}
        </main>
      )}

      <div className="sticky bottom-(--tab-bar-height) flex flex-col gap-2 border-t border-divider bg-bg px-4 pt-2.5 pb-3">
        {lastText && <UndoBar text={lastText} onUndo={undo} disabled={pending} />}
        {message && (
          <p role="alert" className="text-sm text-error-text">
            {message}
          </p>
        )}
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMessage(null);
            }}
            aria-label="Log a set by voice or typing"
            placeholder="Say a set: bench 185 for 6"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            className="h-[52px] min-w-0 flex-1 rounded-control border border-border-input bg-surface px-4 text-base font-medium text-text outline-none placeholder:text-label focus:border-accent"
          />
          <button
            type="submit"
            aria-label="Add set"
            disabled={pending}
            className="flex size-[52px] flex-none items-center justify-center rounded-control bg-accent text-on-accent disabled:opacity-60"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
