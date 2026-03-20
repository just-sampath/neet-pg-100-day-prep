import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { mutateStore } from "@/lib/data/local-store";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { simulatedNow?: string | null };
  await mutateStore((store) => {
    store.dev.simulatedNowIso = body.simulatedNow ? new Date(body.simulatedNow).toISOString() : null;
  });

  return NextResponse.json({ ok: true });
}
