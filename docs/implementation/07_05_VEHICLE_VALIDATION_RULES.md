# Task 7.5: Vehicle Validation Rules

> **Phase**: 7 - Vehicle Data Schema Extension
> **Status**: [ ] Pending
> **Priority**: Medium
> **Depends On**: 07_01, 07_02
> **Estimated Effort**: 1.5 hours

---

## Objective

Create new validation rules for Phase 7 vehicle data:
- **10-day re-registration fraud check** (datum_posledni_preregistrace)
- **Tachometer consistency preparation** (for future Cebia integration)
- **Color consistency** between ORV and VTP
- **Fuel type consistency** between documents

---

## Prerequisites

- [ ] Task 07_01 completed (database columns exist)
- [ ] Task 07_02 completed (OCR populates new fields)

---

## Architecture Reference

See: [PHASE7_00_ARCHITECTURE.md](./PHASE7_00_ARCHITECTURE.md)

### New Rules Overview

| Rule ID | Name | Severity | Purpose |
|---------|------|----------|---------|
| VEH-010 | 10-Day Re-registration Check | WARNING | Detect potential fraud |
| VEH-011 | Tachometer Present | INFO | Ensure mileage captured |
| VEH-012 | Color Consistency | INFO | Cross-document validation |
| VEH-013 | Fuel Type Consistency | INFO | Cross-document validation |

---

## Implementation Steps

### Step 1: Add Rules to Seed File

Update file: `docs/architecture/VALIDATION_RULES_SEED.json`

Add the following rules:

```json
{
  "id": "VEH-010",
  "name": "10-Day Re-registration Check",
  "description": "Verifies vehicle was not re-registered within last 10 business days (potential fraud indicator)",
  "enabled": true,
  "source": {
    "entity": "vehicle",
    "field": "datum_posledni_preregistrace",
    "transforms": ["NORMALIZE_DATE"]
  },
  "target": {
    "entity": "system",
    "field": "validation_date",
    "transforms": ["NORMALIZE_DATE"]
  },
  "comparison": {
    "type": "DATE_TOLERANCE",
    "toleranceDays": 10,
    "direction": "MIN_DAYS_BEFORE"
  },
  "severity": "WARNING",
  "blockOnFail": false,
  "errorMessage": {
    "cs": "Vozidlo bylo přeregistrováno v posledních 10 pracovních dnech - vyžaduje manuální kontrolu",
    "en": "Vehicle was re-registered within the last 10 business days - manual review required"
  },
  "metadata": {
    "category": "vehicle",
    "phase": "phase7",
    "requiresDocument": "VTP",
    "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
    "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
    "priority": 15,
    "tags": ["fraud-detection", "10-day-rule", "phase7"]
  }
},
{
  "id": "VEH-011",
  "name": "Tachometer Present",
  "description": "Verifies that tachometer reading was provided for fraud detection",
  "enabled": true,
  "source": {
    "entity": "vehicle",
    "field": "tachometer_km",
    "transforms": []
  },
  "target": {
    "entity": "constant",
    "value": null
  },
  "comparison": {
    "type": "NOT_EXISTS"
  },
  "severity": "INFO",
  "blockOnFail": false,
  "errorMessage": {
    "cs": "Stav tachometru nebyl zadán - doporučeno pro kontrolu manipulace",
    "en": "Tachometer reading not provided - recommended for tampering detection"
  },
  "metadata": {
    "category": "vehicle",
    "phase": "phase7",
    "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
    "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
    "priority": 50,
    "tags": ["tachometer", "cebia-prep", "phase7"]
  }
},
{
  "id": "VEH-012",
  "name": "Color Consistency",
  "description": "Verifies vehicle color matches between ORV and VTP documents",
  "enabled": true,
  "source": {
    "entity": "ocr_orv",
    "field": "color",
    "transforms": ["UPPERCASE", "TRIM"]
  },
  "target": {
    "entity": "ocr_vtp",
    "field": "color",
    "transforms": ["UPPERCASE", "TRIM"]
  },
  "comparison": {
    "type": "EXACT",
    "caseSensitive": false
  },
  "severity": "INFO",
  "blockOnFail": false,
  "condition": {
    "type": "BOTH_PRESENT",
    "entities": ["ocr_orv", "ocr_vtp"]
  },
  "errorMessage": {
    "cs": "Barva vozidla se liší mezi dokumenty ORV a VTP",
    "en": "Vehicle color differs between ORV and VTP documents"
  },
  "metadata": {
    "category": "vehicle",
    "phase": "phase7",
    "requiresDocument": ["ORV", "VTP"],
    "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
    "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
    "priority": 60,
    "tags": ["cross-validation", "ocr", "phase7"]
  }
},
{
  "id": "VEH-013",
  "name": "Fuel Type Consistency",
  "description": "Verifies fuel type matches between ORV and VTP documents",
  "enabled": true,
  "source": {
    "entity": "ocr_orv",
    "field": "fuelType",
    "transforms": ["UPPERCASE", "TRIM"]
  },
  "target": {
    "entity": "ocr_vtp",
    "field": "fuelType",
    "transforms": ["UPPERCASE", "TRIM"]
  },
  "comparison": {
    "type": "EXACT",
    "caseSensitive": false
  },
  "severity": "INFO",
  "blockOnFail": false,
  "condition": {
    "type": "BOTH_PRESENT",
    "entities": ["ocr_orv", "ocr_vtp"]
  },
  "errorMessage": {
    "cs": "Typ paliva se liší mezi dokumenty ORV a VTP",
    "en": "Fuel type differs between ORV and VTP documents"
  },
  "metadata": {
    "category": "vehicle",
    "phase": "phase7",
    "requiresDocument": ["ORV", "VTP"],
    "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
    "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
    "priority": 61,
    "tags": ["cross-validation", "ocr", "phase7"]
  }
}
```

