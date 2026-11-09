import type { ReactNode } from "react";
import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pb-[calc(72px+env(safe-area-inset-bottom))]">{children}</div>
      <TabBar />
    </>
  );
}
