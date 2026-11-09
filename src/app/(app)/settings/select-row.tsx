"use client";

import { useState } from "react";

type Option = { value: string; label: string };

type Props = {
  label: string;
  name: string;
  value: string;
  options: readonly Option[];
  action: (formData: FormData) => Promise<void>;
};

export function SelectRow({ label, name, value, options, action }: Props) {
  const [current, setCurrent] = useState(value);
  const selected = options.find((option) => option.value === current)?.label ?? current;

  return (
    <form action={action}>
      <label className="relative flex min-h-14 items-center justify-between gap-3 px-4">
        <span className="text-base">{label}</span>
        <span className="flex min-w-0 items-center gap-1 text-text-2">
          <span className="truncate">{selected}</span>
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
            className="flex-none"
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
        </span>
        <select
          name={name}
          value={current}
          aria-label={label}
          onChange={(event) => {
            setCurrent(event.target.value);
            event.currentTarget.form?.requestSubmit();
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
