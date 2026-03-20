import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { readStore } from "@/lib/data/local-store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await readStore();
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user,
    settings: store.userState[user.id].settings,
    state: store.userState[user.id],
  });
}
