"use client";

import { type FormEvent, useState } from "react";
import { type DetailsChange, type Period, planDetailsChange } from "@/rules/addons";
import { formatShortDate } from "@/rules/format";
import { createAddon, restartAddon, saveActiveAddon, saveStoppedAddon, stopAddon } from "./actions";
import {
  AddonScreen,
  Field,
  inputClass,
  Note,
  PrimaryButton,
  Problem,
  SecondaryButton,
  useAddonAction,
} from "./form-parts";

const START_HELP = "Pick an earlier day if you started before today.";

type AddonProps = { addon: { id: number; name: string }; period: Period; today: string };

function onSubmit(handler: () => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler();
  };
}

function DateInput(props: { value: string; onChange: (day: string) => void; min?: string; max: string }) {
  return (
    <input
      type="date"
      value={props.value}
      min={props.min}
      max={props.max}
      onChange={(event) => props.onChange(event.target.value)}
      required
      className={inputClass}
    />
  );
}

function NameAndDetails(props: {
  name: string;
  details: string;
  onName: (name: string) => void;
  onDetails: (details: string) => void;
}) {
  return (
    <>
      <Field label="Name">
        <input
          value={props.name}
          onChange={(event) => props.onName(event.target.value)}
          maxLength={60}
          required
          placeholder="Creatine"
          className={inputClass}
        />
      </Field>
      <Field label="Details">
        <input
          value={props.details}
          onChange={(event) => props.onDetails(event.target.value)}
          maxLength={200}
          placeholder="5 g daily"
          className={inputClass}
        />
      </Field>
    </>
  );
}

export function NewAddonForm({ today }: { today: string }) {
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [start, setStart] = useState(today);
  const { error, pending, run } = useAddonAction();

  return (
    <AddonScreen title="New add-on" buttons={<PrimaryButton disabled={pending}>Add add-on</PrimaryButton>}>
      <form
        id="addon-form"
        onSubmit={onSubmit(() => run(() => createAddon({ name, details, start }), "/addons"))}
        className="flex flex-col gap-5"
      >
        <NameAndDetails name={name} details={details} onName={setName} onDetails={setDetails} />
        <Field label="Starts" help={START_HELP}>
          <DateInput value={start} max={today} onChange={setStart} />
        </Field>
        <Problem error={error} />
      </form>
    </AddonScreen>
  );
}

function ChangeNote({ period, change }: { period: Period; change: DetailsChange }) {
  if (change.kind === "rewrite") {
    return (
      <Note>The current period started that day, so this corrects its details instead of starting a new one.</Note>
    );
  }
  if (change.kind !== "split") {
    return null;
  }
  return (
    <Note>
      Changing details starts a new period.{" "}
      <span className="text-text-2">
        {formatShortDate(period.startDay)} to {formatShortDate(change.closesOn)} stays in your history{" "}
        {period.details ? `as “${period.details}”` : "with no details"}.
      </span>
    </Note>
  );
}

export function ActiveAddonForm({ addon, period, today }: AddonProps) {
  const [name, setName] = useState(addon.name);
  const [details, setDetails] = useState(period.details);
  const [start, setStart] = useState(today);
  const { error, pending, run } = useAddonAction();
  const change = planDetailsChange(period, details.trim(), start, today);

  const buttons = (
    <>
      <PrimaryButton disabled={pending}>{change.kind === "split" ? "Start new period" : "Save"}</PrimaryButton>
      <SecondaryButton disabled={pending} onClick={() => run(() => stopAddon(addon.id))}>
        Stop {addon.name}
      </SecondaryButton>
    </>
  );
  return (
    <AddonScreen title="Edit add-on" buttons={buttons}>
      <form
        id="addon-form"
        onSubmit={onSubmit(() => run(() => saveActiveAddon(addon.id, { name, details, start }), "/addons"))}
        className="flex flex-col gap-5"
      >
        <NameAndDetails name={name} details={details} onName={setName} onDetails={setDetails} />
        <ChangeNote period={period} change={change} />
        {change.kind !== "unchanged" && (
          <Field label="New period starts" help={START_HELP}>
            <DateInput value={start} max={today} onChange={setStart} />
          </Field>
        )}
        <Problem error={error ?? (change.kind === "error" ? change.message : null)} />
      </form>
    </AddonScreen>
  );
}

export function StoppedAddonForm({ addon, period, today }: AddonProps) {
  const [name, setName] = useState(addon.name);
  const [lastDay, setLastDay] = useState(period.endDay ?? today);
  const { error, pending, run } = useAddonAction();

  const buttons = (
    <>
      <PrimaryButton disabled={pending}>Save</PrimaryButton>
      <SecondaryButton disabled={pending} onClick={() => run(() => restartAddon(addon.id))}>
        Start again
      </SecondaryButton>
    </>
  );
  return (
    <AddonScreen title="Edit add-on" buttons={buttons}>
      <form
        id="addon-form"
        onSubmit={onSubmit(() => run(() => saveStoppedAddon(addon.id, { name, lastDay }), "/addons"))}
        className="flex flex-col gap-5"
      >
        <Field label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            required
            className={inputClass}
          />
        </Field>
        <p className="text-[15px] leading-[1.45] text-text-2">
          Stopped. Its last period started {formatShortDate(period.startDay)}
          {period.details ? ` as “${period.details}”` : ""}.
        </p>
        <Field label="Last day" help="The last day you were on it.">
          <DateInput value={lastDay} min={period.startDay} max={today} onChange={setLastDay} />
        </Field>
        <Problem error={error} />
      </form>
    </AddonScreen>
  );
}
