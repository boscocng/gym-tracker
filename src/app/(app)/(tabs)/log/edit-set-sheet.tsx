"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { updateSet } from "./actions";
import { SAVE_FAILED } from "./messages";

export type EditableSet = {
  id: number;
  title: string;
  loadValue: number;
  loadUnit: string;
  isBodyweight: boolean;
  reps: number;
};

type Props = { set: EditableSet; onClose: () => void; onDelete: () => void };

const inputClass =
  "h-[52px] w-full rounded-control border border-border-input bg-bg px-4 text-base text-text outline-none focus:border-accent";

export function EditSetSheet({ set, onClose, onDelete }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const problem = await updateSet(set.id, String(form.get("load")), String(form.get("reps"))).catch(
        () => SAVE_FAILED,
      );
      if (problem) {
        setError(problem);
      } else {
        onClose();
      }
    });
  }

  return (
    <Sheet open title={set.title} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="caps-label text-xs">
              {set.isBodyweight ? "Added weight" : "Weight"} ({set.loadUnit})
            </span>
            <input name="load" inputMode="decimal" defaultValue={String(set.loadValue)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="caps-label text-xs">Reps</span>
            <input name="reps" inputMode="numeric" defaultValue={String(set.reps)} className={inputClass} />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error-text">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-[52px] rounded-control bg-accent font-condensed text-lg font-bold text-on-accent disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="min-h-11 text-base font-semibold text-error-text disabled:opacity-60"
        >
          Delete set
        </button>
      </form>
    </Sheet>
  );
}
