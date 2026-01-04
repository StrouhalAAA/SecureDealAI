-- ============================================================================
-- SecureDealAI MVP - Seed Validation Rules
-- ============================================================================
-- Version: 1.0.0
-- Created: 2026-01-03
-- Purpose: Populate validation_rules table with 35 predefined MVP rules
-- Depends On: 001_initial_schema.sql (validation_rules table)
-- ============================================================================
--
-- RULE SUMMARY:
--   - Total: 35 rules
--   - MVP (enabled): 25 rules
--   - Phase 2 (disabled): 10 rules
--   - Categories: vehicle (13), vendor_fo (11), vendor_po (9), cross (2)
--   - Severity: CRITICAL (21), WARNING (13), INFO (1)
--
-- ============================================================================

-- Clear existing rules (for idempotent execution)
DELETE FROM validation_rules WHERE rule_id LIKE 'VEH-%'
   OR rule_id LIKE 'VND-%'
   OR rule_id LIKE 'ARES-%'
   OR rule_id LIKE 'DPH-%'
   OR rule_id LIKE 'XV-%'
   OR rule_id LIKE 'DOL-%'
   OR rule_id LIKE 'CEB-%'
   OR rule_id LIKE 'VTP-%';

-- ============================================================================
-- VEHICLE RULES (VEH-001 to VEH-007)
-- ============================================================================

