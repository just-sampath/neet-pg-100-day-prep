import { NextResponse } from "next/server";

export function ensureCronAuthorization(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const actual = request.headers.get("authorization");

  if (!expected) {
    return NextResponse.json({ error: "Missing CRON_SECRET configuration." }, { status: 500 });
  }

  if (actual !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
