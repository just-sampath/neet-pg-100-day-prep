import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { generateWeeklySummary } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { toDateOnly, weekBounds } from "@/lib/utils/date";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const now = store.dev.simulatedNowIso ?? new Date().toISOString();
    const week = weekBounds(toDateOnly(now));
    const summary = generateWeeklySummary(userState, userState.settings, week.start);
    userState.weeklySummaries[summary.id] = summary;
  });

  return NextResponse.json({ ok: true });
}
