import { useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";

export function useCamera(facing: Facing) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "live" | "unavailable">("starting");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    const start = async () => {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (stopped) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = media;
      const video = videoRef.current;
      if (video) {
        video.srcObject = media;
        await video.play();
      }
      setState("live");
    };
    start().catch(() => {
      if (!stopped) {
        setState("unavailable");
      }
    });
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facing]);

  return { videoRef, state };
}
