export function PlaceholderPage({ title, phase }: { title: string; phase: number }) {
  return (
    <main className="flex flex-col gap-3 px-4 pt-safe">
      <h1 className="font-condensed text-[40px] leading-none font-bold">{title}</h1>
      <p className="text-[15px] text-text-2">Arrives in Phase {phase}.</p>
    </main>
  );
}
