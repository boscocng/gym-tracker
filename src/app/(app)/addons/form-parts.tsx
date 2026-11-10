"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";

export const inputClass =
  "h-[52px] w-full rounded-control border border-border-input bg-surface px-4 text-[17px] text-text outline-none [color-scheme:dark] focus:border-accent [&::-webkit-date-and-time-value]:text-left";

const buttonClass =
  "flex h-14 w-full items-center justify-center rounded-control font-condensed text-xl font-bold tracking-[0.04em] uppercase disabled:opacity-60";

export function useAddonAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<string | null>, nextHref?: string) {
    setError(null);
    startTransition(async () => {
      const problem = await action().catch(() => SAVE_FAILED);
      if (problem) {
        setError(problem);
      } else if (nextHref) {
        router.push(nextHref);
      }
    });
  }

  return { error, pending, run };
}

export function AddonScreen({ title, children, buttons }: { title: string; children: ReactNode; buttons: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center px-2 pt-safe">
        <Link href="/addons" className="flex min-h-11 w-[72px] flex-none items-center px-2 text-base text-text-2">
          Cancel
        </Link>
        <h1 className="flex-1 text-center font-condensed text-[22px] font-bold">{title}</h1>
        <span aria-hidden="true" className="w-[72px] flex-none" />
      </header>
      <main className="flex flex-1 flex-col gap-5 px-4 pt-7">{children}</main>
      <div className="flex flex-col gap-2.5 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),40px)]">{buttons}</div>
    </div>
  );
}

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="caps-label text-[13px]">{label}</span>
        {children}
      </label>
      {help && <span className="text-[13px] text-label">{help}</span>}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex gap-3 rounded-control border border-note-border bg-note-bg p-3.5">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-px flex-none text-accent"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5M12 7.5v.01" />
      </svg>
      <p className="text-[15px] leading-[1.45]">{children}</p>
    </div>
  );
}

export function Problem({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-sm text-error-text">
      {error}
    </p>
  ) : null;
}

type ButtonProps = { children: ReactNode; disabled: boolean; onClick?: () => void };

export function PrimaryButton({ children, disabled }: ButtonProps) {
  return (
    <button type="submit" form="addon-form" disabled={disabled} className={`${buttonClass} bg-accent text-on-accent`}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, disabled, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${buttonClass} border border-[#3a3a37] text-text`}
    >
      {children}
    </button>
  );
}
