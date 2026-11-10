import { trainingDay } from "@/rules/training-day";
import { requireOwnerSettings } from "@/server/settings";
import { NewAddonForm } from "../addon-forms";

export default async function NewAddonPage() {
  const settings = await requireOwnerSettings();
  return <NewAddonForm today={trainingDay(new Date(), settings.time_zone, settings.rollover_hour)} />;
}
