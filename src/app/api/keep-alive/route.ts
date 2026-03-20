import { NextResponse } from "next/server";

import { ensureCronAuthorization } from "@/lib/server/cron-auth";
import { runKeepAliveCheck } from "@/lib/server/automation-jobs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = ensureCronAuthorization(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await runKeepAliveCheck();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Keep-alive failed.",
      },
      { status: 500 },
    );
  }
}
