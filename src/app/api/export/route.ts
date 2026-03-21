import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { readStore } from "@/lib/data/local-store";
import { APP_NAME } from "@/lib/domain/constants";
import { APP_VERSION } from "@/lib/domain/app-meta";
import { getRuntimeMode } from "@/lib/runtime/mode";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await readStore();
  const fileName = `beside-you-export-${new Date().toISOString().slice(0, 10)}.json`;

  return NextResponse.json({
    appName: APP_NAME,
    appVersion: APP_VERSION,
    runtimeMode: getRuntimeMode(),
    exportedAt: new Date().toISOString(),
    user,
    settings: store.userState[user.id].settings,
    state: store.userState[user.id],
    exportFormatVersion: 1,
  }, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
