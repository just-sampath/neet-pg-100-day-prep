import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function readMigration(fileName: string) {
    return readFileSync(join(MIGRATIONS_DIR, fileName), "utf8");
}

function readAllMigrations() {
    return readdirSync(MIGRATIONS_DIR)
        .filter((entry) => entry.endsWith(".sql"))
        .sort()
        .map((entry) => readFileSync(join(MIGRATIONS_DIR, entry), "utf8"))
        .join("\n");
}

function getLatestAtomicRpcDefinition(sql: string) {
    const parts = sql.split(/create\s+or\s+replace\s+function\s+public\.apply_user_state_mutation_atomic\s*\(/i);
    return parts.at(-1) ?? "";
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

    it("uses a slot-safe schedule assignment delta helper in the latest atomic RPC", () => {
        const sql = readAllMigrations();
        const latestRpc = getLatestAtomicRpcDefinition(sql);

        expect(sql).toMatch(/create\s+or\s+replace\s+function\s+public\._apply_schedule_topic_assignment_delta\s*\(/i);
        expect(sql).toMatch(/row_number\(\)\s+over/i);
        expect(sql).toMatch(/set\s+item_order\s*=\s*\(-30000\s*\+\s*changed\.parking_order\)::smallint/i);
        expect(sql).toMatch(/on\s+conflict\s*\(\s*user_id\s*,\s*source_item_id\s*\)\s+do\s+update/i);
        expect(sql).not.toMatch(/target\.day_number\s*=\s*changed\.day_number[\s\S]*target\.block_key\s*=\s*changed\.block_key[\s\S]*target\.item_order\s*=\s*changed\.item_order/i);
        expect(latestRpc).toMatch(/perform\s+public\._apply_schedule_topic_assignment_delta\s*\(/i);
        expect(latestRpc).not.toMatch(/'schedule_topic_assignments'::regclass[\s\S]*?'source_item_id'/i);
    });
});
