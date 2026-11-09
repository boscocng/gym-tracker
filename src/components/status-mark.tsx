import type { DayStatus } from "@/rules/day-status";

// Status is never shown by color alone: trained and rest are filled dots, skipped is a hollow ring.
export function StatusMark({ status, className = "" }: { status: DayStatus | null; className?: string }) {
  if (status === "trained") {
    return <span aria-hidden="true" className={`size-[7px] rounded-full bg-accent ${className}`} />;
  }
  if (status === "rest") {
    return <span aria-hidden="true" className={`size-[7px] rounded-full bg-rest ${className}`} />;
  }
  if (status === "skipped") {
    return <span aria-hidden="true" className={`size-[9px] rounded-full border-[1.5px] border-text ${className}`} />;
  }
  return null;
}
