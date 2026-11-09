"use client";

import Link from "next/link";
import { type ComponentProps, useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";
import { deleteSet, type LogResult, logSet, logSetAs, logSetAsNew } from "./actions";
import { type EditableSet, EditSetSheet } from "./edit-set-sheet";
import { LogDock } from "./log-dock";
import { NotTraining } from "./not-training";
import { type LogGroup, SetList } from "./set-list";
import { type ExerciseOption, UnknownExerciseSheet } from "./unknown-exercise";

type Props = {
  day?: string;
  doneHref?: string;
  dayLabel: string;
  summary: string;
  groups: LogGroup[];
  exercises: ExerciseOption[];
  notTraining?: ComponentProps<typeof NotTraining>;
};
type Unknown = { text: string; spokenName: string; loadGiven: boolean };

function lastAdded(groups: readonly LogGroup[], id: number | null): string | null {
  for (const group of groups) {
    const row = group.rows.find((candidate) => candidate.id === id);
    if (row) {
      return `${group.name} · set ${row.number} · ${row.load}${row.unit ? ` ${row.unit}` : ""} × ${row.reps}`;
    }
  }
  return null;
}

function LogHeader({ dayLabel, summary, doneHref }: { dayLabel: string; summary: string; doneHref?: string }) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pt-safe pb-3">
      <div className="flex flex-col gap-1.5">
        <span className="caps-label text-[13px]">{dayLabel}</span>
        <h1 className="font-condensed text-[40px] leading-none font-bold">Log</h1>
      </div>
      {doneHref ? (
        <Link
          href={doneHref}
          className="flex h-11 items-center rounded-icon bg-accent px-4 font-condensed text-lg font-bold text-on-accent"
        >
          Done
        </Link>
      ) : (
        <span className="pb-1 text-sm text-text-2">{summary}</span>
      )}
    </header>
  );
}

function useSetLog() {
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
      } else {
        (fromSheet ? setSheetError : setMessage)(result.message);
      }
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      await deleteSet(id).then(
        () => setLastId((current) => (current === id ? null : current)),
        () => setMessage(SAVE_FAILED),
      );
    });
  }

  function changeDraft(text: string) {
    setDraft(text);
    setMessage(null);
  }

  return { draft, lastId, message, unknown, sheetError, pending, run, remove, changeDraft, setUnknown };
}

export function LogScreen({ day, doneHref, dayLabel, summary, groups, exercises, notTraining }: Props) {
  const log = useSetLog();
  const [editing, setEditing] = useState<EditableSet | null>(null);
  const { draft, lastId, unknown } = log;

  return (
    <div className="flex min-h-[calc(100dvh_-_var(--tab-bar-height))] flex-col">
      <LogHeader dayLabel={dayLabel} summary={summary} doneHref={doneHref} />
      <SetList groups={groups} lastId={lastId} disabled={log.pending} onEdit={setEditing} onDelete={log.remove} />
      {groups.length === 0 && notTraining && <NotTraining {...notTraining} />}
      <LogDock
        draft={draft}
        lastText={lastAdded(groups, lastId)}
        message={log.message}
        pending={log.pending}
        onDraftChange={log.changeDraft}
        onSubmit={() => log.run(draft, false, () => logSet(draft, day))}
        onUndo={() => lastId !== null && log.remove(lastId)}
      />
      {unknown && (
        <UnknownExerciseSheet
          key={unknown.text}
          spokenName={unknown.spokenName}
          loadGiven={unknown.loadGiven}
          exercises={exercises}
          pending={log.pending}
          error={log.sheetError}
          onClose={() => log.setUnknown(null)}
          onPick={(exerciseId) => log.run(unknown.text, true, () => logSetAs(unknown.text, exerciseId, day))}
          onCreate={(name, bodyweight) =>
            log.run(unknown.text, true, () => logSetAsNew(unknown.text, name, bodyweight, day))
          }
        />
      )}
      {editing && (
        <EditSetSheet
          key={editing.id}
          set={editing}
          onClose={() => setEditing(null)}
          onDelete={() => {
            log.remove(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
