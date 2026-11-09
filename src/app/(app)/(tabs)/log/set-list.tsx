"use client";

import type { Enums } from "@/database.types";
import type { EditableSet } from "./edit-set-sheet";
import { SwipeRow } from "./swipe-row";

export type LogRow = {
  id: number;
  number: number;
  load: string;
  unit: string | null;
  reps: number;
  loadValue: number;
  loadUnit: Enums<"weight_unit">;
};
export type LogGroup = { exerciseId: number; name: string; isBodyweight: boolean; rows: LogRow[] };

type Props = {
  groups: readonly LogGroup[];
  lastId: number | null;
  disabled: boolean;
  onEdit: (set: EditableSet) => void;
  onDelete: (id: number) => void;
};

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

function SetCard({ group, lastId, disabled, onEdit, onDelete }: Omit<Props, "groups"> & { group: LogGroup }) {
  return (
    <section className="flex flex-col rounded-card border border-border bg-surface px-3.5 pt-3 pb-1">
      <h2 className="mb-1.5 font-condensed text-[21px] leading-[1.2] font-bold">{group.name}</h2>
      {group.rows.map((row) => (
        <SwipeRow
          key={row.id}
          label={`Set ${row.number}, ${row.load}${row.unit ? ` ${row.unit}` : ""} for ${row.reps} reps. Tap to edit.`}
          disabled={disabled}
          onDelete={() => onDelete(row.id)}
          onTap={() =>
            onEdit({
              id: row.id,
              title: `${group.name} · set ${row.number}`,
              loadValue: row.loadValue,
              loadUnit: row.loadUnit,
              isBodyweight: group.isBodyweight,
              reps: row.reps,
            })
          }
        >
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
        </SwipeRow>
      ))}
    </section>
  );
}

export function SetList({ groups, ...rest }: Props) {
  if (groups.length === 0) {
    return <EmptyState />;
  }
  return (
    <main className="flex flex-1 flex-col gap-2.5 px-4 pt-1 pb-4">
      {groups.map((group) => (
        <SetCard key={group.exerciseId} group={group} {...rest} />
      ))}
      <p className="mt-0.5 text-center text-[13px] text-label">Tap a set to edit · swipe left to delete</p>
    </main>
  );
}
