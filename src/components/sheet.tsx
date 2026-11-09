"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) {
      dialog?.showModal();
    }
    if (!open && dialog?.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[20px] border-t border-border bg-surface p-0 text-text backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 px-4 pt-5 pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="pt-2 font-condensed text-2xl leading-tight font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 flex-none items-center justify-center rounded-icon bg-surface-2"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
