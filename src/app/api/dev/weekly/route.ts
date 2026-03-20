import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { runWeeklySummaryAutomation } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { IST_TIME_ZONE, toDateOnlyInTimeZone } from "@/lib/utils/date";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const now = store.dev.simulatedNowIso ?? new Date().toISOString();
    runWeeklySummaryAutomation(userState, userState.settings, toDateOnlyInTimeZone(now, IST_TIME_ZONE));
  });

  return NextResponse.json({ ok: true });
}
