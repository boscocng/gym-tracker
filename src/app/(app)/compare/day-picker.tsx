"use client";

import { useRouter } from "next/navigation";
import { formatShortDate } from "@/rules/format";

type Props = { label: string; param: "a" | "b"; pair: { a: string; b: string }; days: string[] };

export function DayPicker({ label, param, pair, days }: Props) {
  const router = useRouter();
  const value = pair[param];
  return (
    <label className="relative flex h-14 items-center justify-between rounded-control border border-border bg-surface pr-3 pl-3.5">
      <span className="flex flex-col gap-0.5">
        <span className="caps-label text-xs">{label}</span>
        <span className="text-[17px] font-semibold">{formatShortDate(value)}</span>
      </span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-label"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
      <select
        aria-label={`${label}: ${formatShortDate(value)}. Change day`}
        value={value}
        onChange={(event) => router.push(`/compare?${new URLSearchParams({ ...pair, [param]: event.target.value })}`)}
        className="absolute inset-0 opacity-0"
      >
        {days.map((day) => (
          <option key={day} value={day}>
            {formatShortDate(day)}
          </option>
        ))}
      </select>
    </label>
  );
}
