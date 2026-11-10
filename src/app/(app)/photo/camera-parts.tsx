import Link from "next/link";
import type { ReactNode } from "react";

const glass = "bg-[rgba(13,13,12,0.75)]";

function Icon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type TopBarProps = {
  title: string;
  timer: boolean | null;
  onTimerChange: (timer: boolean) => void;
  notes: { text: string; alert?: boolean }[];
};

export function CameraTopBar({ title, timer, onTimerChange, notes }: TopBarProps) {
  return (
    <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-5 px-4 pt-safe">
      <div className="flex w-full items-center justify-between gap-3">
        <Link href="/" aria-label="Close camera" className={`flex size-11 items-center justify-center rounded-full ${glass}`}>
          <Icon size={20}>
            <path d="M6 6l12 12M18 6 6 18" />
          </Icon>
        </Link>
        <span className={`rounded-full px-3.5 py-2 font-condensed text-[15px] font-semibold tracking-[0.04em] ${glass}`}>
          {title}
        </span>
        {timer === null ? (
          <span className="size-11" />
        ) : (
          <button
            type="button"
            aria-label="Self-timer, 3 seconds"
            aria-pressed={timer}
            onClick={() => onTimerChange(!timer)}
            className={`size-11 rounded-full border-[1.5px] font-condensed text-base font-bold ${glass} ${timer ? "border-accent" : "border-transparent text-text-2"}`}
          >
            3s
          </button>
        )}
      </div>
      {notes.map((note) => (
        <p
          key={note.text}
          role={note.alert ? "alert" : undefined}
          className={`rounded-full bg-[rgba(13,13,12,0.8)] px-3.5 py-2 text-center text-sm ${note.alert ? "text-error-text" : ""}`}
        >
          {note.text}
        </p>
      ))}
    </div>
  );
}

type ControlsProps = {
  ghostOn: boolean | null;
  onGhostChange: (on: boolean) => void;
  canShoot: boolean;
  onShoot: () => void;
  onFlip: () => void;
};

export function CameraControls({ ghostOn, onGhostChange, canShoot, onShoot, onFlip }: ControlsProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 items-center pb-[max(env(safe-area-inset-bottom),40px)]">
      {ghostOn === null ? (
        <span />
      ) : (
        <button
          type="button"
          aria-pressed={ghostOn}
          onClick={() => onGhostChange(!ghostOn)}
          className={`flex h-11 items-center gap-1.5 justify-self-center rounded-full border-[1.5px] bg-[rgba(13,13,12,0.8)] px-3.5 text-sm font-semibold ${ghostOn ? "border-accent" : "border-transparent text-text-2"}`}
        >
          <Icon size={18}>
            <path d="M12 3a7 7 0 0 0-7 7v11l2.5-2 2.5 2 2-2 2 2 2.5-2 2.5 2V10a7 7 0 0 0-7-7z" />
            <path d="M9.5 10v.01M14.5 10v.01" />
          </Icon>
          Ghost
        </button>
      )}
      <button
        type="button"
        aria-label="Take photo"
        disabled={!canShoot}
        onClick={onShoot}
        className="flex size-[78px] items-center justify-center justify-self-center rounded-full border-4 border-text disabled:opacity-50"
      >
        <span aria-hidden="true" className="size-[62px] rounded-full bg-text" />
      </button>
      <button
        type="button"
        aria-label="Flip camera"
        onClick={onFlip}
        className="flex size-[52px] items-center justify-center justify-self-center rounded-full bg-[rgba(13,13,12,0.8)]"
      >
        <Icon size={22}>
          <path d="M4 10a8 8 0 0 1 14-4l2 2" />
          <path d="M20 4v4h-4" />
          <path d="M20 14a8 8 0 0 1-14 4l-2-2" />
          <path d="M4 20v-4h4" />
        </Icon>
      </button>
    </div>
  );
}

export function FilePicker({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
      <span className="text-accent">
        <Icon size={40}>
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </Icon>
      </span>
      <p className="text-base text-text-2">
        The live camera isn’t available, so this opens the iPhone camera, without the ghost.
      </p>
      <label
        className={`flex h-[52px] items-center rounded-control bg-accent px-6 font-condensed text-lg font-bold text-on-accent ${busy ? "opacity-60" : ""}`}
      >
        {busy ? "Saving…" : "Take photo"}
        <input
          type="file"
          accept="image/*"
          capture
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              onFile(file);
            }
          }}
        />
      </label>
    </div>
  );
}
