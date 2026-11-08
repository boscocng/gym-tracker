import { cookies } from "next/headers";
import { CameraTest } from "./camera-test";
import { DictationTest } from "./dictation-test";
import { DisplayMode } from "./display-mode";
import { SessionTest } from "./session-test";

export default async function Page() {
  const cookieStore = await cookies();

  return (
    <main>
      <h1>Gym tracker spike</h1>
      <p>Throwaway test page for Phase 0. Run all three tests from the Home Screen app.</p>
      <DisplayMode />
      <DictationTest />
      <CameraTest />
      <SessionTest
        serverSession={cookieStore.get("spike_session")?.value ?? null}
        renderedAt={new Date().toISOString()}
      />
    </main>
  );
}
