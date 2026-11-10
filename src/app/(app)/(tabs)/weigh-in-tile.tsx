"use client";

import { type FormEvent, useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";
import { Sheet } from "@/components/sheet";
import { saveManualWeight } from "./actions";

export type WeighIn = { value: string; source: "scale" | "manual"; time: string };

type Props = { weighIn: WeighIn | null; unit: string };

const tileClass = "flex h-[104px] w-full flex-col justify-between rounded-card p-3 text-left";

function WeighInContent({ weighIn, unit }: Props) {
  if (!weighIn) {
    return (
      <>
        <span className="caps-label text-xs">Weigh-in</span>
        <span className="font-condensed text-[22px] leading-none font-semibold">Not yet</span>
        <span className="text-xs text-label">Step on the scale</span>
      </>
    );
  }
  return (
    <>
      <span className="flex items-center justify-between">
        <span className="caps-label text-xs">Weigh-in</span>
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
          className="text-accent"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="font-condensed text-[30px] leading-none font-bold">
        {weighIn.value}
        <span className="ml-[3px] text-[15px] font-semibold text-text-2">{unit}</span>
      </span>
      <span className="text-xs whitespace-nowrap text-label">
        {weighIn.source === "scale" ? "Scale" : "Manual"} · {weighIn.time}
      </span>
    </>
  );
}

function WeightSheet({ value, unit, onClose }: { value: string; unit: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("weight"));
    startTransition(async () => {
      const problem = await saveManualWeight(text).catch(() => SAVE_FAILED);
      if (problem) {
        setError(problem);
      } else {
        onClose();
      }
    });
  }

  return (
    <Sheet open title="Today’s weight" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="caps-label text-xs">Weight ({unit})</span>
          <input
            name="weight"
            inputMode="decimal"
            defaultValue={value}
            className="h-[52px] w-full rounded-control border border-border-input bg-bg px-4 text-base text-text outline-none focus:border-accent"
          />
        </label>
        <p className="text-sm text-text-2">A weight entered here replaces today’s scale reading.</p>
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
      </form>
    </Sheet>
  );
}

export function WeighInTile({ weighIn, unit }: Props) {
  const [editing, setEditing] = useState(false);
  const label = weighIn
    ? `Weigh-in, ${weighIn.value} ${unit}, ${weighIn.source === "scale" ? "from the scale" : "entered by hand"} at ${weighIn.time}. Tap to edit.`
    : "Weigh-in, not yet. Tap to enter it by hand.";
  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setEditing(true)}
        className={`${tileClass} ${weighIn ? "border border-border bg-surface" : "border border-dashed border-border-todo bg-surface-todo"}`}
      >
        <WeighInContent weighIn={weighIn} unit={unit} />
      </button>
      {editing && <WeightSheet value={weighIn?.value ?? ""} unit={unit} onClose={() => setEditing(false)} />}
    </>
  );
}
