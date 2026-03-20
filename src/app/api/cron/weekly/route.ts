import { NextResponse } from "next/server";

import { ensureCronAuthorization } from "@/lib/server/cron-auth";
import { runWeeklySummaryCronJob } from "@/lib/server/automation-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = ensureCronAuthorization(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await runWeeklySummaryCronJob();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Weekly summary cron failed.",
      },
      { status: 500 },
    );
  }
}
