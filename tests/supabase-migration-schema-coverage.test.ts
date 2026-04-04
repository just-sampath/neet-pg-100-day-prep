import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const DOMAIN_TYPES_PATH = join(process.cwd(), "src", "lib", "domain", "types.ts");

const EXPECTED_COLUMNS_BY_TABLE: Record<string, string[]> = {
  app_settings: [
    "user_id",
    "day_one_date",
    "theme",
    "schedule_shift_days",
    "shift_applied_at",
    "shift_events",
    "schedule_seed_version",
    "schedule_seeded_at",
    "quote_state",
    "processed_dates",
    "morning_revision_selections",
    "morning_revision_actual_minutes",
    "morning_revision_auto_add_notice",
    "simulated_now_iso",
    "state_version",
    "write_lock_token",
    "write_lock_expires_at",
  ],
  schedule_days: [
    "user_id",
    "day_number",
    "original_day_number",
    "phase_id",
    "phase_name",
    "phase_group",
    "primary_focus_raw",
    "primary_focus_parts",
    "primary_focus_subject_ids",
    "resource_raw",
    "resource_parts",
    "deliverable_raw",
    "notes_raw",
    "source_minutes",
    "buffer_minutes",
    "planned_study_minutes",
    "total_study_hours",
    "gt_test_type",
    "gt_plan_ref",
    "mapped_date",
    "original_mapped_date",
    "traffic_light",
    "traffic_light_updated_at",
    "is_extension_day",
    "shift_hidden_reason",
    "merged_partner_day",
    "created_at",
    "updated_at",
  ],
  schedule_blocks: [
    "user_id",
    "day_number",
    "block_key",
    "slot_order",
    "start_time",
    "end_time",
    "duration_minutes",
    "timeline_kind",
    "display_label",
    "semantic_block_key",
    "block_intent",
    "trackable",
    "raw_text",
    "recovery_lane",
    "phase_fence",
    "default_revision_eligible",
    "reschedulable",
    "traffic_light_green",
    "traffic_light_yellow",
    "traffic_light_red",
    "backlog_when_hidden",
    "actual_start",
    "actual_end",
    "timing_note",
    "timing_updated_at",
    "created_at",
    "updated_at",
  ],
  schedule_topic_assignments: [
    "user_id",
    "source_item_id",
    "day_number",
    "block_key",
    "item_order",
    "kind",
    "label",
    "raw_text",
    "planned_minutes",
    "subject_ids",
    "revision_eligible",
    "recovery_lane",
    "phase_fence",
    "notes",
    "revision_type",
    "reference_label",
    "reference_day_number",
    "status",
    "completed_at",
    "source_tag",
    "note",
    "is_pinned",
    "is_recovery",
    "original_day_number",
    "original_block_key",
    "created_at",
    "updated_at",
  ],
  phase_config: [
    "user_id",
    "phase_number",
    "phase_id",
    "original_start_day",
    "original_end_day",
    "extension_budget",
    "extensions_used",
    "current_start_day",
    "current_end_day",
    "created_at",
    "updated_at",
  ],
  revision_completions: [
    "user_id",
    "revision_id",
    "source_item_id",
    "source_day",
    "source_block_key",
    "revision_type",
    "completed_at",
  ],
  backlog_items: [
    "id",
    "user_id",
    "source_item_id",
    "original_day",
    "original_block_key",
    "original_start",
    "original_end",
    "priority_order",
    "topic_description",
    "subject",
    "subject_ids",
    "subject_tier",
    "planned_minutes",
    "source_tag",
    "recovery_lane",
    "phase_fence",
    "phase",
    "manual_sort_override",
    "status",
    "suggested_day",
    "suggested_block_key",
    "suggested_note",
    "rescheduled_to_day",
    "rescheduled_to_block_key",
    "created_at",
    "updated_at",
    "completed_at",
    "dismissed_at",
  ],
  mcq_bulk_logs: [
    "id",
    "user_id",
    "entry_date",
    "total_attempted",
    "correct",
    "wrong",
    "subject",
    "source",
    "created_at",
  ],
  mcq_item_logs: [
    "id",
    "user_id",
    "entry_date",
    "mcq_id",
    "result",
    "subject",
    "topic",
    "source",
    "cause_code",
    "priority",
    "correct_rule",
    "what_fooled_me",
    "fix_codes",
    "tags",
    "created_at",
  ],
  gt_logs: [
    "id",
    "user_id",
    "gt_number",
    "gt_date",
    "day_number",
    "score",
    "correct",
    "wrong",
    "unattempted",
    "air_percentile",
    "device",
    "attempted_live",
    "overall_feeling",
    "section_a",
    "section_b",
    "section_c",
    "section_d",
    "section_e",
    "error_types",
    "recurring_topics",
    "weakest_subjects",
    "knowledge_vs_behaviour",
    "unsure_right_count",
    "change_before_next_gt",
    "created_at",
  ],
  weekly_summaries: [
    "id",
    "user_id",
    "week_key",
    "week_start_date",
    "week_end_date",
    "payload",
    "generated_at",
  ],
  automation_job_runs: [
    "id",
    "job_name",
    "run_key",
    "status",
    "timezone",
    "scheduled_date",
    "processed_users",
    "metadata",
    "started_at",
    "finished_at",
  ],
};

