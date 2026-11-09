import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { LogScreen } from "@/app/(app)/(tabs)/log/log-screen";
import { readLog } from "@/app/(app)/(tabs)/log/read-log";
import { dayStatus } from "@/rules/day-status";
import { formatDayLabel } from "@/rules/format";
import { readLockState } from "@/server/lock";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient } from "@/server/supabase";

const withoutTabBar = { "--tab-bar-height": "0px" } as CSSProperties;

export default async function LogMissedDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const settings = await requireOwnerSettings();
  const supabase = await createSessionClient();
  const { today, history } = await readLockState(supabase, settings);
  const status = date < today ? dayStatus(date, today, history) : null;
  if (status !== "unresolved" && status !== "trained") {
    redirect("/resolve");
  }

  return (
    <div style={withoutTabBar}>
      <LogScreen
        {...await readLog(supabase, settings.unit, date)}
        day={date}
        doneHref="/resolve"
        dayLabel={formatDayLabel(date)}
      />
    </div>
  );
}
