import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const DOCS_WITH_MIGRATION_LISTS = [
  "docs/deployment.md",
  "docs/local-development.md",
  "docs/operations.md",
];

function getExistingMigrationPaths() {
  const migrationDir = join(process.cwd(), "supabase", "migrations");
  const migrationFiles = readdirSync(migrationDir).filter((entry) => entry.endsWith(".sql"));
  return new Set(migrationFiles.map((file) => `supabase/migrations/${file}`));
}

function getReferencedMigrationPaths(docPath: string) {
  const contents = readFileSync(join(process.cwd(), docPath), "utf8");
  const matches = contents.match(/supabase\/migrations\/[0-9]{4}_[a-z0-9_]+\.sql/gu);
  return matches ?? [];
}

describe("deployment docs migration references", () => {
  it("reference only migration files that exist in supabase/migrations", () => {
    const existing = getExistingMigrationPaths();

    for (const docPath of DOCS_WITH_MIGRATION_LISTS) {
      const referenced = getReferencedMigrationPaths(docPath);
      expect(referenced.length, `${docPath} should reference migration files`).toBeGreaterThan(0);
      for (const migrationPath of referenced) {
        expect(
          existing.has(migrationPath),
          `${docPath} references missing migration ${migrationPath}`,
        ).toBe(true);
      }
    }
  });
});
