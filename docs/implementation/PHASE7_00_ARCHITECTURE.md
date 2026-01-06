# Phase 7: Vehicle Data Schema Extension - Architecture Document

> **Version**: 1.0
> **Created**: 2026-01-06
> **Purpose**: Extend the vehicles table to capture all OCR-extractable fields and support fraud detection
> **Status**: PENDING IMPLEMENTATION
> **Branch**: VehicleData

---

## Executive Summary

This document defines the architecture for extending the `vehicles` database table to capture **all fields extractable from OCR documents** (ORV, VTP) and add critical **fraud detection fields** (tachometer, re-registration date).

**Gap Analysis Reference**: [docs/Analysis/VEHICLE_TABLE_GAP_ANALYSIS.md](../Analysis/VEHICLE_TABLE_GAP_ANALYSIS.md)

---

## Problem Statement

The current `vehicles` table stores only **11 of 22+ available fields**:
- OCR service extracts 20+ fields from ORV and VTP documents
- Only 10 are persisted to the database
- Critical fraud detection fields are missing (`tachometer_km`, `datum_posledni_preregistrace`)
- Technical parameters useful for validation are not stored

**Goal**: Extend the schema to capture all available vehicle data while maintaining backward compatibility.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VEHICLE DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐   │
│   │ Manual Input │     │ OCR Extract  │     │ Business Central Import  │   │
│   │ (Frontend)   │     │ (Mistral)    │     │ (Future)                 │   │
│   └──────┬───────┘     └──────┬───────┘     └───────────┬──────────────┘   │
│          │                    │                         │                   │
│          │ Primary fields     │ All technical specs     │ BC data           │
│          │ (VIN, SPZ, etc.)   │ from ORV + VTP          │ (tachometer)      │
│          │                    │                         │                   │
│          └────────────────────┼─────────────────────────┘                   │
│                               │                                              │
│                      ┌────────▼────────┐                                    │
│                      │  vehicles table │                                    │
│                      │  (EXTENDED)     │                                    │
│                      └────────┬────────┘                                    │
│                               │                                              │
│          ┌────────────────────┼────────────────────┐                        │
│          │                    │                    │                        │
│   ┌──────▼──────┐     ┌───────▼───────┐    ┌──────▼──────┐                 │
│   │ Validation  │     │ Fraud Check   │    │ Display in  │                 │
│   │ Rules       │     │ (10-day, km)  │    │ Frontend    │                 │
│   └─────────────┘     └───────────────┘    └─────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema Changes

### New Fields (Prioritized)

#### Phase 7.1: Critical Fields (Fraud Detection)

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `tachometer_km` | INTEGER | Manual/BC | Mileage for tampering detection |
| `datum_posledni_preregistrace` | DATE | OCR (VTP) | 10-day fraud rule check |

#### Phase 7.2: OCR-Extractable Fields (Already parsed but not stored)

| Field | Type | OCR Source | Purpose |
|-------|------|------------|---------|
| `barva` | VARCHAR(50) | ORV, VTP | Vehicle identification |
| `palivo` | VARCHAR(20) | ORV, VTP | Vehicle classification |
| `objem_motoru` | INTEGER | ORV, VTP | Technical specification |
| `pocet_mist` | INTEGER | ORV, VTP | Vehicle classification |
| `max_rychlost` | INTEGER | ORV, VTP | Performance data |
| `kategorie_vozidla` | VARCHAR(10) | VTP | Vehicle category (M1, N1) |

#### Phase 7.3: Extended Technical Data (VTP-sourced)

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `karoserie` | VARCHAR(50) | VTP | Body type code |
| `cislo_motoru` | VARCHAR(50) | VTP | Engine identity |
| `provozni_hmotnost` | INTEGER | VTP | Operating weight (kg) |
| `povolena_hmotnost` | INTEGER | VTP | Max permitted weight (kg) |
| `delka` | INTEGER | VTP | Total length (mm) |
| `sirka` | INTEGER | VTP | Total width (mm) |
| `vyska` | INTEGER | VTP | Total height (mm) |
| `rozvor` | INTEGER | VTP | Wheelbase (mm) |
| `emise_co2` | VARCHAR(50) | VTP | CO2 emissions (g/km) |
| `spotreba_paliva` | VARCHAR(50) | VTP | Fuel consumption |
| `emisni_norma` | VARCHAR(50) | VTP | Emission standard |
| `datum_stk` | DATE | VTP | Last inspection date |
| `stk_platnost` | DATE | VTP | Next inspection due |

