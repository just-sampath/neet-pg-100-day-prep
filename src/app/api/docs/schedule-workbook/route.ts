import { readRepoFile, createDownloadHeaders } from "@/lib/server/repo-docs";

export async function GET() {
  const file = await readRepoFile("resources/neet_pg_2026_100_day_schedule.xlsx");
  return new Response(file, {
    headers: createDownloadHeaders({
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: "neet-pg-2026-100-day-schedule.xlsx",
    }),
  });
}
