# Phase 7: Vehicle Data Schema Extension - Implementation Tracker

> **Version**: 1.0
> **Created**: 2026-01-06
> **Last Updated**: 2026-01-06
> **Status**: IN PROGRESS
> **Branch**: VehicleData
> **GitHub Issue**: [To be linked]

---

## Overview

This tracker monitors the implementation progress of Phase 7: Vehicle Data Schema Extension.

**Objective**: Extend the `vehicles` table to capture all OCR-extractable fields and support fraud detection.

**Gap Analysis**: [VEHICLE_TABLE_GAP_ANALYSIS.md](../Analysis/VEHICLE_TABLE_GAP_ANALYSIS.md)

---

## Progress Summary

| Phase | Total Tasks | Completed | In Progress | Pending |
|-------|-------------|-----------|-------------|---------|
| Phase 7: Vehicle Data | 5 | 3 | 0 | 2 |

---

## Task List

| # | Task | Document | Status | Depends On | Completed Date |
|---|------|----------|--------|------------|----------------|
| 7.1 | Vehicle Schema Migration | [07_01_VEHICLE_SCHEMA_MIGRATION.md](./07_01_VEHICLE_SCHEMA_MIGRATION.md) | [x] Done | None | 2026-01-06 |
| 7.2 | OCR Extraction Mapping | [07_02_OCR_EXTRACTION_MAPPING.md](./07_02_OCR_EXTRACTION_MAPPING.md) | [x] Done | 07_01 | 2026-01-06 |
| 7.3 | Vehicle CRUD Update | [07_03_VEHICLE_CRUD_UPDATE.md](./07_03_VEHICLE_CRUD_UPDATE.md) | [ ] Pending | 07_01 | - |
| 7.4 | Vehicle Form Update | [07_04_VEHICLE_FORM_UPDATE.md](./07_04_VEHICLE_FORM_UPDATE.md) | [ ] Pending | 07_03 | - |
| 7.5 | Vehicle Validation Rules | [07_05_VEHICLE_VALIDATION_RULES.md](./07_05_VEHICLE_VALIDATION_RULES.md) | [x] Done | 07_01, 07_02 | 2026-01-06 |

---

## Dependency Graph

```
07_01 (DB Migration)
├── 07_02 (OCR Mapping)
│   └── 07_05 (Validation Rules) [partial]
├── 07_03 (Vehicle CRUD)
│   └── 07_04 (Frontend Form)
└── 07_05 (Validation Rules)
```

**Parallel Execution:**
- 07_02 and 07_03 can run in parallel (after 07_01)
- 07_04 requires 07_03 completion
- 07_05 requires both 07_01 and 07_02

---

## New Fields Summary

### Phase 7.1: Fraud Detection (Critical)
- `tachometer_km` - Mileage for tampering detection
- `datum_posledni_preregistrace` - 10-day fraud rule check

### Phase 7.2: OCR-Extractable
- `barva` - Color
- `palivo` - Fuel type
- `objem_motoru` - Engine capacity
- `pocet_mist` - Seats
- `max_rychlost` - Max speed
- `kategorie_vozidla` - Vehicle category

### Phase 7.3: Extended VTP Data
- `karoserie` - Body type
- `cislo_motoru` - Engine number
- `provozni_hmotnost` - Operating weight
- `povolena_hmotnost` - Max permitted weight
- `delka`, `sirka`, `vyska`, `rozvor` - Dimensions
- `emise_co2`, `spotreba_paliva`, `emisni_norma` - Environmental
- `datum_stk`, `stk_platnost` - Technical inspection

---

## New Validation Rules

| Rule ID | Name | Severity | Purpose |
|---------|------|----------|---------|
| VEH-010 | 10-Day Re-registration Check | WARNING | Fraud detection |
| VEH-011 | Tachometer Present | INFO | Data completeness |
| VEH-012 | Color Consistency | INFO | Cross-document validation |
| VEH-013 | Fuel Type Consistency | INFO | Cross-document validation |

---

## ADWS Execution

Run Phase 7 with GitHub issue tracking:

```bash
# Navigate to project root
cd /Users/jakubstrouhal/Documents/SecureDealAI

# Run Phase 7 with issue tracking
uv run ADWS/run_phase.py 7 --issue 33

# Or dry-run first
uv run ADWS/run_phase.py 7 --dry-run

# Skip completed tasks if resuming
uv run ADWS/run_phase.py 7 --issue 33 --skip-completed
```

---

## Verification Checklist

### Database
- [x] 21 new columns added to `vehicles` table
- [x] All columns nullable (backward compatible)
- [x] Indexes created for frequently queried fields

### OCR Integration
- [x] ORV transformer extracts Phase 7.2 fields
- [x] VTP transformer extracts Phase 7.2 + 7.3 fields
- [x] Merge function prioritizes VTP > ORV

### API
- [ ] POST accepts `tachometer_km`
- [ ] PUT accepts all Phase 7 fields
- [ ] GET returns all Phase 7 fields
- [ ] Validation rejects invalid values

### Frontend
- [ ] Tachometer input field functional
- [ ] OCR data section displays correctly
- [ ] Extended data collapsible

### Validation Rules
- [x] 4 new rules added to seed file (VEH-010 to VEH-013)
- [x] Migration 015 created with rules
- [x] DATE_TOLERANCE comparator supports direction
- [x] Engine supports system entity for validation_date
- [ ] Rules deployed to production database

---

## Changelog

### 2026-01-06: Task 7.1 Vehicle Schema Migration - COMPLETED

