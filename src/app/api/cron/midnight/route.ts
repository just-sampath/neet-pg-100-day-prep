import { NextResponse } from "next/server";

import { ensureCronAuthorization } from "@/lib/server/cron-auth";
import { runMidnightCronJob } from "@/lib/server/automation-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = ensureCronAuthorization(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await runMidnightCronJob();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Midnight cron failed.",
      },
      { status: 500 },
    );
  }
}
