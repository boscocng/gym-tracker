import { redirect } from "next/navigation";
import { SkipFlow } from "@/components/skip/skip-flow";
import { skipCountWith } from "@/rules/day-status";
import { readLockState } from "@/server/lock";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

export default async function MissedDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const settings = await requireOwnerSettings();
  const { today, history, unresolved } = await readLockState(await createSessionClient(), settings);
  if (!unresolved.includes(date)) {
    redirect("/resolve");
  }
  const extraDays = unresolved.filter((day) => day !== date);

  return (
    <SkipFlow
      variant="missed"
      day={date}
      extraDays={extraDays}
      rest={null}
      skipCount={skipCountWith([date], today, history)}
      skipCountAll={skipCountWith(unresolved, today, history)}
      backHref="/resolve"
    />
  );
}
