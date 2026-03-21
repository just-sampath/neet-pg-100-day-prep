import { readRepoFile, createDownloadHeaders } from "@/lib/server/repo-docs";

export async function GET() {
  const file = await readRepoFile("specs/beside-you-prd.md");
  return new Response(file, {
    headers: createDownloadHeaders({
      contentType: "text/markdown; charset=utf-8",
      fileName: "beside-you-prd.md",
      inline: true,
    }),
  });
}