---

## Target Schema

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

    -- =====================================================
    -- EXISTING FIELDS (unchanged)
    -- =====================================================
    spz VARCHAR(20) NOT NULL,
    vin VARCHAR(17),
    znacka VARCHAR(100),
    model VARCHAR(100),
    rok_vyroby INTEGER,
    datum_1_registrace DATE,
    majitel VARCHAR(200),
    motor VARCHAR(50),
    vykon_kw DECIMAL(10,2),

    -- =====================================================
    -- PHASE 7.1: FRAUD DETECTION FIELDS (Critical)
    -- =====================================================
    tachometer_km INTEGER,                    -- Mileage reading
    datum_posledni_preregistrace DATE,        -- Last re-registration (10-day rule)

    -- =====================================================
    -- PHASE 7.2: OCR-EXTRACTABLE FIELDS (Already parsed)
    -- =====================================================
    barva VARCHAR(50),                        -- Color (R. BARVA)
    palivo VARCHAR(20),                       -- Fuel type code (P.3)
    objem_motoru INTEGER,                     -- Engine cc (P.1)
    pocet_mist INTEGER,                       -- Seats (S.1)
    max_rychlost INTEGER,                     -- Max speed km/h (T.)
    kategorie_vozidla VARCHAR(10),            -- Category M1, N1, etc. (J.)

    -- =====================================================
    -- PHASE 7.3: EXTENDED VTP DATA
    -- =====================================================
    karoserie VARCHAR(50),                    -- Body type (2. Karoserie)
    cislo_motoru VARCHAR(50),                 -- Engine number (5. Typ motoru)
    provozni_hmotnost INTEGER,                -- Operating weight kg (G.)
    povolena_hmotnost INTEGER,                -- Max weight kg (F.2)
    delka INTEGER,                            -- Length mm (12.)
    sirka INTEGER,                            -- Width mm (13.)
    vyska INTEGER,                            -- Height mm (14.)
    rozvor INTEGER,                           -- Wheelbase mm (M.)
    emise_co2 VARCHAR(50),                    -- CO2 emissions (V.7)
    spotreba_paliva VARCHAR(50),              -- Fuel consumption (25.)
    emisni_norma VARCHAR(50),                 -- Emission standard
    datum_stk DATE,                           -- Last STK inspection
    stk_platnost DATE,                        -- Next STK due

    -- =====================================================
    -- METADATA (unchanged)
    -- =====================================================
    data_source VARCHAR(20) DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'OCR', 'BC_IMPORT')),
    validation_status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(buying_opportunity_id)
);
```

---

## Component Changes Required

### Backend Changes

| Component | File | Change |
|-----------|------|--------|
| **DB Migration** | `supabase/migrations/014_vehicle_schema_extension.sql` | Add new columns |
| **Vehicle CRUD** | `supabase/functions/vehicle/index.ts` | Handle new fields in POST/PUT |
| **OCR Transformer** | `supabase/functions/ocr-extract/transformer.ts` | Map new OCR fields |
| **Validation Rules** | `docs/architecture/VALIDATION_RULES_SEED.json` | Add new rules for tachometer, 10-day check |

### Frontend Changes

| Component | File | Change |
|-----------|------|--------|
| **Vehicle Form** | `apps/web/src/components/forms/VehicleForm.vue` | Add tachometer input |
| **Vehicle Types** | `apps/web/src/types/vehicle.ts` | Extend Vehicle interface |
| **Detail Page** | `apps/web/src/pages/OpportunityDetail.vue` | Display additional fields |

---

## Implementation Phases

### Phase 7.1: Database Schema Extension
- Create migration for new columns
- All columns nullable for backward compatibility
- Add indexes for frequently queried fields
- **Depends on**: Nothing
- **Estimate**: 1 hour

### Phase 7.2: OCR Extraction Mapping
- Update transformer to populate new fields
- Map ORV fields: `color`, `fuelType`, `engineCcm`, `seats`, `maxSpeed`
- Map VTP fields: All extended fields
- **Depends on**: 7.1
- **Estimate**: 2 hours

### Phase 7.3: Vehicle CRUD Update
- Extend POST/PUT handlers for new fields
- Update validation schemas
- Add tachometer_km as manual input field
- **Depends on**: 7.1
- **Estimate**: 1.5 hours

### Phase 7.4: Frontend Vehicle Form
- Add tachometer input with validation
- Update Vehicle interface
- Display OCR-populated fields as read-only
- **Depends on**: 7.3
- **Estimate**: 2 hours

### Phase 7.5: New Validation Rules
- VEH-010: 10-day re-registration fraud check
- VEH-011: Tachometer consistency (Cebia integration prep)
- VEH-012: Color consistency between documents
- VEH-013: Fuel type consistency
- **Depends on**: 7.1, 7.2
- **Estimate**: 1.5 hours

---

## Dependency Graph

```
Phase 7.1 (DB Migration)
├── Phase 7.2 (OCR Mapping)
│   └── Phase 7.5 (Validation Rules - partial)
├── Phase 7.3 (Vehicle CRUD)
│   └── Phase 7.4 (Frontend Form)
└── Phase 7.5 (Validation Rules)
```

**Parallel Execution Possible:**
- 7.2 and 7.3 can run in parallel (after 7.1)
- 7.4 depends on 7.3
- 7.5 can start after 7.1, finishes after 7.2

---

## Verification Criteria

### Database Verification

| Check | Method | Expected Result |
|-------|--------|-----------------|
| Migration applied | `SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles'` | All new columns exist |
| Backward compatible | Insert old-format vehicle | Success (new columns NULL) |
| Indexes created | `\di vehicles*` | New indexes visible |

