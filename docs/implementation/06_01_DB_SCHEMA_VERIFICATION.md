# Task 6.1: Database Schema Verification

> **Task ID**: 06_01
> **Status**: [x] Complete
> **Depends On**: None
> **Estimated Time**: 1 hour

---

## Objective

Verify that all required database tables, functions, and policies exist for the Rules Management API. Apply any missing schema elements from the design specification.

---

## Prerequisites

- Supabase CLI installed and configured
- Access to Supabase project (local or remote)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured

---

## Required Schema Elements

### Tables

| Table | Purpose | Expected Status |
|-------|---------|-----------------|
| `validation_rules` | Stores rule definitions | Exists (Phase 1) |
| `validation_results` | Validation execution results | Exists (Phase 1) |
| `validation_audit_log` | Audit trail for all operations | Exists (Phase 1) |
| `rule_change_history` | Tracks rule version changes | May need creation |

### Functions

| Function | Purpose |
|----------|---------|
| `get_active_validation_rules()` | Retrieve all active rules |
| `get_active_validation_rules_filtered(vendor_type, buying_type)` | Filtered active rules |
| `compute_rules_snapshot_hash()` | SHA-256 hash of active rules |

### Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_rules_rule_id` | validation_rules | rule_id | Fast lookup by ID |
| `idx_rules_active` | validation_rules | is_active | Active rules query |
| `idx_rules_entity` | validation_rules | source_entity | Filter by entity |

---

## Implementation Steps

### Step 1: Check Existing Schema

Run this query to verify existing tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'validation_rules',
  'validation_results',
  'validation_audit_log',
  'rule_change_history'
);
```

### Step 2: Check Existing Functions

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_active_validation_rules',
  'get_active_validation_rules_filtered',
  'compute_rules_snapshot_hash'
);
```

### Step 3: Create Missing Elements

If `rule_change_history` is missing, create it:

```sql
-- supabase/migrations/020_rule_change_history.sql

CREATE TABLE IF NOT EXISTS rule_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(20) NOT NULL,
    version_from INTEGER,
    version_to INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'DELETE', 'CLONE')),
    changed_by VARCHAR(255),
    change_summary TEXT,
    previous_definition JSONB,
    new_definition JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying history by rule
CREATE INDEX IF NOT EXISTS idx_rule_history_rule_id
ON rule_change_history(rule_id);

-- Index for recent changes
CREATE INDEX IF NOT EXISTS idx_rule_history_created
ON rule_change_history(created_at DESC);

-- Enable RLS
ALTER TABLE rule_change_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read history
CREATE POLICY rule_history_auth_read ON rule_change_history
    FOR SELECT TO authenticated
    USING (true);

-- Policy: Only service role can write
CREATE POLICY rule_history_service_write ON rule_change_history
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
```

### Step 4: Create/Update Functions

If functions are missing or need updates:

```sql
-- supabase/migrations/021_rules_functions.sql

-- Get all active validation rules
CREATE OR REPLACE FUNCTION get_active_validation_rules()
RETURNS TABLE(
    id UUID,
    rule_id VARCHAR(20),
    rule_definition JSONB,
    version INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vr.id,
        vr.rule_id,
        vr.rule_definition,
        vr.version,
        vr.created_at,
        vr.updated_at
    FROM validation_rules vr
    WHERE vr.is_active = true
    AND vr.is_draft = false
    ORDER BY vr.rule_id;
END;
$$;

-- Get filtered active rules by vendor/buying type
CREATE OR REPLACE FUNCTION get_active_validation_rules_filtered(
    p_vendor_type TEXT DEFAULT NULL,
    p_buying_type TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    rule_id VARCHAR(20),
    rule_definition JSONB,
    version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vr.id,
        vr.rule_id,
        vr.rule_definition,
        vr.version
    FROM validation_rules vr
    WHERE vr.is_active = true
    AND vr.is_draft = false
    AND (
        p_vendor_type IS NULL
        OR vr.rule_definition->'applies_to'->'vendor_type' IS NULL
        OR vr.rule_definition->'applies_to'->'vendor_type' @> to_jsonb(p_vendor_type)
    )
    AND (
        p_buying_type IS NULL
        OR vr.rule_definition->'applies_to'->'buying_type' IS NULL
        OR vr.rule_definition->'applies_to'->'buying_type' @> to_jsonb(p_buying_type)
    )
    ORDER BY vr.rule_id;
END;
$$;

-- Compute snapshot hash of active rules
CREATE OR REPLACE FUNCTION compute_rules_snapshot_hash()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rules_json TEXT;
BEGIN
    SELECT STRING_AGG(
        vr.rule_id || ':' || vr.version::TEXT || ':' || vr.rule_definition::TEXT,
        '|' ORDER BY vr.rule_id
    )
    INTO rules_json
    FROM validation_rules vr
    WHERE vr.is_active = true AND vr.is_draft = false;

    IF rules_json IS NULL THEN
        RETURN encode(sha256(''::bytea), 'hex');
    END IF;

    RETURN encode(sha256(rules_json::bytea), 'hex');
END;
$$;
```

### Step 5: Verify Indexes

```sql
-- Check existing indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'validation_rules';

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_rules_rule_id
ON validation_rules(rule_id);

CREATE INDEX IF NOT EXISTS idx_rules_active
ON validation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_rules_entity
ON validation_rules((rule_definition->>'source_entity'));
```

### Step 6: Apply Migrations

```bash
# Local development
supabase db push

# Or apply specific migration
supabase migration up 020_rule_change_history
supabase migration up 021_rules_functions
```

---

## Test Cases

### TC-6.1.1: Verify Tables Exist

```bash
# Query via REST API
curl "$SUPABASE_URL/rest/v1/validation_rules?select=count" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

Expected: Returns count (should be 35 if seeded)

### TC-6.1.2: Test Active Rules Function

```sql
SELECT COUNT(*) FROM get_active_validation_rules();
```

Expected: 25 (MVP active rules)

### TC-6.1.3: Test Filtered Function

```sql
SELECT * FROM get_active_validation_rules_filtered('COMPANY', NULL);
```

Expected: Returns rules that apply to companies

### TC-6.1.4: Test Hash Function

```sql
SELECT compute_rules_snapshot_hash();
```

Expected: 64-character hex string

---

## Validation Criteria

- [x] `validation_rules` table exists with correct columns
- [x] `rule_change_history` table exists
- [x] `get_active_validation_rules()` function works
- [x] `get_active_validation_rules_filtered()` function works
- [x] `compute_rules_snapshot_hash()` function returns valid hash
- [x] All required indexes exist
- [x] RLS policies are in place

---

## Troubleshooting

### Issue: Function doesn't exist

**Solution**: Run the migration that creates the function:
```bash
supabase db push
```

### Issue: Permission denied on function

**Solution**: Grant execute permission:
```sql
GRANT EXECUTE ON FUNCTION get_active_validation_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_validation_rules_filtered(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION compute_rules_snapshot_hash() TO authenticated;
```

### Issue: Missing sha256 function

**Solution**: Enable pgcrypto extension:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## Completion Checklist

When this task is complete:
1. All tables verified/created
2. All functions verified/created
3. All indexes verified/created
4. RLS policies in place
5. Test queries return expected results

**Mark as complete**: Update tracker status to `[x] Complete`
