# Task 1.2: Seed Validation Rules

> **Phase**: 1 - Infrastructure Setup
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 1.1 Database Schema
> **Estimated Effort**: Low

---

## Objective

Populate the `validation_rules` table with the 35 predefined MVP validation rules.

---

## Prerequisites

- [ ] Task 1.1 completed (database schema applied)
- [ ] `validation_rules` table exists

---

## Rules Source

**File**: `MVPScope/VALIDATION_RULES_SEED.json`

Contains 35 rules across categories:
- **Vehicle Rules** (VEH-001 to VEH-006): VIN, SPZ, owner, brand, model, registration date
- **Vendor Individual Rules** (VND-001 to VND-006): Name, personal ID, address fields
- **Vendor Company Rules** (ARES-001 to ARES-004): Company existence, name, VAT ID, age
- **DPH Rules** (DPH-001 to DPH-003): VAT payer status, unreliable payer, bank account
- **VTP Rules** (VTP-001 to VTP-004): VTP document validation (optional, conditional)
  - VTP-001: SPZ consistency with ORV
  - VTP-002: VIN consistency with ORV
  - VTP-003: Owner IČO matches vendor company_id (for ARES validation)
  - VTP-004: Owner name matches vendor
- **Cross-Validation Rules** (XV-001): Owner = Vendor check

> **Note**: VTP rules are conditional - they only run when a VTP document has been uploaded.

---

## Implementation Steps

### Step 1: Prepare Insert Script

The seed JSON needs to be converted to SQL INSERT statements or imported via Supabase.

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to Table Editor → `validation_rules`
2. Click "Insert" → "Import from CSV/JSON"
3. Upload `VALIDATION_RULES_SEED.json`

**Option B: Via Edge Function**
```typescript
// Can use rules-loader.ts fallback mechanism
// It loads from seed file if database is empty
```

**Option C: Via SQL Script**
```sql
-- Example for one rule (repeat for all 30)
INSERT INTO validation_rules (
  rule_id, name, description, category, source_entity, source_field,
  target_entity, target_field, comparison_type, comparison_config,
  severity, failure_action, is_active, version
) VALUES (
  'VEH-001',
  'VIN Match',
  'Porovnání VIN z manuálního zadání vs OCR extrakce z ORV',
  'vehicle',
  'vehicle',
  'vin',
  'ocr_orv',
  'vin',
  'EXACT',
  '{"transforms": ["VIN_NORMALIZE", "UPPERCASE", "REMOVE_SPACES"]}',
  'CRITICAL',
  'RED',
  true,
  1
);
```

### Step 2: Verify Rules Loaded

```sql
SELECT rule_id, name, severity, is_active
FROM validation_rules
ORDER BY rule_id;
```

Expected: 35 rows

### Step 3: Verify Rule Categories

```sql
SELECT category, COUNT(*) as count
FROM validation_rules
GROUP BY category;
```

Expected:
- vehicle: 13 (includes VTP-001, VTP-002)
- vendor_fo: 11
- vendor_po: 9 (includes VTP-003)
- cross: 2 (includes VTP-004)
- (phase2 rules disabled by default)

---

## Validation Criteria

- [ ] 35 rules inserted into `validation_rules` table
- [ ] 25 MVP rules have `is_active = true`
- [ ] 10 Phase 2 rules have `is_active = false`
- [ ] All rules have `version = 1`
- [ ] No duplicate `rule_id` values
- [ ] JSONB fields properly formatted
- [ ] VTP rules (VTP-001 to VTP-004) have proper conditions for optional document

---

## Sample Query to Test Rules

```sql
-- Get all CRITICAL rules
SELECT rule_id, name, source_field, target_field
FROM validation_rules
WHERE severity = 'CRITICAL' AND is_active = true;
```

---

## Notes

- Rules are stored as JSON for dynamic updates without code deployment
- The `rules-loader.ts` in validation-run function has fallback to seed file
- Rule versioning enables tracking changes over time

---

## Completion Checklist

- [ ] All 35 rules seeded (25 MVP + 10 Phase 2)
- [ ] VTP rules (VTP-001 to VTP-004) included
- [ ] Verified via SQL queries
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
