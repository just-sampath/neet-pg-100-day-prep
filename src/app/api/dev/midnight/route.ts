import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { runMidnightRollover } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { getCurrentDayNumber } from "@/lib/domain/schedule";
import { IST_TIME_ZONE, toDateOnlyInTimeZone } from "@/lib/utils/date";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await mutateStore((store) => {
    const base = store.dev.simulatedNowIso ? new Date(store.dev.simulatedNowIso) : new Date();
    const advanced = new Date(base);
    advanced.setDate(advanced.getDate() + 1);
    advanced.setHours(0, 1, 0, 0);
    store.dev.simulatedNowIso = advanced.toISOString();
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(advanced, IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState, todayDate);
    runMidnightRollover(userState, userState.settings, todayDate, todayDayNumber, store.referenceData);
  });

  return NextResponse.json({ ok: true });
}
