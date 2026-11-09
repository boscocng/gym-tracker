"use client";

import { type FormEvent, useState } from "react";
import { Sheet } from "@/components/sheet";

export type ExerciseOption = { id: number; name: string };

type Props = {
  spokenName: string;
  loadGiven: boolean;
  exercises: readonly ExerciseOption[];
  pending: boolean;
  error: string | null;
  onPick: (exerciseId: number) => void;
  onCreate: (name: string, isBodyweight: boolean) => void;
};

export function UnknownExerciseSheet(props: Props & { onClose: () => void }) {
  return (
    <Sheet open title={`Which exercise is “${props.spokenName}”?`} onClose={props.onClose}>
      <UnknownExercise {...props} />
    </Sheet>
  );
}

function UnknownExercise({ spokenName, loadGiven, exercises, pending, error, onPick, onCreate }: Props) {
  const [name, setName] = useState(spokenName.charAt(0).toUpperCase() + spokenName.slice(1));
  const [isBodyweight, setIsBodyweight] = useState(!loadGiven);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate(name, isBodyweight);
  }

  return (
    <>
      <p className="text-[15px] leading-normal text-text-2">
        Pick the exercise you meant, and “{spokenName}” will work next time.
      </p>
      {exercises.length > 0 && (
        <div className="max-h-[36dvh] divide-y divide-divider overflow-y-auto rounded-card border border-border bg-bg">
          {exercises.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              disabled={pending}
              onClick={() => onPick(exercise.id)}
              className="flex min-h-12 w-full items-center px-4 text-left text-base disabled:opacity-60"
            >
              {exercise.name}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={create} className="flex flex-col gap-3">
        <h3 className="caps-label text-xs">{exercises.length > 0 ? "Or add a new exercise" : "Add it as a new exercise"}</h3>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="New exercise name"
          maxLength={60}
          className="h-[52px] rounded-control border border-border-input bg-bg px-4 text-base text-text outline-none focus:border-accent"
        />
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={isBodyweight}
            onChange={(event) => setIsBodyweight(event.target.checked)}
            className="size-5 accent-accent"
          />
          Bodyweight exercise (say added weight as “plus 25”)
        </label>
        <button
          type="submit"
          disabled={pending || name.trim() === ""}
          className="h-[52px] rounded-control bg-accent font-condensed text-lg font-bold text-on-accent disabled:opacity-60"
        >
          Add exercise and log the set
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-error-text">
          {error}
        </p>
      )}
    </>
  );
}