### OCR Verification

| Check | Method | Expected Result |
|-------|--------|-----------------|
| ORV extraction populates new fields | Upload ORV, check vehicle record | `barva`, `palivo`, `objem_motoru`, etc. filled |
| VTP extraction populates extended fields | Upload VTP, check vehicle record | All VTP fields filled |

### Frontend Verification

| Check | Method | Expected Result |
|-------|--------|-----------------|
| Tachometer input visible | Navigate to vehicle form | Input field present |
| OCR fields display | After OCR extraction | Fields show extracted values |

---

## Rollback Plan

All migrations will include `DOWN` scripts:

```sql
-- Rollback Phase 7.1
ALTER TABLE vehicles
    DROP COLUMN IF EXISTS tachometer_km,
    DROP COLUMN IF EXISTS datum_posledni_preregistrace,
    -- ... etc for all new columns
```

Frontend changes are additive (new optional fields) and don't require rollback.

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/014_vehicle_schema_extension.sql` | Add new columns |
| `docs/implementation/07_01_VEHICLE_SCHEMA_MIGRATION.md` | Task: DB migration |
| `docs/implementation/07_02_OCR_EXTRACTION_MAPPING.md` | Task: OCR field mapping |
| `docs/implementation/07_03_VEHICLE_CRUD_UPDATE.md` | Task: API update |
| `docs/implementation/07_04_VEHICLE_FORM_UPDATE.md` | Task: Frontend form |
| `docs/implementation/07_05_VEHICLE_VALIDATION_RULES.md` | Task: New rules |
| `docs/implementation/PHASE7_IMPLEMENTATION_TRACKER.md` | Progress tracking |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/ocr-extract/transformer.ts` | Map additional fields |
| `supabase/functions/vehicle/index.ts` | Handle new fields |
| `apps/web/src/components/forms/VehicleForm.vue` | Add tachometer input |
| `apps/web/src/types/vehicle.ts` | Extend interface |

---

## Agent Execution Notes

Each task document (07_01 through 07_05) contains:
- Specific implementation steps
- Code templates and examples
- Test cases to verify
- Completion checklist

**Critical Implementation Details:**

1. **Backward Compatibility**: All new columns must be nullable
2. **Data Source Tracking**: Use `data_source` field to indicate OCR vs Manual
3. **Fuel Code Mapping**: Use existing `FUEL_CODE_MAP` from transforms
4. **Date Formats**: Normalize all dates to `YYYY-MM-DD`
5. **Tachometer Validation**: Must be positive integer, allow NULL

---

## Future Considerations (Not in Scope)

- Cebia integration for mileage history verification
- Business Central import for BC_IMPORT data source
- Historical tachometer tracking (multiple readings over time)
- VIN decoder integration for automatic make/model verification