### Step 2: Create Database Migration for Rules

Create file: `supabase/migrations/015_vehicle_validation_rules.sql`

```sql
-- ============================================================================
-- Migration 015: Phase 7 Vehicle Validation Rules
-- ============================================================================
-- Purpose: Add validation rules for new Phase 7 vehicle fields
-- Created: 2026-01-06
-- Phase: 7.5
-- ============================================================================

-- VEH-010: 10-Day Re-registration Check
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, created_by)
VALUES (
    'VEH-010',
    '{
      "id": "VEH-010",
      "name": "10-Day Re-registration Check",
      "description": "Verifies vehicle was not re-registered within last 10 business days (potential fraud indicator)",
      "enabled": true,
      "source": {
        "entity": "vehicle",
        "field": "datum_posledni_preregistrace",
        "transforms": ["NORMALIZE_DATE"]
      },
      "target": {
        "entity": "system",
        "field": "validation_date",
        "transforms": ["NORMALIZE_DATE"]
      },
      "comparison": {
        "type": "DATE_TOLERANCE",
        "toleranceDays": 10,
        "direction": "MIN_DAYS_BEFORE"
      },
      "severity": "WARNING",
      "blockOnFail": false,
      "errorMessage": {
        "cs": "Vozidlo bylo přeregistrováno v posledních 10 pracovních dnech - vyžaduje manuální kontrolu",
        "en": "Vehicle was re-registered within the last 10 business days - manual review required"
      },
      "metadata": {
        "category": "vehicle",
        "phase": "phase7",
        "requiresDocument": "VTP",
        "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
        "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
        "priority": 15,
        "tags": ["fraud-detection", "10-day-rule", "phase7"]
      }
    }'::jsonb,
    true,
    false,
    'phase7-migration'
)
ON CONFLICT (rule_id, version) DO UPDATE
SET rule_definition = EXCLUDED.rule_definition,
    is_active = EXCLUDED.is_active,
    is_draft = EXCLUDED.is_draft,
    updated_at = NOW(),
    updated_by = 'phase7-migration';

-- VEH-011: Tachometer Present
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, created_by)
VALUES (
    'VEH-011',
    '{
      "id": "VEH-011",
      "name": "Tachometer Present",
      "description": "Verifies that tachometer reading was provided for fraud detection",
      "enabled": true,
      "source": {
        "entity": "vehicle",
        "field": "tachometer_km",
        "transforms": []
      },
      "target": {
        "entity": "constant",
        "value": null
      },
      "comparison": {
        "type": "EXISTS"
      },
      "severity": "INFO",
      "blockOnFail": false,
      "errorMessage": {
        "cs": "Stav tachometru nebyl zadán - doporučeno pro kontrolu manipulace",
        "en": "Tachometer reading not provided - recommended for tampering detection"
      },
      "metadata": {
        "category": "vehicle",
        "phase": "phase7",
        "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
        "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
        "priority": 50,
        "tags": ["tachometer", "cebia-prep", "phase7"]
      }
    }'::jsonb,
    true,
    false,
    'phase7-migration'
)
ON CONFLICT (rule_id, version) DO UPDATE
SET rule_definition = EXCLUDED.rule_definition,
    is_active = EXCLUDED.is_active,
    is_draft = EXCLUDED.is_draft,
    updated_at = NOW(),
    updated_by = 'phase7-migration';

-- VEH-012: Color Consistency
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, created_by)
VALUES (
    'VEH-012',
    '{
      "id": "VEH-012",
      "name": "Color Consistency",
      "description": "Verifies vehicle color matches between ORV and VTP documents",
      "enabled": true,
      "source": {
        "entity": "ocr_orv",
        "field": "color",
        "transforms": ["UPPERCASE", "TRIM"]
      },
      "target": {
        "entity": "ocr_vtp",
        "field": "color",
        "transforms": ["UPPERCASE", "TRIM"]
      },
      "comparison": {
        "type": "EXACT",
        "caseSensitive": false
      },
      "severity": "INFO",
      "blockOnFail": false,
      "condition": {
        "type": "BOTH_PRESENT",
        "entities": ["ocr_orv", "ocr_vtp"]
      },
      "errorMessage": {
        "cs": "Barva vozidla se liší mezi dokumenty ORV a VTP",
        "en": "Vehicle color differs between ORV and VTP documents"
      },
      "metadata": {
        "category": "vehicle",
        "phase": "phase7",
        "requiresDocument": ["ORV", "VTP"],
        "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
        "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
        "priority": 60,
        "tags": ["cross-validation", "ocr", "phase7"]
      }
    }'::jsonb,
    true,
    false,
    'phase7-migration'
)
ON CONFLICT (rule_id, version) DO UPDATE
SET rule_definition = EXCLUDED.rule_definition,
    is_active = EXCLUDED.is_active,
    is_draft = EXCLUDED.is_draft,
    updated_at = NOW(),
    updated_by = 'phase7-migration';

-- VEH-013: Fuel Type Consistency
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, created_by)
VALUES (
    'VEH-013',
    '{
      "id": "VEH-013",
      "name": "Fuel Type Consistency",
      "description": "Verifies fuel type matches between ORV and VTP documents",
      "enabled": true,
      "source": {
        "entity": "ocr_orv",
        "field": "fuelType",
        "transforms": ["UPPERCASE", "TRIM"]
      },
      "target": {
        "entity": "ocr_vtp",
        "field": "fuelType",
        "transforms": ["UPPERCASE", "TRIM"]
      },
      "comparison": {
        "type": "EXACT",
        "caseSensitive": false
      },
      "severity": "INFO",
      "blockOnFail": false,
      "condition": {
        "type": "BOTH_PRESENT",
        "entities": ["ocr_orv", "ocr_vtp"]
      },
      "errorMessage": {
        "cs": "Typ paliva se liší mezi dokumenty ORV a VTP",
        "en": "Fuel type differs between ORV and VTP documents"
      },
      "metadata": {
        "category": "vehicle",
        "phase": "phase7",
        "requiresDocument": ["ORV", "VTP"],
        "applicableTo": ["PHYSICAL_PERSON", "COMPANY"],
        "applicableToBuyingType": ["BRANCH", "MOBILE_BUYING"],
        "priority": 61,
        "tags": ["cross-validation", "ocr", "phase7"]
      }
    }'::jsonb,
    true,
    false,
    'phase7-migration'
)
ON CONFLICT (rule_id, version) DO UPDATE
SET rule_definition = EXCLUDED.rule_definition,
    is_active = EXCLUDED.is_active,
    is_draft = EXCLUDED.is_draft,
    updated_at = NOW(),
    updated_by = 'phase7-migration';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
```