**Migration Applied:**
- Created `supabase/migrations/014_vehicle_schema_extension.sql`
- Created `supabase/rollbacks/014_vehicle_schema_extension_DOWN.sql`
- Applied migration to remote database via `supabase db push`
- Verified all 21 columns accessible via REST API
- Tested PATCH operations on new columns

**New Columns Added:**
- Phase 7.1 (Fraud Detection): `tachometer_km`, `datum_posledni_preregistrace`
- Phase 7.2 (OCR Fields): `barva`, `palivo`, `objem_motoru`, `pocet_mist`, `max_rychlost`, `kategorie_vozidla`
- Phase 7.3 (Extended VTP): `karoserie`, `cislo_motoru`, `provozni_hmotnost`, `povolena_hmotnost`, `delka`, `sirka`, `vyska`, `rozvor`, `emise_co2`, `spotreba_paliva`, `emisni_norma`, `datum_stk`, `stk_platnost`

**Indexes Created:**
- `idx_vehicles_tachometer` (partial index for fraud detection queries)
- `idx_vehicles_palivo` (partial index for fuel type filtering)
- `idx_vehicles_stk_platnost` (partial index for STK expiry alerts)

---

### 2026-01-06: Phase 7 Implementation Plan Created

**Files Created:**
- `docs/implementation/PHASE7_00_ARCHITECTURE.md` - Architecture overview
- `docs/implementation/07_01_VEHICLE_SCHEMA_MIGRATION.md` - DB migration task
- `docs/implementation/07_02_OCR_EXTRACTION_MAPPING.md` - OCR mapping task
- `docs/implementation/07_03_VEHICLE_CRUD_UPDATE.md` - API update task
- `docs/implementation/07_04_VEHICLE_FORM_UPDATE.md` - Frontend task
- `docs/implementation/07_05_VEHICLE_VALIDATION_RULES.md` - Rules task
- `docs/implementation/PHASE7_IMPLEMENTATION_TRACKER.md` - This tracker
- `docs/Analysis/VEHICLE_TABLE_GAP_ANALYSIS.md` - Gap analysis

**Based on:**
- Gap analysis of current vs target vehicle schema
- OCR extraction capabilities (ORV + VTP)
- Fraud detection requirements

---

### 2026-01-06: Task 7.2 OCR Extraction Mapping - COMPLETED

**Changes Made:**
- Updated `supabase/functions/ocr-extract/transformer.ts`
- Added `VehicleDataExtended` interface with all Phase 7 fields
- Implemented `transformORVToVehicle()` function for ORV → DB mapping
- Implemented `transformVTPToVehicle()` function for VTP → DB mapping
- Implemented `mergeVehicleData()` function with VTP > ORV > Manual priority
- Added `extractPowerKw()` helper for parsing "kW/rpm" format

**Field Mappings:**
- ORV fields: `color` → `barva`, `fuelType` → `palivo`, `engineCcm` → `objem_motoru`, `seats` → `pocet_mist`, `maxSpeed` → `max_rychlost`
- VTP fields: All above plus `vehicleCategory` → `kategorie_vozidla`, `bodyType` → `karoserie`, `engineType` → `cislo_motoru`, dimensions, weights, environmental data, STK dates
- Fraud detection: `firstRegistrationDateCZ` ≠ `firstRegistrationDate` → `datum_posledni_preregistrace`

**Validation:**
- All type checks passing (`deno check`)

---

## Notes

- All new columns are **nullable** for backward compatibility
- OCR-extracted fields are **read-only** in the UI
- Tachometer is the only new **manual input** field
- 10-day rule requires `datum_posledni_preregistrace` from VTP

---

### 2026-01-06: Task 7.5 Vehicle Validation Rules - COMPLETED

**Files Created/Modified:**
- Created `supabase/migrations/015_vehicle_validation_rules.sql`
- Updated `docs/architecture/VALIDATION_RULES_SEED.json` (added 4 new rules)
- Updated `supabase/functions/validation-run/types.ts`:
  - Added `system` entity type
  - Added `SystemData` interface with `validation_date`
  - Added `direction` field to `ComparisonConfig`
- Updated `supabase/functions/validation-run/comparators.ts`:
  - Extended `compareDateTolerance` with MIN_DAYS_BEFORE, MAX_DAYS_AFTER, WITHIN_RANGE directions
- Updated `supabase/functions/validation-run/engine.ts`:
  - Engine now auto-injects `system.validation_date` at runtime

**New Validation Rules:**
| Rule ID | Name | Severity | Purpose |
|---------|------|----------|---------|
| VEH-010 | 10-Day Re-registration Check | WARNING | Fraud detection - flags vehicles re-registered within 10 days |
| VEH-011 | Tachometer Present | INFO | Ensures mileage is captured for future Cebia integration |
| VEH-012 | Color Consistency | INFO | Cross-validates color between ORV and VTP |
| VEH-013 | Fuel Type Consistency | INFO | Cross-validates fuel type between ORV and VTP |

**Architecture Enhancement:**
- The `system` entity enables rules to compare against runtime values (like current date)
- The `direction` parameter for DATE_TOLERANCE enables directional date comparisons:
  - `MIN_DAYS_BEFORE`: Source must be at least N days before target (fraud detection)
  - `MAX_DAYS_AFTER`: Source must be at most N days after target
  - `WITHIN_RANGE`: Source must be within +/- N days of target (default)

**Validation:**
- All type checks passing (`deno check`)
