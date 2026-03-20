import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { createEmptyUserState, mutateStore } from "@/lib/data/local-store";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await mutateStore((store) => {
    store.userState[user.id] = createEmptyUserState();
    store.sessions = {};
    store.dev.simulatedNowIso = null;
  });

  return NextResponse.json({ ok: true });
}
