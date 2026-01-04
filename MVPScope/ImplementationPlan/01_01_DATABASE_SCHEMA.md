# Task 1.1: Database Schema Migration

> **Phase**: 1 - Infrastructure Setup
> **Status**: [x] Implemented
> **Priority**: Critical (Blocks all other tasks)
> **Estimated Effort**: Low

---

## Objective

Apply the database schema to Supabase PostgreSQL to create all required tables for the MVP.

---

## Prerequisites

- [x] Supabase project created
- [x] Supabase connection verified (npm run test:db)
- [ ] Environment variables configured (.env)

---

## Schema Source

**File**: `MVPScope/DB_SCHEMA_DYNAMIC_RULES.sql`

---

## Tables to Create

| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `buying_opportunities` | Main entity (SPZ as business key) | None |
| `vehicles` | Vehicle data with OCR mappings | buying_opportunities |
| `vendors` | Seller data (FO/PO) | buying_opportunities |
| `ocr_extractions` | OCR processing results | None (SPZ-linked) |
| `validation_rules` | Dynamic rules (JSON) | None |
| `validation_results` | Validation outputs | buying_opportunities |
| `validation_audit_log` | Audit trail | None |
| `ares_validations` | ARES/ADIS cache | buying_opportunities |
| `rule_change_history` | Rule version tracking | validation_rules |

---

## Implementation Steps

### Step 1: Verify Current State

```bash
# Check if tables already exist
supabase db diff
```

### Step 2: Apply Migration

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `DB_SCHEMA_DYNAMIC_RULES.sql`
3. Execute

**Option B: Via CLI Migration**
```bash
# Create migration file
supabase migration new initial_schema

# Copy schema SQL to the migration file
# Then apply:
supabase db push
```

### Step 3: Verify Tables Created

```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

Expected output:
- buying_opportunities
- vehicles
- vendors
- ocr_extractions
- validation_rules
- validation_results
- validation_audit_log
- ares_validations
- rule_change_history

### Step 4: Verify Indexes

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public';
```

---

## Validation Criteria

- [ ] All 9 tables created successfully
- [ ] All indexes created
- [ ] Foreign key constraints active
- [ ] CHECK constraints active (status enums, vendor_type, etc.)
- [ ] No migration errors

---

## Rollback Plan

```sql
-- If needed, drop all tables (DANGER: destructive)
DROP TABLE IF EXISTS rule_change_history CASCADE;
DROP TABLE IF EXISTS validation_audit_log CASCADE;
DROP TABLE IF EXISTS validation_results CASCADE;
DROP TABLE IF EXISTS ares_validations CASCADE;
DROP TABLE IF EXISTS ocr_extractions CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS buying_opportunities CASCADE;
DROP TABLE IF EXISTS validation_rules CASCADE;
```

---

## Notes

- Schema includes JSONB columns for flexibility (extracted_data, field_validations, etc.)
- SPZ-based linking for OCR extractions follows ACBS pattern
- Audit log captures all validation events for compliance

---

## Completion Checklist

- [ ] Schema applied successfully
- [ ] All tables verified
- [ ] Indexes verified
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
