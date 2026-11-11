"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SAVE_FAILED } from "@/components/messages";
import type { Enums } from "@/database.types";
import { savePhoto } from "./actions";
import { CameraControls, CameraTopBar, FilePicker } from "./camera-parts";
import { fileForm, photoForm } from "./encode";
import { PoseOutline } from "./pose-outline";
import { type Facing, useCamera } from "./use-camera";

type Props = { title: string; ghost: { url: string; hint: string } | null };

const COUNTDOWN_SECONDS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function useSavePhoto() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(pose: Enums<"photo_pose">, makeForm: () => Promise<FormData>) {
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

export function Camera({ title, ghost }: Props) {
  const [facing, setFacing] = useState<Facing>("user");
  const [timer, setTimer] = useState(true);
  const [ghostOn, setGhostOn] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { error, pending, save } = useSavePhoto();
  const { videoRef, state } = useCamera(facing);
  const live = state !== "unavailable";

  async function shoot() {
    if (timer) {
      for (let count = COUNTDOWN_SECONDS; count > 0; count -= 1) {
        setCountdown(count);
        await sleep(1000);
      }
      setCountdown(null);
    }
    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      save("front", () => photoForm(video, video.videoWidth, video.videoHeight, facing === "user"));
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
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label="Camera view"
            className={`absolute inset-0 size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
          />
          {ghost && ghostOn && (
            <Image src={ghost.url} alt="" fill unoptimized className="pointer-events-none object-cover opacity-35" />
          )}
          <PoseOutline />
          {countdown !== null && (
            <span
              aria-live="assertive"
              className="absolute inset-0 flex items-center justify-center font-condensed text-[120px] font-bold drop-shadow-lg"
            >
              {countdown}
            </span>
          )}
          <CameraControls
            ghostOn={ghost ? ghostOn : null}
            onGhostChange={setGhostOn}
            canShoot={state === "live" && !pending && countdown === null}
            onShoot={shoot}
            onFlip={() => setFacing(facing === "user" ? "environment" : "user")}
          />
        </>
      ) : (
        <FilePicker busy={pending} onFile={(file) => save("front", () => fileForm(file))} />
      )}
      <CameraTopBar title={title} timer={live ? timer : null} onTimerChange={setTimer} notes={notes} />
    </main>
  );
}
