import { BackHeader } from "@/components/back-header";
import { requireOwnerSettings } from "@/server/settings";
import { createExercise } from "../actions";
import { NameForm } from "../forms";

export default async function NewExercisePage() {
  await requireOwnerSettings();

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader href="/settings" label="Back to settings" title="New exercise" />
      <main className="flex flex-col gap-2 px-4 pt-1 pb-6">
        <h2 className="caps-label text-[13px]">Name</h2>
        <NameForm action={createExercise} submitLabel="Add exercise" withBodyweight />
        <p className="text-[13px] leading-normal text-text-2">
          Its name works as something you can say. Add more ways to say it after.
        </p>
      </main>
    </div>
  );
}