function readAllMigrationSql() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((entry) => entry.endsWith(".sql"))
    .sort();

  return files.map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8")).join("\n\n");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTableColumn(sql: string, table: string, column: string) {
  const tablePattern = escapeRegExp(table);
  const columnPattern = escapeRegExp(column);

  const createTablePattern = new RegExp(
    `create\\s+table\\s+if\\s+not\\s+exists\\s+${tablePattern}\\s*\\(([\\s\\S]*?)\\);`,
    "i",
  );
  const createTableBlock = sql.match(createTablePattern)?.[1] ?? "";
  if (new RegExp(`\\b${columnPattern}\\b`, "i").test(createTableBlock)) {
    return true;
  }

  const addColumnPattern = new RegExp(
    `alter\\s+table\\s+(?:if\\s+exists\\s+)?${tablePattern}[\\s\\S]*?add\\s+column\\s+if\\s+not\\s+exists\\s+${columnPattern}\\b`,
    "i",
  );
  return addColumnPattern.test(sql);
}

function parseStringUnion(content: string, typeName: string) {
  const match = content.match(new RegExp(`export\\s+type\\s+${escapeRegExp(typeName)}\\s*=([\\s\\S]*?);`));
  if (!match) {
    return [];
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

describe("supabase migrations schema coverage", () => {
  it("cover all runtime-write columns for app tables", () => {
    const sql = readAllMigrationSql();

    for (const [table, columns] of Object.entries(EXPECTED_COLUMNS_BY_TABLE)) {
      for (const column of columns) {
        expect(
          hasTableColumn(sql, table, column),
          `Missing migration column ${table}.${column}`,
        ).toBe(true);
      }
    }
  });

  it("include all backlog source-tag and status enum values used by runtime types", () => {
    const sql = readAllMigrationSql();
    const typesFile = readFileSync(DOMAIN_TYPES_PATH, "utf8");
    const sourceTags = parseStringUnion(typesFile, "BacklogSourceTag");
    const statuses = parseStringUnion(typesFile, "BacklogStatus");

    for (const value of sourceTags) {
      expect(
        sql.includes(`'${value}'`),
        `Missing migration constraint value for BacklogSourceTag: ${value}`,
      ).toBe(true);
    }

    for (const value of statuses) {
      expect(
        sql.includes(`'${value}'`),
        `Missing migration constraint value for BacklogStatus: ${value}`,
      ).toBe(true);
    }
  });
});
