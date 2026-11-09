import Link from "next/link";
import { Constants } from "@/database.types";
import { formatHour } from "@/rules/format";
import { requireOwnerSettings } from "@/server/settings";
import { signOut, updateRestRule, updateRolloverHour, updateTimeZone, updateUnit } from "./actions";
import { ScaleStatus } from "./scale-status";
import { SelectRow } from "./select-row";

const hours = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: formatHour(hour) }));
const restRules = [
  { value: "six_of_seven", label: "6 of 7" },
  { value: "strict", label: "Strict" },
];
const timeZones = Intl.supportedValuesOf("timeZone");

function zoneOptions(current: string) {
  const zones = timeZones.includes(current) ? timeZones : [current, ...timeZones];
  return zones.map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") }));
}

export default async function SettingsPage() {
  const settings = await requireOwnerSettings();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4 pt-safe pb-3.5">
        <Link
          href="/"
          aria-label="Back to home"
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
        <h1 className="font-condensed text-[32px] leading-none font-bold">Settings</h1>
      </header>

      <main className="flex flex-col gap-[22px] px-4 pt-1 pb-6">
        <section className="flex flex-col gap-2">
          <h2 className="caps-label text-[13px]">Weight unit</h2>
          <form
            action={updateUnit}
            role="group"
            aria-label="Weight unit"
            className="grid grid-cols-2 gap-1 rounded-control border border-border bg-surface p-1"
          >
            {Constants.public.Enums.weight_unit.map((unit) => (
              <button
                key={unit}
                type="submit"
                name="unit"
                value={unit}
                aria-pressed={settings.unit === unit}
                className={`h-11 rounded-[10px] font-condensed text-lg font-bold ${settings.unit === unit ? "bg-accent text-on-accent" : "text-text-2"}`}
              >
                {unit}
              </button>
            ))}
          </form>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="caps-label text-[13px]">General</h2>
          <div className="divide-y divide-divider overflow-hidden rounded-card border border-border bg-surface">
            <SelectRow
              label="New day starts at"
              name="rollover_hour"
              value={String(settings.rollover_hour)}
              options={hours}
              action={updateRolloverHour}
            />
            <SelectRow
              label="Time zone"
              name="time_zone"
              value={settings.time_zone}
              options={zoneOptions(settings.time_zone)}
              action={updateTimeZone}
            />
            <SelectRow
              label="Rest rule"
              name="rest_rule"
              value={settings.rest_rule}
              options={restRules}
              action={updateRestRule}
            />
            <ScaleStatus settings={settings} />
          </div>
        </section>

        <form action={signOut} className="overflow-hidden rounded-card border border-border bg-surface">
          <button type="submit" className="flex min-h-[52px] w-full items-center px-4 text-base font-semibold text-accent">
            Sign out
          </button>
        </form>
      </main>
    </div>
  );
}
