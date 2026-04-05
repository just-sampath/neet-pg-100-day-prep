# Supabase SQL Runbook

## Schedule-Day Release Gate

Run this immediately after applying migrations in a hosted environment:

```bash
psql "$SUPABASE_DB_URL" -f supabase/sql/006_schedule_days_release_gate.sql
```

Release must be blocked if the script exits non-zero.

The gate enforces:

- non-extension `schedule_days` rows never have `original_day_number = null`
- non-extension workbook anchors (`original_day_number`) are unique per user
- extension rows do not carry `original_day_number`
