import Link from "next/link";
import { normalizeAlias } from "@/rules/parse-set";
import { createSessionClient } from "@/server/supabase";

type Exercise = { id: number; name: string; exercise_aliases: { alias: string }[] };

function Chevron() {
  return (
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
      className="flex-none text-label"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const nameAlias = normalizeAlias(exercise.name);
  const aliases = exercise.exercise_aliases.map((row) => row.alias).filter((alias) => alias !== nameAlias);
  return (
    <Link
      href={`/settings/exercises/${exercise.id}`}
      className="flex min-h-14 items-center justify-between gap-3 px-4 py-2"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base font-semibold">{exercise.name}</span>
        {aliases.length > 0 && <span className="truncate text-[13px] text-label">{aliases.sort().join(", ")}</span>}
      </span>
      <Chevron />
    </Link>
  );
}

export async function ExerciseList() {
  const supabase = await createSessionClient();
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, archived, exercise_aliases(alias)")
    .order("name");
  if (error) {
    throw error;
  }
  const archived = exercises.filter((exercise) => exercise.archived);

  return (
    <>
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="caps-label text-[13px]">Exercises</h2>
          <span className="text-[13px] text-label">Aliases are what you can say</span>
        </div>
        <div className="divide-y divide-divider overflow-hidden rounded-card border border-border bg-surface">
          {exercises
            .filter((exercise) => !exercise.archived)
            .map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} />
            ))}
          <Link
            href="/settings/exercises/new"
            className="flex min-h-[52px] items-center gap-2.5 px-4 text-base font-semibold text-accent"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add exercise
          </Link>
        </div>
      </section>
      {archived.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="caps-label text-[13px]">Archived</h2>
          <div className="divide-y divide-divider overflow-hidden rounded-card border border-border bg-surface">
            {archived.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
