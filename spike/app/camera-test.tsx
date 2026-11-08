"use client";

import { useEffect, useRef, useState } from "react";

type Facing = "user" | "environment";

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function describeTrack(stream: MediaStream): string {
  const track = stream.getVideoTracks()[0];
  if (!track) return "no video track";
  const settings = track.getSettings();
  const fps = settings.frameRate ? Math.round(settings.frameRate) : "?";
  return `track ${settings.width ?? "?"} x ${settings.height ?? "?"} at ${fps} fps, facing ${settings.facingMode ?? "unknown"}`;
}

export function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [permission, setPermission] = useState("checking…");
  const [status, setStatus] = useState("Camera off.");

  useEffect(() => {
    let active = true;
    if (!navigator.permissions) {
      setPermission("Permissions API not available");
    } else {
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((result) => {
          if (!active) return;
          setPermission(`${result.state} (at page load)`);
          result.onchange = () => setPermission(`${result.state} (changed after load)`);
        })
        .catch((error: unknown) => setPermission(`query failed: ${describeError(error)}`));
    }
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function start(nextFacing: Facing) {
    stopTracks();
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacing(nextFacing);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus(`Live: ${describeTrack(stream)}`);
    } catch (error) {
      setStatus(`getUserMedia failed: ${describeError(error)}`);
    }
  }

  function showFrameSize() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    setStatus(`Live: ${describeTrack(streamRef.current)}; frame ${video.videoWidth} x ${video.videoHeight}`);
  }

  return (
    <section>
      <h2>2. Camera</h2>
      <p>
        Tap Start camera and note whether iOS asks for permission. Then fully close the app (swipe it
        away in the app switcher), reopen it, and tap Start camera again. Did it ask again?
      </p>
      <pre>{`Camera permission: ${permission}\n${status}`}</pre>
      <div className="viewer">
        <video ref={videoRef} playsInline muted autoPlay onLoadedMetadata={showFrameSize} />
        <img src="/ghost.svg" alt="" />
      </div>
      <div className="row">
        <button className="primary" type="button" onClick={() => start(facing)}>
          Start camera
        </button>
        <button type="button" onClick={() => start(facing === "user" ? "environment" : "user")}>
          Flip
        </button>
        <button
          type="button"
          onClick={() => {
            stopTracks();
            setStatus("Camera off.");
          }}
        >
          Stop
        </button>
      </div>
    </section>
  );
}
