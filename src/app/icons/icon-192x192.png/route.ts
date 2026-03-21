import { createPwaIconResponse } from "@/lib/server/pwa-icon";

export function GET() {
  return createPwaIconResponse({ size: 192 });
}
