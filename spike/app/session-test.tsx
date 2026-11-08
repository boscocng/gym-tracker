"use client";

import { useState, useSyncExternalStore } from "react";

const SERVER_COOKIE = "spike_session";
const BROWSER_COOKIE = "spike_js";
const FOUR_HUNDRED_DAYS = 400 * 24 * 60 * 60;

function subscribe(): () => void {
  return () => {};
}

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function useCookie(name: string): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(subscribe, () => readCookie(name), () => undefined);
}

function show(value: string | null | undefined): string {
  if (value === undefined) return "checking…";
  return value ?? "none";
}

type Props = { serverSession: string | null; renderedAt: string };

export function SessionTest({ serverSession, renderedAt }: Props) {
  const serverCookieInBrowser = useCookie(SERVER_COOKIE);
  const browserCookie = useCookie(BROWSER_COOKIE);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    await fetch("/api/session", { method: "POST" });
    const now = encodeURIComponent(new Date().toISOString());
    document.cookie = `${BROWSER_COOKIE}=${now}; Path=/; Max-Age=${FOUR_HUNDRED_DAYS}; SameSite=Lax; Secure`;
    window.location.reload();
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/session", { method: "DELETE" });
    document.cookie = `${BROWSER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    window.location.reload();
  }

  return (
    <section>
      <h2>3. Session</h2>
      <p>
        Tap Sign in. Then fully close the app and reopen it. If the sign-in times below are unchanged,
        the session survived. Optional: restart the phone and check again.
      </p>
      <pre>
        {[
          `Signed in (server-set cookie, as the server saw it): ${serverSession ?? "no"}`,
          `Server-set cookie, as the page sees it: ${show(serverCookieInBrowser)}`,
          `Browser-set cookie (document.cookie): ${show(browserCookie)}`,
          `Page rendered by the server at: ${renderedAt}`,
          "All times are UTC.",
        ].join("\n")}
      </pre>
      <div className="row">
        <button className="primary" type="button" onClick={signIn} disabled={busy}>
          Sign in
        </button>
        <button type="button" onClick={signOut} disabled={busy}>
          Sign out
        </button>
      </div>
    </section>
  );
}
