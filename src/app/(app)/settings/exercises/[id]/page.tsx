import { notFound } from "next/navigation";
import { BackHeader } from "@/components/back-header";
import { normalizeAlias } from "@/rules/parse-set";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { SelectRow } from "../../select-row";
import { addAlias, mergeExercise, removeAlias, renameExercise, setArchived, setBodyweight } from "../actions";
import { AliasForm, MergeForm, NameForm } from "../forms";

const kinds = [
  { value: "false", label: "Weighted" },
  { value: "true", label: "Bodyweight" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="caps-label text-[13px]">{title}</h2>
      {children}
    </section>
  );
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwnerSettings();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const supabase = await createSessionClient();
  const { data: exercise, error } = await supabase
    .from("exercises")
    .select("id, name, is_bodyweight, archived, exercise_aliases(alias)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!exercise) {
    notFound();
  }
  const { data: others, error: othersError } = await supabase
    .from("exercises")
    .select("id, name")
    .neq("id", id)
    .eq("is_bodyweight", exercise.is_bodyweight)
    .order("name");
  if (othersError) {
    throw othersError;
  }

  const nameAlias = normalizeAlias(exercise.name);
  const aliases = exercise.exercise_aliases.map((row) => row.alias).filter((alias) => alias !== nameAlias).sort();

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader href="/settings" label="Back to settings" title={exercise.name} />
      <main className="flex flex-col gap-[22px] px-4 pt-1 pb-6">
        <Section title="Name">
          <NameForm
            key={exercise.name}
            action={renameExercise.bind(null, id)}
            defaultName={exercise.name}
            submitLabel="Save"
          />
        </Section>

        <Section title="Type">
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <SelectRow
              label="Load"
              name="is_bodyweight"
              value={String(exercise.is_bodyweight)}
              options={kinds}
              action={setBodyweight.bind(null, id)}
            />
          </div>
        </Section>

        <Section title="Aliases">
          <p className="text-[13px] leading-normal text-text-2">
            Ways to say it in Log. “{nameAlias}” always works.
          </p>
          {aliases.length > 0 && (
            <div className="divide-y divide-divider overflow-hidden rounded-card border border-border bg-surface">
              {aliases.map((alias) => (
                <form
                  key={alias}
                  action={removeAlias.bind(null, alias)}
                  className="flex min-h-12 items-center justify-between gap-3 pl-4"
                >
                  <span className="text-base">{alias}</span>
                  <button
                    type="submit"
                    aria-label={`Remove “${alias}”`}
                    className="min-h-12 px-4 text-sm font-semibold text-error-text"
                  >
                    Remove
                  </button>
                </form>
              ))}
            </div>
          )}
          <AliasForm action={addAlias.bind(null, id)} />
        </Section>

        {others.length > 0 && (
          <Section title="Merge">
            <MergeForm action={mergeExercise.bind(null, id)} name={exercise.name} others={others} />
          </Section>
        )}

        <form
          action={setArchived.bind(null, id, !exercise.archived)}
          className="overflow-hidden rounded-card border border-border bg-surface"
        >
          <button
            type="submit"
            className="flex min-h-[52px] w-full items-center px-4 text-base font-semibold text-accent"
          >
            {exercise.archived ? "Unarchive exercise" : "Archive exercise"}
          </button>
        </form>
      </main>
    </div>
  );
}
