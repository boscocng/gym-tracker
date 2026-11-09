import Link from "next/link";
import { ordinal } from "@/rules/day-status";
import { formatShortDate } from "@/rules/format";

type Props = {
  variant: "today" | "missed";
  days: readonly string[];
  reason: string;
  skipCount: number;
  backHref: string;
  pending: boolean;
  error: string | null;
  onEdit: () => void;
  onConfirm: () => void;
};

function confirmLabel(variant: Props["variant"], days: readonly string[]): string {
  if (variant === "today") {
    return "Yes, skip today";
  }
  return days.length === 1 ? `Yes, skip ${formatShortDate(days[0])}` : `Yes, skip all ${days.length} days`;
}

export function SkipConfirm({ variant, days, reason, skipCount, backHref, pending, error, onEdit, onConfirm }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center px-3 pt-safe">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-11 items-center gap-1 rounded-icon pr-2 pl-1 text-[15px] text-text-2"
        >
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
          >
            <path d="m15 5-7 7 7 7" />
          </svg>
          Edit reason
        </button>
      </header>
      <main className="flex flex-1 flex-col gap-[18px] px-5 pt-10">
        <span className="caps-label text-[13px]">Your excuse</span>
        <blockquote className="rounded-[18px] border border-border bg-surface px-5 py-[22px] font-condensed text-[30px] leading-[1.15] font-semibold break-words">
          “{reason.trim()}”
        </blockquote>
        <h1 className="mt-[22px] font-condensed text-[44px] leading-none font-bold">Is this a valid excuse?</h1>
        <p className="text-base leading-[1.45] text-text-2">
          {days.length === 1 ? (
            <>
              This would be your <strong className="font-semibold text-text">{ordinal(skipCount)} skip</strong> in the
              last 30 days.
            </>
          ) : (
            <>
              That makes <strong className="font-semibold text-text">{skipCount} skips</strong> in the last 30 days.
            </>
          )}{" "}
          Skips stay on your calendar for good.
        </p>
        {error && (
          <p role="alert" className="text-sm text-error-text">
            {error}
          </p>
        )}
      </main>
      <div className="flex flex-col items-stretch gap-2 px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
        <Link
          href={backHref}
          className="flex h-16 items-center justify-center rounded-card bg-accent font-condensed text-2xl font-bold tracking-[0.04em] text-on-accent uppercase"
        >
          {variant === "today" ? "I’ll train" : "Go back"}
        </Link>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="flex min-h-11 items-center self-center px-3 text-[15px] text-text-2 underline underline-offset-[3px] disabled:opacity-60"
        >
          {confirmLabel(variant, days)}
        </button>
      </div>
    </div>
  );
}
