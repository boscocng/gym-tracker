"use client";

import { useActionState, useState } from "react";
import type { FormState } from "./actions";

type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

const inputClass =
  "h-[52px] min-w-0 flex-1 rounded-control border border-border-input bg-surface px-4 text-base text-text outline-none focus:border-accent";
const buttonClass =
  "h-[52px] flex-none rounded-control bg-accent px-5 font-condensed text-lg font-bold text-on-accent disabled:opacity-60";

function Problem({ state }: { state: FormState }) {
  return state ? (
    <p role="alert" className="text-sm text-error-text">
      {state.error}
    </p>
  ) : null;
}

export function NameForm({ action, defaultName = "", submitLabel, withBodyweight = false }: {
  action: FormAction;
  defaultName?: string;
  submitLabel: string;
  withBodyweight?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          name="name"
          defaultValue={state?.value ?? defaultName}
          aria-label="Exercise name"
          maxLength={60}
          required
          className={inputClass}
        />
        {!withBodyweight && (
          <button type="submit" disabled={pending} className={buttonClass}>
            {submitLabel}
          </button>
        )}
      </div>
      {withBodyweight && (
        <>
          <label className="flex min-h-11 items-center gap-3 text-[15px]">
            <input type="checkbox" name="is_bodyweight" className="size-5 accent-accent" />
            Bodyweight exercise (say added weight as “plus 25”)
          </label>
          <button type="submit" disabled={pending} className={buttonClass}>
            {submitLabel}
          </button>
        </>
      )}
      <Problem state={state} />
    </form>
  );
}

export function AliasForm({ action }: { action: FormAction }) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <form action={dispatch} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="alias"
          defaultValue={state?.value}
          aria-label="New alias"
          placeholder="Another way to say it"
          autoCapitalize="off"
          autoCorrect="off"
          required
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={buttonClass}>
          Add
        </button>
      </div>
      <Problem state={state} />
    </form>
  );
}

export function MergeForm({ action, name, others }: {
  action: FormAction;
  name: string;
  others: readonly { id: number; name: string }[];
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [target, setTarget] = useState("");
  const targetName = others.find((other) => String(other.id) === target)?.name;
  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <select
        name="target"
        value={target}
        onChange={(event) => setTarget(event.target.value)}
        aria-label="Exercise to merge into"
        className="h-[52px] w-full appearance-none rounded-control border border-border-input bg-surface px-4 text-base text-text outline-none focus:border-accent"
      >
        <option value="">Merge into…</option>
        {others.map((other) => (
          <option key={other.id} value={other.id}>
            {other.name}
          </option>
        ))}
      </select>
      {targetName && (
        <>
          <p className="text-sm leading-normal text-text-2">
            Every {name} set and alias moves to {targetName}, and {name} is removed. This can’t be undone.
          </p>
          <button type="submit" disabled={pending} className={buttonClass}>
            Merge into {targetName}
          </button>
        </>
      )}
      <Problem state={state} />
    </form>
  );
}
