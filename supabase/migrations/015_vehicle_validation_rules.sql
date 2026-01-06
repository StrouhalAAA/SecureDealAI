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
        "tolerance": 10,
        "direction": "MIN_DAYS_BEFORE"
      },
      "severity": "WARNING",
      "blockOnFail": false,
      "conditions": {
        "operator": "AND",
        "conditions": [
          { "field": "vehicle.datum_posledni_preregistrace", "operator": "EXISTS" }
        ]
      },
      "errorMessage": {
        "cs": "Vozidlo bylo přeregistrováno v posledních 10 pracovních dnech - vyžaduje manuální kontrolu",
        "en": "Vehicle was re-registered within the last 10 business days - manual review required"
      },
      "metadata": {
        "category": "vehicle",
        "phase": "phase7",
        "requiresDocumentGroup": "VTP",
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
        "entity": "vehicle",
        "field": "tachometer_km",
        "transforms": []
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
      "conditions": {
        "operator": "AND",
        "conditions": [
          { "field": "ocr_orv", "operator": "EXISTS" },
          { "field": "ocr_vtp", "operator": "EXISTS" }
        ]
      },
      "errorMessage": {
        "cs": "Barva vozidla se liší mezi dokumenty ORV a VTP",
        "en": "Vehicle color differs between ORV and VTP documents"
      },
      "metadata": {
        "category": "vehicle",
        "phase": "phase7",
        "requiresDocumentGroup": "VTP",
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
      "conditions": {
        "operator": "AND",
        "conditions": [
          { "field": "ocr_orv", "operator": "EXISTS" },
          { "field": "ocr_vtp", "operator": "EXISTS" }
        ]
      },
      "errorMessage": {
        "cs": "Typ paliva se liší mezi dokumenty ORV a VTP",
        "en": "Fuel type differs between ORV and VTP documents"
      },
      "metadata": {
        "category": "vehicle",
        "phase": "phase7",
        "requiresDocumentGroup": "VTP",
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
