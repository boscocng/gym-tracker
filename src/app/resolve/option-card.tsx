import Link from "next/link";

const ICONS = {
  trained: { color: "text-accent", path: "M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" },
  rest: { color: "text-rest-icon", path: "M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" },
  missed: { color: "text-text", path: "M12 7.5v5.5M12 16.5v.01M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z" },
};

type Props = {
  icon: keyof typeof ICONS;
  title: string;
  detail: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const cardClass =
  "flex min-h-[76px] w-full items-center gap-3.5 rounded-card border border-border bg-surface px-3.5 py-3 text-left disabled:opacity-60";

export function OptionCard({ icon, title, detail, href, onClick, disabled }: Props) {
  const content = (
    <>
      <span className={`flex size-11 flex-none items-center justify-center rounded-icon bg-surface-2 ${ICONS[icon].color}`}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={ICONS[icon].path} />
        </svg>
      </span>
      <span className="flex flex-1 flex-col gap-[3px]">
        <span className="text-[17px] font-semibold">{title}</span>
        <span className="text-sm text-text-2">{detail}</span>
      </span>
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
        className="flex-none text-label"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cardClass}>
      {content}
    </button>
  );
}
