import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { runWeeklySummaryAutomation } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const now = store.dev.simulatedNowIso ?? new Date().toISOString();
    runWeeklySummaryAutomation(userState, userState.settings, now, store.referenceData);
  });

  return NextResponse.json({ ok: true });
}
