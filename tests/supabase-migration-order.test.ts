import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function readMigration(fileName: string) {
    return readFileSync(join(MIGRATIONS_DIR, fileName), "utf8");
}

describe("supabase migration ordering", () => {
    it("guards privilege changes for atomic RPC functions that may not exist yet", () => {
        const sql0012 = readMigration("0012_atomic_state_mutation_rpc_grants.sql");
        const sql0013 = readMigration("0013_atomic_state_mutation_rpc_execute_grant.sql");

        expect(sql0012).toMatch(/to_regprocedure\('public\._apply_schedule_block_delta\(uuid, jsonb, jsonb\)'\)/i);
        expect(sql0012).toMatch(/to_regprocedure\('public\.apply_user_state_mutation_atomic\(uuid, bigint, bigint, jsonb, jsonb\)'\)/i);
        expect(sql0013).toMatch(/to_regprocedure\('public\.apply_user_state_mutation_atomic\(uuid, bigint, bigint, jsonb, jsonb\)'\)/i);
    });

    it("defines the schedule block helper before the replacement atomic RPC that calls it", () => {
        const sql0014 = readMigration("0014_fix_atomic_rpc_state_version_ambiguity.sql");

        const helperIndex = sql0014.search(/create\s+or\s+replace\s+function\s+public\._apply_schedule_block_delta\s*\(/i);
        const rpcIndex = sql0014.search(/create\s+or\s+replace\s+function\s+public\.apply_user_state_mutation_atomic\s*\(/i);

        expect(helperIndex).toBeGreaterThanOrEqual(0);
        expect(rpcIndex).toBeGreaterThan(helperIndex);
    });
});
