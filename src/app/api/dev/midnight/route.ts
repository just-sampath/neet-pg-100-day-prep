import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

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
    getHomeData(store, user.id);
  });

  return NextResponse.json({ ok: true });
}
