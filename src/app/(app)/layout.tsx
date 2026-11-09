import type { ReactNode } from "react";
import { requireOwnerSettings } from "@/server/settings";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireOwnerSettings();
  return children;
}
