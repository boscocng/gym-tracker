"use client";

import type { FormEvent } from "react";

type Props = {
  draft: string;
  lastText: string | null;
  message: string | null;
  pending: boolean;
  onDraftChange: (draft: string) => void;
  onSubmit: () => void;
  onUndo: () => void;
};

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

export function LogDock({ draft, lastText, message, pending, onDraftChange, onSubmit, onUndo }: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="sticky bottom-(--tab-bar-height) flex flex-col gap-2 border-t border-divider bg-bg px-4 pt-2.5 pb-3">
      {lastText && <UndoBar text={lastText} onUndo={onUndo} disabled={pending} />}
      {message && (
        <p role="alert" className="text-sm text-error-text">
          {message}
        </p>
      )}
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
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
  );
}
