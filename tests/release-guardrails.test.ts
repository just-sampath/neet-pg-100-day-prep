import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const SOURCE_ROOTS = ["src/app", "src/components", "src/lib"];
const FORBIDDEN_WEB_APIS: Array<{ label: string; pattern: RegExp }> = [
  { label: "notification permission prompts", pattern: /\bNotification\.requestPermission\s*\(/u },
  { label: "direct browser notifications", pattern: /\bnew\s+Notification\s*\(/u },
  { label: "service-worker notifications", pattern: /\bshowNotification\s*\(/u },
  { label: "Push API usage", pattern: /\bPushManager\b/u },
  { label: "background sync usage", pattern: /\bperiodicSync\b/u },
  { label: "browser share API usage", pattern: /\bnavigator\.share\s*\(/u },
];

function collectFiles(relativeDir: string): string[] {
  const absoluteDir = join(process.cwd(), relativeDir);
  const entries = readdirSync(absoluteDir);
  const files: string[] = [];

  for (const entry of entries) {
    if (entry === "generated") {
      continue;
    }

    const absolutePath = join(absoluteDir, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      files.push(...collectFiles(join(relativeDir, entry)));
      continue;
    }

    if (CODE_EXTENSIONS.has(extname(entry))) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("release hardening guardrails", () => {
  it("keeps shipped source free of push, reminder, and social web APIs", () => {
    const files = [...SOURCE_ROOTS.flatMap(collectFiles), join(process.cwd(), "proxy.ts"), join(process.cwd(), "public/sw.js")];

    for (const file of files) {
      const contents = readFileSync(file, "utf8");
      for (const check of FORBIDDEN_WEB_APIS) {
        expect(contents, `${check.label} should not appear in ${file}`).not.toMatch(check.pattern);
      }
    }
  });

  it("keeps the service worker online-first and install-only", () => {
    const serviceWorker = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

    expect(serviceWorker).toContain('const OFFLINE_CACHE = "beside-you-offline-v1";');
    expect(serviceWorker).toContain('const OFFLINE_URL = "/offline.html";');
    expect(serviceWorker).toContain('if (event.request.mode !== "navigate")');
    expect(serviceWorker).toContain("event.respondWith(fetch(event.request));");
    expect(serviceWorker).toContain("cache.match(OFFLINE_URL)");
    expect(serviceWorker).not.toMatch(/\bshowNotification\s*\(/u);
    expect(serviceWorker).not.toMatch(/addEventListener\(\s*"push"/u);
    expect(serviceWorker).not.toMatch(/addEventListener\(\s*"notificationclick"/u);
  });
});
