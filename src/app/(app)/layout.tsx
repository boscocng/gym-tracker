import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { readLockState } from "@/server/lock";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const settings = await requireOwnerSettings();
  const { unresolved } = await readLockState(await createSessionClient(), settings);
  if (unresolved.length > 0) {
    redirect("/resolve");
  }
  return children;
}
