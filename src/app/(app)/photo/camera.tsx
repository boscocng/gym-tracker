"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";
import type { Enums } from "@/database.types";
import { savePhoto } from "./actions";
import { CameraControls, CameraTopBar, FilePicker, PoseSwitch, Viewfinder } from "./camera-parts";
import { fileForm, photoForm } from "./encode";
import { type Facing, useCamera } from "./use-camera";

type Pose = Enums<"photo_pose">;
export type Ghost = { url: string; hint: string };
type Props = { dayLabel: string; ghosts: Record<Pose, Ghost | null> };

const COUNTDOWN_SECONDS: Record<Pose, number> = { front: 3, back: 10 };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function useSavePhoto() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(pose: Pose, makeForm: () => Promise<FormData>) {
    setError(null);
    startTransition(async () => {
      const problem = await makeForm()
        .then((form) => {
          form.append("pose", pose);
          return savePhoto(form);
        })
        .catch(() => SAVE_FAILED);
      if (problem) {
        setError(problem);
      } else {
        router.push("/");
      }
    });
  }

  return { error, pending, save };
}

export function Camera({ dayLabel, ghosts }: Props) {
  const [pose, setPose] = useState<Pose>("front");
  const [facing, setFacing] = useState<Facing>("user");
  const [timer, setTimer] = useState(true);
  const [ghostOn, setGhostOn] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { error, pending, save } = useSavePhoto();
  const { videoRef, state } = useCamera(facing);
  const live = state !== "unavailable";
  const ghost = ghosts[pose];

  async function shoot() {
    if (timer) {
      for (let count = COUNTDOWN_SECONDS[pose]; count > 0; count -= 1) {
        setCountdown(count);
        await sleep(1000);
      }
      setCountdown(null);
    }
    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      save(pose, () => photoForm(video, video.videoWidth, video.videoHeight, facing === "user"));
    }
  }

  const notes = [
    ...(live && ghost && ghostOn ? [{ text: ghost.hint }] : []),
    ...(pending && live ? [{ text: "Saving…" }] : []),
    ...(error ? [{ text: error, alert: true }] : []),
  ];

  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      {live ? (
        <Viewfinder
          videoRef={videoRef}
          mirrored={facing === "user"}
          ghostUrl={ghost && ghostOn ? ghost.url : null}
          countdown={countdown}
        />
      ) : (
        <FilePicker busy={pending} onFile={(file) => save(pose, () => fileForm(file))} />
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 pb-[max(env(safe-area-inset-bottom),40px)]">
        <PoseSwitch pose={pose} onChange={setPose} disabled={pending || countdown !== null} />
        {live && (
          <CameraControls
            ghostOn={ghost ? ghostOn : null}
            onGhostChange={setGhostOn}
            canShoot={state === "live" && !pending && countdown === null}
            onShoot={shoot}
            onFlip={() => setFacing(facing === "user" ? "environment" : "user")}
          />
        )}
      </div>
      <CameraTopBar
        title={`${pose === "back" ? "Back photo" : "Photo"} · ${dayLabel}`}
        timer={live ? timer : null}
        seconds={COUNTDOWN_SECONDS[pose]}
        onTimerChange={setTimer}
        notes={notes}
      />
    </main>
  );
}
