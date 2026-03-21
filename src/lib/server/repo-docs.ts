import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readRepoFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath));
}

export function createDownloadHeaders(options: {
  contentType: string;
  fileName: string;
  inline?: boolean;
}) {
  return {
    "Content-Type": options.contentType,
    "Content-Disposition": `${options.inline ? "inline" : "attachment"}; filename="${options.fileName}"`,
    "Cache-Control": "no-store",
  };
}
