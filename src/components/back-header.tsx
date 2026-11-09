import Link from "next/link";

type Props = { href: string; label: string; title: string };

export function BackHeader({ href, label, title }: Props) {
  return (
    <header className="flex items-center gap-3 px-4 pt-safe pb-3.5">
      <Link
        href={href}
        aria-label={label}
        className="flex size-11 flex-none items-center justify-center rounded-icon border border-border bg-surface"
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
      </Link>
      <h1 className="min-w-0 font-condensed text-[32px] leading-none font-bold break-words">{title}</h1>
    </header>
  );
}
