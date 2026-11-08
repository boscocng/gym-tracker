"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function DisplayMode() {
  const standalone = useSyncExternalStore<boolean | null>(subscribe, isStandalone, () => null);

  if (standalone === null) return <p>Checking display mode…</p>;
  if (standalone) return <p className="ok">Running as a Home Screen app.</p>;
  return (
    <p className="warn">
      Running in a Safari tab. Tap Share, then Add to Home Screen, and open the app from there.
    </p>
  );
}
