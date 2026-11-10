export function Chip({ label, note }: { label: string; note: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-surface-2 px-3 py-[7px] text-sm font-medium">
      {label}
      {note && <span className="text-label">{note}</span>}
    </span>
  );
}