-- VEH-001: VIN Match (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VEH-001',
  '{
    "id": "VEH-001",
    "name": "VIN Match",
    "description": "VIN must match exactly between manual input and OCR from ORV",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "vin",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "VIN_NORMALIZE"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "vin",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "VIN_NORMALIZE"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "errorMessage": {
      "cs": "VIN se neshoduje s technickým průkazem",
      "en": "VIN does not match the vehicle registration certificate"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocuments": [63],
      "applicableToBuyingType": ["BRANCH"],
      "priority": 1,
      "tags": ["critical", "vehicle-identity"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VEH-002: SPZ Match (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VEH-002',
  '{
    "id": "VEH-002",
    "name": "SPZ Match",
    "description": "Registration plate must match exactly between manual input and OCR",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "spz",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "SPZ_NORMALIZE"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "registrationPlateNumber",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "SPZ_NORMALIZE"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "errorMessage": {
      "cs": "SPZ se neshoduje s technickým průkazem",
      "en": "Registration plate does not match the vehicle registration certificate"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocuments": [63],
      "priority": 2,
      "tags": ["critical", "vehicle-identity"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VEH-003: Owner Name Match (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VEH-003',
  '{
    "id": "VEH-003",
    "name": "Owner Name Match",
    "description": "Owner name from ORV must match exactly",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "majitel",
      "transforms": ["UPPERCASE", "TRIM", "NAME_NORMALIZE"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "keeperName",
      "transforms": ["UPPERCASE", "TRIM", "NAME_NORMALIZE"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "errorMessage": {
      "cs": "Jméno majitele se neshoduje s technickým průkazem",
      "en": "Owner name does not match the vehicle registration certificate"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocuments": [63],
      "priority": 3,
      "tags": ["critical", "ownership"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VEH-004: Brand Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VEH-004',
  '{
    "id": "VEH-004",
    "name": "Brand Match",
    "description": "Vehicle brand similarity check",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "znacka",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "make",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.8,
      "caseSensitive": false
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "errorMessage": {
      "cs": "Značka vozidla se liší od technického průkazu",
      "en": "Vehicle brand differs from the registration certificate"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocuments": [63],
      "priority": 20,
      "tags": ["warning", "vehicle-details"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VEH-005: Model Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VEH-005',
  '{
    "id": "VEH-005",
    "name": "Model Match",
    "description": "Vehicle model similarity check",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "model",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "model",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.7,
      "caseSensitive": false
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "errorMessage": {
      "cs": "Model vozidla se liší od technického průkazu",
      "en": "Vehicle model differs from the registration certificate"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocuments": [63],
      "priority": 21,
      "tags": ["warning", "vehicle-details"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VEH-006: First Registration Date (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VEH-006',
  '{
    "id": "VEH-006",
    "name": "First Registration Date",
    "description": "First registration date match",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "datum_1_registrace",
      "transforms": ["NORMALIZE_DATE"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "firstRegistrationDate",
      "transforms": ["NORMALIZE_DATE"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "errorMessage": {
      "cs": "Datum první registrace se neshoduje",
      "en": "First registration date does not match"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocuments": [63],
      "priority": 22,
      "tags": ["warning", "vehicle-details"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VEH-007: Engine Power Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VEH-007',
  '{
    "id": "VEH-007",
    "name": "Engine Power Match",
    "description": "Engine power within 5% tolerance",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "vykon_kw",
      "transforms": ["EXTRACT_NUMBER"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "maxPower",
      "transforms": ["EXTRACT_NUMBER"]
    },
    "comparison": {
      "type": "NUMERIC_TOLERANCE",
      "tolerance": 0.05,
      "toleranceType": "percentage"
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "errorMessage": {
      "cs": "Výkon motoru se liší o více než 5%",
      "en": "Engine power differs by more than 5%"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocuments": [63],
      "priority": 23,
      "tags": ["warning", "vehicle-details"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ============================================================================
-- VENDOR INDIVIDUAL RULES (VND-001 to VND-006)
-- ============================================================================

-- VND-001: Full Name Match (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VND-001',
  '{
    "id": "VND-001",
    "name": "Full Name Match",
    "description": "Vendor name must match ID card for physical persons",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "name",
      "transforms": ["UPPERCASE", "TRIM", "REMOVE_DIACRITICS"]
    },
    "target": {
      "entity": "ocr_op",
      "field": "fullName",
      "transforms": ["UPPERCASE", "TRIM", "REMOVE_DIACRITICS"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Jméno dodavatele se neshoduje s občanským průkazem",
      "en": "Vendor name does not match ID card"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "mvp",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "applicableToBuyingType": ["BRANCH"],
      "priority": 10,
      "tags": ["critical", "vendor-identity"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VND-002: Personal ID Match (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VND-002',
  '{
    "id": "VND-002",
    "name": "Personal ID Match",
    "description": "Personal ID (RČ) must match exactly",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "personal_id",
      "transforms": ["FORMAT_RC"]
    },
    "target": {
      "entity": "ocr_op",
      "field": "personalNumber",
      "transforms": ["FORMAT_RC"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Rodné číslo se neshoduje s občanským průkazem",
      "en": "Personal ID does not match ID card"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "mvp",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 11,
      "tags": ["critical", "vendor-identity"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VND-003: Street Address Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VND-003',
  '{
    "id": "VND-003",
    "name": "Street Address Match",
    "description": "Street address similarity check",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "address_street",
      "transforms": ["UPPERCASE", "TRIM", "ADDRESS_NORMALIZE"]
    },
    "target": {
      "entity": "ocr_op",
      "field": "permanentStay",
      "transforms": ["UPPERCASE", "TRIM", "ADDRESS_NORMALIZE"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.6,
      "caseSensitive": false
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Adresa se liší od občanského průkazu",
      "en": "Street address differs from ID card"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "mvp",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 30,
      "tags": ["warning", "vendor-address"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VND-004: City Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VND-004',
  '{
    "id": "VND-004",
    "name": "City Match",
    "description": "City similarity check",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "address_city",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "target": {
      "entity": "ocr_op",
      "field": "permanentStay",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.8,
      "caseSensitive": false
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Město se liší od občanského průkazu",
      "en": "City differs from ID card"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "mvp",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 31,
      "tags": ["warning", "vendor-address"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VND-005: Postal Code Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VND-005',
  '{
    "id": "VND-005",
    "name": "Postal Code Match",
    "description": "Postal code exact match",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "address_postal_code",
      "transforms": ["REMOVE_SPACES"]
    },
    "target": {
      "entity": "ocr_op",
      "field": "permanentStay",
      "transforms": ["REMOVE_SPACES"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "PSČ se neshoduje",
      "en": "Postal code does not match"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "mvp",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 32,
      "tags": ["warning", "vendor-address"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VND-006: Date of Birth (INFO)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VND-006',
  '{
    "id": "VND-006",
    "name": "Date of Birth",
    "description": "Date of birth from ID card",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "date_of_birth",
      "transforms": ["NORMALIZE_DATE"]
    },
    "target": {
      "entity": "ocr_op",
      "field": "dateOfBirth",
      "transforms": ["NORMALIZE_DATE"]
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
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Datum narození se neshoduje",
      "en": "Date of birth does not match"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "mvp",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 40,
      "tags": ["info", "vendor-details"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ============================================================================
-- ARES RULES (ARES-001 to ARES-004)
-- ============================================================================

-- ARES-001: Company Existence (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'ARES-001',
  '{
    "id": "ARES-001",
    "name": "Company Existence",
    "description": "Company must exist in ARES registry",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "company_id",
      "transforms": ["FORMAT_ICO"]
    },
    "target": {
      "entity": "ares",
      "field": "ico",
      "transforms": []
    },
    "comparison": {
      "type": "EXISTS"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" }
      ]
    },
    "errorMessage": {
      "cs": "Společnost nebyla nalezena v registru ARES",
      "en": "Company not found in ARES registry"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "applicableTo": ["COMPANY"],
      "applicableToBuyingType": ["BRANCH"],
      "priority": 5,
      "tags": ["critical", "company-verification", "ares"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ARES-002: Company Name Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'ARES-002',
  '{
    "id": "ARES-002",
    "name": "Company Name Match",
    "description": "Company name similarity check against ARES",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "name",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "target": {
      "entity": "ares",
      "field": "obchodniJmeno",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.8,
      "caseSensitive": false
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" }
      ]
    },
    "errorMessage": {
      "cs": "Název společnosti se liší od záznamu v ARES",
      "en": "Company name differs from ARES record"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "applicableTo": ["COMPANY"],
      "priority": 25,
      "tags": ["warning", "company-verification", "ares"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ARES-003: VAT ID Match (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'ARES-003',
  '{
    "id": "ARES-003",
    "name": "VAT ID Match",
    "description": "VAT ID (DIČ) must match ARES record",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "vat_id",
      "transforms": ["UPPERCASE", "TRIM", "FORMAT_DIC"]
    },
    "target": {
      "entity": "ares",
      "field": "dic",
      "transforms": ["UPPERCASE", "TRIM", "FORMAT_DIC"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" },
        { "field": "vendor.vat_id", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "DIČ se neshoduje se záznamem v ARES",
      "en": "VAT ID does not match ARES record"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "applicableTo": ["COMPANY"],
      "priority": 6,
      "tags": ["critical", "company-verification", "ares"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ARES-004: Company Age Check (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'ARES-004',
  '{
    "id": "ARES-004",
    "name": "Company Age Check",
    "description": "Company should be at least 1 year old",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "company_id",
      "transforms": ["FORMAT_ICO"]
    },
    "target": {
      "entity": "ares",
      "field": "datumVzniku",
      "transforms": ["NORMALIZE_DATE"]
    },
    "comparison": {
      "type": "DATE_TOLERANCE",
      "tolerance": 365,
      "toleranceType": "absolute"
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" }
      ]
    },
    "errorMessage": {
      "cs": "Společnost existuje méně než 1 rok",
      "en": "Company has been in existence for less than 1 year"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "applicableTo": ["COMPANY"],
      "priority": 26,
      "tags": ["warning", "company-verification", "ares"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ============================================================================
-- DPH RULES (DPH-001 to DPH-003)
-- ============================================================================

-- DPH-001: VAT Payer Status (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'DPH-001',
  '{
    "id": "DPH-001",
    "name": "VAT Payer Status",
    "description": "Company must be active VAT payer",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "vat_id",
      "transforms": ["FORMAT_DIC"]
    },
    "target": {
      "entity": "adis",
      "field": "statusPlatce",
      "transforms": []
    },
    "comparison": {
      "type": "EXACT"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" },
        { "field": "vendor.vat_id", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Společnost není aktivním plátcem DPH",
      "en": "Company is not an active VAT payer"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "applicableTo": ["COMPANY"],
      "priority": 7,
      "tags": ["critical", "vat-verification", "adis"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- DPH-002: Unreliable VAT Payer Check (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'DPH-002',
  '{
    "id": "DPH-002",
    "name": "Unreliable VAT Payer Check",
    "description": "Company must not be unreliable VAT payer",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "vat_id",
      "transforms": ["FORMAT_DIC"]
    },
    "target": {
      "entity": "adis",
      "field": "nespolehlivyPlatce",
      "transforms": []
    },
    "comparison": {
      "type": "EXACT"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" },
        { "field": "vendor.vat_id", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Společnost je nespolehlivým plátcem DPH",
      "en": "Company is an unreliable VAT payer"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "applicableTo": ["COMPANY"],
      "priority": 8,
      "tags": ["critical", "vat-verification", "adis"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- DPH-003: Bank Account Registration (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'DPH-003',
  '{
    "id": "DPH-003",
    "name": "Bank Account Registration",
    "description": "Bank account should be registered in VAT registry",
    "enabled": true,
    "source": {
      "entity": "vendor",
      "field": "bank_account",
      "transforms": ["REMOVE_SPACES"]
    },
    "target": {
      "entity": "adis",
      "field": "seznamUctu",
      "transforms": ["REMOVE_SPACES"]
    },
    "comparison": {
      "type": "CONTAINS"
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" },
        { "field": "vendor.bank_account", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Bankovní účet není registrován v registru DPH",
      "en": "Bank account is not registered in VAT registry"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "applicableTo": ["COMPANY"],
      "priority": 27,
      "tags": ["warning", "vat-verification", "adis"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ============================================================================
-- CROSS-VALIDATION RULES (XV-001)
-- ============================================================================

-- XV-001: Vehicle Owner = Vendor (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'XV-001',
  '{
    "id": "XV-001",
    "name": "Vehicle Owner = Vendor",
    "description": "Vehicle owner from ORV must match vendor name",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "majitel",
      "transforms": ["UPPERCASE", "TRIM", "REMOVE_DIACRITICS"]
    },
    "target": {
      "entity": "vendor",
      "field": "name",
      "transforms": ["UPPERCASE", "TRIM", "REMOVE_DIACRITICS"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.95,
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "errorMessage": {
      "cs": "Majitel vozidla se neshoduje s dodavatelem",
      "en": "Vehicle owner does not match the vendor"
    },
    "metadata": {
      "category": "cross",
      "phase": "mvp",
      "priority": 4,
      "tags": ["critical", "cross-validation", "ownership"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ============================================================================
-- VTP RULES (VTP-001 to VTP-004) - Conditional rules for VTP document
-- ============================================================================

-- VTP-001: VTP SPZ Consistency (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VTP-001',
  '{
    "id": "VTP-001",
    "name": "VTP SPZ Consistency",
    "description": "SPZ from VTP must match SPZ from ORV",
    "enabled": true,
    "source": {
      "entity": "ocr_vtp",
      "field": "registrationPlateNumber",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "SPZ_NORMALIZE"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "registrationPlateNumber",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "SPZ_NORMALIZE"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "ocr_vtp", "operator": "EXISTS" }
      ]
    },
    "errorMessage": {
      "cs": "SPZ na VTP se neshoduje s ORV",
      "en": "VTP registration plate does not match ORV"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocumentGroup": "VTP",
      "priority": 60,
      "tags": ["critical", "vtp", "document-consistency"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VTP-002: VTP VIN Consistency (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VTP-002',
  '{
    "id": "VTP-002",
    "name": "VTP VIN Consistency",
    "description": "VIN from VTP must match VIN from ORV",
    "enabled": true,
    "source": {
      "entity": "ocr_vtp",
      "field": "vin",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "VIN_NORMALIZE"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "vin",
      "transforms": ["REMOVE_SPACES", "UPPERCASE", "VIN_NORMALIZE"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "ocr_vtp", "operator": "EXISTS" }
      ]
    },
    "errorMessage": {
      "cs": "VIN na VTP se neshoduje s ORV",
      "en": "VTP VIN does not match ORV"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "requiresDocumentGroup": "VTP",
      "priority": 61,
      "tags": ["critical", "vtp", "document-consistency"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VTP-003: VTP Owner IČO Match (CRITICAL)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VTP-003',
  '{
    "id": "VTP-003",
    "name": "VTP Owner IČO Match",
    "description": "Owner IČO from VTP must match vendor company_id for ARES validation",
    "enabled": true,
    "source": {
      "entity": "ocr_vtp",
      "field": "ownerIco",
      "transforms": ["REMOVE_SPACES", "FORMAT_ICO"]
    },
    "target": {
      "entity": "vendor",
      "field": "company_id",
      "transforms": ["REMOVE_SPACES", "FORMAT_ICO"]
    },
    "comparison": {
      "type": "EXACT",
      "caseSensitive": false
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" },
        { "field": "ocr_vtp", "operator": "EXISTS" },
        { "field": "ocr_vtp.ownerIco", "operator": "EXISTS" }
      ]
    },
    "errorMessage": {
      "cs": "IČO vlastníka na VTP se neshoduje s IČO dodavatele",
      "en": "VTP owner IČO does not match vendor company ID"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "mvp",
      "requiresDocumentGroup": "VTP",
      "applicableTo": ["COMPANY"],
      "priority": 62,
      "tags": ["critical", "vtp", "ares-validation", "company-identity"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- VTP-004: VTP Owner Name Match (WARNING)
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'VTP-004',
  '{
    "id": "VTP-004",
    "name": "VTP Owner Name Match",
    "description": "Owner name from VTP must match vendor name",
    "enabled": true,
    "source": {
      "entity": "ocr_vtp",
      "field": "ownerName",
      "transforms": ["UPPERCASE", "TRIM", "NAME_NORMALIZE"]
    },
    "target": {
      "entity": "vendor",
      "field": "name",
      "transforms": ["UPPERCASE", "TRIM", "NAME_NORMALIZE"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.85
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "ocr_vtp", "operator": "EXISTS" }
      ]
    },
    "errorMessage": {
      "cs": "Jméno vlastníka na VTP se neshoduje s dodavatelem",
      "en": "VTP owner name does not match vendor"
    },
    "metadata": {
      "category": "cross",
      "phase": "mvp",
      "requiresDocumentGroup": "VTP",
      "priority": 63,
      "tags": ["warning", "vtp", "owner-verification"]
    }
  }'::jsonb,
  true, false, 1, '1.2', 'system-seed'
);

-- ============================================================================
-- PHASE 2 RULES (DOL-001 to DOL-003, CEB-001 to CEB-006) - DISABLED
-- ============================================================================

-- DOL-001: ID Card Validity (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'DOL-001',
  '{
    "id": "DOL-001",
    "name": "ID Card Validity",
    "description": "Check if ID card is valid via Doložky.cz",
    "enabled": false,
    "source": {
      "entity": "vendor",
      "field": "document_number",
      "transforms": []
    },
    "target": {
      "entity": "dolozky",
      "field": "isValid",
      "transforms": []
    },
    "comparison": {
      "type": "EXACT"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Občanský průkaz není platný",
      "en": "ID card is not valid"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "phase2",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 12,
      "tags": ["critical", "id-verification", "dolozky"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- DOL-002: ID Card Expiry (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'DOL-002',
  '{
    "id": "DOL-002",
    "name": "ID Card Expiry",
    "description": "Check if ID card is not expired",
    "enabled": false,
    "source": {
      "entity": "vendor",
      "field": "document_expiry_date",
      "transforms": ["NORMALIZE_DATE"]
    },
    "target": {
      "entity": "dolozky",
      "field": "expiryDate",
      "transforms": ["NORMALIZE_DATE"]
    },
    "comparison": {
      "type": "DATE_TOLERANCE",
      "tolerance": 0,
      "toleranceType": "absolute"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Občanský průkaz má prošlou platnost",
      "en": "ID card has expired"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "phase2",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 13,
      "tags": ["critical", "id-verification", "dolozky"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- DOL-003: Personal Data Cross-validation (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'DOL-003',
  '{
    "id": "DOL-003",
    "name": "Personal Data Cross-validation",
    "description": "Verify OCR data matches Doložky.cz record",
    "enabled": false,
    "source": {
      "entity": "vendor",
      "field": "personal_id",
      "transforms": ["FORMAT_RC"]
    },
    "target": {
      "entity": "dolozky",
      "field": "personalData",
      "transforms": ["FORMAT_RC"]
    },
    "comparison": {
      "type": "EXACT"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" },
        { "field": "ocr_op", "operator": "EXISTS", "value": true }
      ]
    },
    "errorMessage": {
      "cs": "Osobní údaje se neshodují s registrem Doložky.cz",
      "en": "Personal data does not match Doložky.cz registry"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "phase2",
      "requiresDocuments": [1],
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 14,
      "tags": ["critical", "id-verification", "dolozky"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- CEB-001: Vehicle Execution Check (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'CEB-001',
  '{
    "id": "CEB-001",
    "name": "Vehicle Execution Check",
    "description": "Check if vehicle has no active execution",
    "enabled": false,
    "source": {
      "entity": "vehicle",
      "field": "vin",
      "transforms": ["VIN_NORMALIZE"]
    },
    "target": {
      "entity": "cebia",
      "field": "exekuce",
      "transforms": []
    },
    "comparison": {
      "type": "NOT_EXISTS"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "errorMessage": {
      "cs": "Na vozidlo je vedena exekuce",
      "en": "Vehicle has an active execution"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "phase2",
      "priority": 50,
      "tags": ["critical", "vehicle-legal", "cebia"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- CEB-002: Vehicle Lien Check (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'CEB-002',
  '{
    "id": "CEB-002",
    "name": "Vehicle Lien Check",
    "description": "Check if vehicle has no active lien",
    "enabled": false,
    "source": {
      "entity": "vehicle",
      "field": "vin",
      "transforms": ["VIN_NORMALIZE"]
    },
    "target": {
      "entity": "cebia",
      "field": "zastava",
      "transforms": []
    },
    "comparison": {
      "type": "NOT_EXISTS"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "errorMessage": {
      "cs": "Na vozidle je zástava",
      "en": "Vehicle has an active lien"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "phase2",
      "priority": 51,
      "tags": ["critical", "vehicle-legal", "cebia"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- CEB-003: Stolen Vehicle Check (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'CEB-003',
  '{
    "id": "CEB-003",
    "name": "Stolen Vehicle Check",
    "description": "Check if vehicle is not reported stolen",
    "enabled": false,
    "source": {
      "entity": "vehicle",
      "field": "vin",
      "transforms": ["VIN_NORMALIZE"]
    },
    "target": {
      "entity": "cebia",
      "field": "kradene",
      "transforms": []
    },
    "comparison": {
      "type": "NOT_EXISTS"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "errorMessage": {
      "cs": "Vozidlo je hlášeno jako odcizené",
      "en": "Vehicle is reported as stolen"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "phase2",
      "priority": 52,
      "tags": ["critical", "vehicle-legal", "cebia"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- CEB-004: Person Execution Check (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'CEB-004',
  '{
    "id": "CEB-004",
    "name": "Person Execution Check",
    "description": "Check if person has no active execution",
    "enabled": false,
    "source": {
      "entity": "vendor",
      "field": "personal_id",
      "transforms": ["FORMAT_RC"]
    },
    "target": {
      "entity": "cebia",
      "field": "exekuceOsoba",
      "transforms": []
    },
    "comparison": {
      "type": "NOT_EXISTS"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" }
      ]
    },
    "errorMessage": {
      "cs": "Na osobu je vedena exekuce",
      "en": "Person has an active execution"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "phase2",
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 53,
      "tags": ["critical", "person-legal", "cebia"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- CEB-005: Person Insolvency Check (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'CEB-005',
  '{
    "id": "CEB-005",
    "name": "Person Insolvency Check",
    "description": "Check if person is not in insolvency",
    "enabled": false,
    "source": {
      "entity": "vendor",
      "field": "personal_id",
      "transforms": ["FORMAT_RC"]
    },
    "target": {
      "entity": "cebia",
      "field": "insolvence",
      "transforms": []
    },
    "comparison": {
      "type": "NOT_EXISTS"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "PHYSICAL_PERSON" }
      ]
    },
    "errorMessage": {
      "cs": "Osoba je v insolvenci",
      "en": "Person is in insolvency"
    },
    "metadata": {
      "category": "vendor_fo",
      "phase": "phase2",
      "applicableTo": ["PHYSICAL_PERSON"],
      "priority": 54,
      "tags": ["critical", "person-legal", "cebia"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- CEB-006: Company Insolvency Check (CRITICAL) - Phase 2
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, version, schema_version, created_by)
VALUES (
  'CEB-006',
  '{
    "id": "CEB-006",
    "name": "Company Insolvency Check",
    "description": "Check if company is not in insolvency",
    "enabled": false,
    "source": {
      "entity": "vendor",
      "field": "company_id",
      "transforms": ["FORMAT_ICO"]
    },
    "target": {
      "entity": "cebia",
      "field": "insolvence",
      "transforms": []
    },
    "comparison": {
      "type": "NOT_EXISTS"
    },
    "severity": "CRITICAL",
    "blockOnFail": true,
    "conditions": {
      "operator": "AND",
      "conditions": [
        { "field": "vendor.vendor_type", "operator": "EQUALS", "value": "COMPANY" }
      ]
    },
    "errorMessage": {
      "cs": "Společnost je v insolvenci",
      "en": "Company is in insolvency"
    },
    "metadata": {
      "category": "vendor_po",
      "phase": "phase2",
      "applicableTo": ["COMPANY"],
      "priority": 55,
      "tags": ["critical", "company-legal", "cebia"]
    }
  }'::jsonb,
  false, false, 1, '1.2', 'system-seed'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- This section provides queries to verify the seed was successful
-- Run these after applying the migration

-- Verify total count (should be 35)
-- SELECT COUNT(*) as total_rules FROM validation_rules;

-- Verify active/inactive counts (should be 25 active, 10 inactive)
-- SELECT is_active, COUNT(*) as count FROM validation_rules GROUP BY is_active;

-- Verify by category
-- SELECT rule_definition->'metadata'->>'category' as category, COUNT(*) as count
-- FROM validation_rules GROUP BY rule_definition->'metadata'->>'category';

-- Verify by severity
-- SELECT rule_definition->>'severity' as severity, COUNT(*) as count
-- FROM validation_rules GROUP BY rule_definition->>'severity';

-- ============================================================================
-- END OF SEED MIGRATION
-- ============================================================================