### Step 3: Update Validation Engine for DATE_TOLERANCE

Add to `supabase/functions/validation-run/comparators.ts`:

```typescript
/**
 * DATE_TOLERANCE comparator - checks if date is within tolerance
 * Supports MIN_DAYS_BEFORE direction for fraud detection
 */
export function compareDateTolerance(
  sourceValue: string,
  targetValue: string,
  toleranceDays: number,
  direction: 'MIN_DAYS_BEFORE' | 'MAX_DAYS_AFTER' | 'WITHIN_RANGE' = 'WITHIN_RANGE'
): ComparisonResult {
  try {
    const sourceDate = new Date(sourceValue);
    const targetDate = new Date(targetValue);

    if (isNaN(sourceDate.getTime()) || isNaN(targetDate.getTime())) {
      return { match: false, reason: 'Invalid date format' };
    }

    const diffDays = Math.floor((targetDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (direction) {
      case 'MIN_DAYS_BEFORE':
        // Source date must be at least toleranceDays before target
        if (diffDays >= toleranceDays) {
          return { match: true };
        }
        return {
          match: false,
          reason: `Date is only ${diffDays} days before target, minimum required: ${toleranceDays}`,
          actual: diffDays,
          expected: toleranceDays
        };

      case 'MAX_DAYS_AFTER':
        // Source date must be at most toleranceDays after target
        if (diffDays <= toleranceDays) {
          return { match: true };
        }
        return {
          match: false,
          reason: `Date is ${diffDays} days after target, maximum allowed: ${toleranceDays}`,
          actual: diffDays,
          expected: toleranceDays
        };

      case 'WITHIN_RANGE':
      default:
        // Date must be within +/- toleranceDays
        if (Math.abs(diffDays) <= toleranceDays) {
          return { match: true };
        }
        return {
          match: false,
          reason: `Date difference is ${Math.abs(diffDays)} days, tolerance: ${toleranceDays}`,
          actual: Math.abs(diffDays),
          expected: toleranceDays
        };
    }
  } catch (error) {
    return { match: false, reason: `Date comparison error: ${error.message}` };
  }
}
```

