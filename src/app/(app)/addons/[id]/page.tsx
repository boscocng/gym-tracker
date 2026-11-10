import { notFound } from "next/navigation";
import { latestPeriod } from "@/rules/addons";
import { trainingDay } from "@/rules/training-day";
import { readAddon } from "@/server/addons";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";
import { ActiveAddonForm, StoppedAddonForm } from "../addon-forms";

export default async function AddonPage({ params }: { params: Promise<{ id: string }> }) {
  const settings = await requireOwnerSettings();
  const { id } = await params;
  const addon = /^\d{1,15}$/.test(id) ? await readAddon(await createSessionClient(), Number(id)) : null;
  const period = addon && latestPeriod(addon.periods);
  if (!addon || !period) {
    notFound();
  }
  const props = {
    addon: { id: addon.id, name: addon.name },
    period,
    today: trainingDay(new Date(), settings.time_zone, settings.rollover_hour),
  };
  return period.endDay === null ? <ActiveAddonForm {...props} /> : <StoppedAddonForm {...props} />;
}