### Step 4: Apply Migration

```bash
supabase db push
```

### Step 5: Verify Rules

```sql
-- Check Phase 7 rules are active
SELECT rule_id,
       rule_definition->>'name' as name,
       rule_definition->>'severity' as severity,
       is_active
FROM validation_rules
WHERE rule_definition->'metadata'->>'phase' = 'phase7'
ORDER BY rule_id;
```

---

## Test Cases

### Rule VEH-010: 10-Day Check

```typescript
// Test: Vehicle re-registered 5 days ago (should WARN)
const result = runValidation({
  vehicle: { datum_posledni_preregistrace: '2026-01-01' },
  validationDate: '2026-01-06'
});
assertEquals(result.VEH010.status, 'ORANGE');  // Warning

// Test: Vehicle re-registered 15 days ago (should PASS)
const result2 = runValidation({
  vehicle: { datum_posledni_preregistrace: '2025-12-22' },
  validationDate: '2026-01-06'
});
assertEquals(result2.VEH010.status, 'GREEN');
```

---

## Validation Criteria

- [ ] VEH-010 rule added and active
- [ ] VEH-011 rule added and active
- [ ] VEH-012 rule added and active
- [ ] VEH-013 rule added and active
- [ ] DATE_TOLERANCE comparator implemented
- [ ] 10-day check correctly identifies recent re-registrations
- [ ] Rules show in validation results

---

## Completion Checklist

- [ ] Rules added to seed file
- [ ] Migration created and applied
- [ ] Comparator updated for DATE_TOLERANCE
- [ ] Rules verified in database
- [ ] Update tracker: `PHASE7_IMPLEMENTATION_TRACKER.md`
