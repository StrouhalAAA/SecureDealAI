# Vehicle Table Gap Analysis

> **Created**: 2026-01-06
> **Branch**: VehicleData
> **Purpose**: Identify gaps between current `vehicles` table and target requirements
> **Implementation Plan**: [PHASE7_00_ARCHITECTURE.md](../implementation/PHASE7_00_ARCHITECTURE.md)
> **Tracker**: [PHASE7_IMPLEMENTATION_TRACKER.md](../implementation/PHASE7_IMPLEMENTATION_TRACKER.md)

---

## 1. Executive Summary

This analysis compares the **current production `vehicles` table** against:
- Target requirements from the reference project specification
- OCR extraction capabilities (ORV + VTP documents)
- Existing documentation (`DATA_MODEL_VEHICLE.md`)

### Key Findings

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Total Fields** | 11 | 22+ | 11+ missing |
| **Critical Identifiers** | 3 | 3 | None |
| **Technical Parameters** | 4 | 10+ | 6+ missing |
| **OCR-extractable** | 10 | 20+ | 10+ not stored |

---

## 2. Current Production Table Structure

From `supabase/migrations/001_initial_schema.sql`:

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY,
    buying_opportunity_id UUID NOT NULL,

    -- Currently implemented fields
    spz VARCHAR(20) NOT NULL,           -- Registrační značka
    vin VARCHAR(17),                     -- VIN
    znacka VARCHAR(100),                 -- Brand/Make
    model VARCHAR(100),                  -- Model
    rok_vyroby INTEGER,                  -- Year of manufacture
    datum_1_registrace DATE,             -- First registration date
    majitel VARCHAR(200),                -- Owner name
    motor VARCHAR(50),                   -- Engine type
    vykon_kw DECIMAL(10,2),             -- Power in kW

    -- Metadata
    data_source VARCHAR(20),
    validation_status VARCHAR(20),
    created_at TIMESTAMPTZ
);
```

**Current Field Count**: 11 data fields + 3 metadata fields

---

## 3. Target Requirements Analysis

### 3.1 Primary Identifiers (CRITICAL - RED if mismatch)

| Parameter | Czech Name | Current Status | OCR Source | Notes |
|-----------|------------|----------------|------------|-------|
| **VIN** | VIN | Exists (`vin`) | ORV, VTP | Validated against BC + Cebia |
| **SPZ** | Registrační značka | Exists (`spz`) | ORV, VTP | Business key |
| **Owner Name** | Majitel/Vlastník | Exists (`majitel`) | ORV, VTP | Match against ID Card |

### 3.2 Vehicle Identification (WARNING level)

| Parameter | Czech Name | Current Status | Gap? | OCR Extractable |
|-----------|------------|----------------|------|-----------------|
| **Make** | Značka | Exists (`znacka`) | No | Yes (ORV, VTP) |
| **Model** | Model | Exists (`model`) | No | Yes (ORV, VTP) |
| **Year of Manufacture** | Rok výroby | Exists (`rok_vyroby`) | No | Not directly* |
| **First Registration Date** | Datum první registrace | Exists (`datum_1_registrace`) | No | Yes (ORV, VTP) |
| **Last Re-Registration Date** | Datum poslední přeregistrace | **MISSING** | **YES** | Yes (VTP) |
| **Engine Number** | Číslo motoru | **MISSING** | **YES** | Yes (VTP: `engineType`) |
| **Body Type** | Karoserie | **MISSING** | **YES** | Yes (VTP: `bodyType`) |
| **Color** | Barva | **MISSING** | **YES** | Yes (ORV, VTP) |

*Note: Year of manufacture can be derived from VIN or first registration date

### 3.3 Technical Parameters

| Parameter | Czech Name | Current Status | Gap? | OCR Extractable |
|-----------|------------|----------------|------|-----------------|
| **Tachometer (Mileage)** | Stav tachometru | **MISSING** | **YES** | No (BC Step 2 input) |
| **Engine Capacity** | Objem motoru | **MISSING** | **YES** | Yes (ORV: `engineCcm`, VTP: `engineCcm`) |
| **Power (kW)** | Výkon | Exists (`vykon_kw`) | No | Yes (ORV: `maxPower`, VTP: `maxPowerKw`) |
| **Fuel Type** | Palivo | **MISSING** | **YES** | Yes (ORV, VTP: `fuelType`) |
| **Weight** | Hmotnost | **MISSING** | **YES** | Yes (VTP: `operatingWeight`, `maxPermittedWeight`) |
| **Number of Seats** | Počet míst | **MISSING** | **YES** | Yes (ORV, VTP: `seats`) |
| **Max Speed** | Nejvyšší rychlost | **MISSING** | **YES** | Yes (ORV, VTP: `maxSpeed`) |
| **Vehicle Category** | Kategorie vozidla | **MISSING** | **YES** | Yes (VTP: `vehicleCategory`) |

---

## 4. Missing Fields Summary

### 4.1 High Priority (Required for validation/fraud detection)

| Field | Czech Name | Type | Source | Blocking Level |
|-------|------------|------|--------|----------------|
| `tachometer_km` | Stav tachometru | INTEGER | Manual/BC | CRITICAL (tampering) |
| `datum_posledni_preregistrace` | Datum poslední přeregistrace | DATE | OCR (VTP) | WARNING (10-day fraud check) |
| `barva` | Barva | VARCHAR(50) | OCR (ORV, VTP) | INFO |
| `palivo` | Palivo | VARCHAR(20) | OCR (ORV, VTP) | INFO |
| `objem_motoru` | Objem motoru | INTEGER | OCR (ORV, VTP) | INFO |
| `pocet_mist` | Počet míst | INTEGER | OCR (ORV, VTP) | INFO |

### 4.2 Medium Priority (Enhanced validation)

| Field | Czech Name | Type | Source | Notes |
|-------|------------|------|--------|-------|
| `cislo_motoru` | Číslo motoru | VARCHAR(50) | OCR (VTP) | Engine identity |
| `karoserie` | Karoserie | VARCHAR(50) | OCR (VTP) | Body type code |
| `max_rychlost` | Nejvyšší rychlost | INTEGER | OCR (ORV, VTP) | km/h |
| `kategorie_vozidla` | Kategorie vozidla | VARCHAR(10) | OCR (VTP) | M1, N1, etc. |

### 4.3 Lower Priority (Extended data)

| Field | Czech Name | Type | Source | Notes |
|-------|------------|------|--------|-------|
| `provozni_hmotnost` | Provozní hmotnost | INTEGER | OCR (VTP) | kg |
| `povolena_hmotnost` | Povolená hmotnost | INTEGER | OCR (VTP) | kg |
| `delka` | Celková délka | INTEGER | OCR (VTP) | mm |
| `sirka` | Celková šířka | INTEGER | OCR (VTP) | mm |
| `vyska` | Celková výška | INTEGER | OCR (VTP) | mm |
| `rozvor` | Rozvor | INTEGER | OCR (VTP) | mm |
| `emise_co2` | Emise CO2 | VARCHAR(50) | OCR (VTP) | g/km |
| `spotreba_paliva` | Spotřeba paliva | VARCHAR(50) | OCR (VTP) | l/100km |
| `emisni_norma` | Emisní norma | VARCHAR(50) | OCR (VTP) | Euro 6, etc. |

---

## 5. OCR Extraction Capabilities

### 5.1 ORV (Osvědčení o registraci vozidla - Part I)

Currently extractable fields from `orv-schema.ts`:

| OCR Field | Maps to DB Field | Currently Stored? |
|-----------|------------------|-------------------|
| `registrationPlateNumber` | `spz` | Yes |
| `vin` | `vin` | Yes |
| `firstRegistrationDate` | `datum_1_registrace` | Yes |
| `keeperName` | `majitel` | Yes |
| `keeperAddress` | - | No |
| `make` | `znacka` | Yes |
| `model` | `model` | Yes |
| `fuelType` | `palivo` | **No - MISSING** |
| `engineCcm` | `objem_motoru` | **No - MISSING** |
| `maxPower` | `vykon_kw` | Yes (needs parsing) |
| `seats` | `pocet_mist` | **No - MISSING** |
| `color` | `barva` | **No - MISSING** |
| `maxSpeed` | `max_rychlost` | **No - MISSING** |
| `orvDocumentNumber` | - | No (audit only) |

### 5.2 VTP (Technický průkaz - Part II)

Additional fields from `vtp-schema.ts`:

| OCR Field | Maps to DB Field | Currently Stored? | Notes |
|-----------|------------------|-------------------|-------|
| `ownerIco` | vendors.`company_id` | Via vendors table | ARES validation |
| `bodyType` | `karoserie` | **No - MISSING** | |
| `engineType` | `cislo_motoru` | **No - MISSING** | |
| `vehicleCategory` | `kategorie_vozidla` | **No - MISSING** | |
| `operatingWeight` | `provozni_hmotnost` | **No - MISSING** | |
| `maxPermittedWeight` | `povolena_hmotnost` | **No - MISSING** | |
| `length` | `delka` | **No - MISSING** | |
| `width` | `sirka` | **No - MISSING** | |
| `height` | `vyska` | **No - MISSING** | |
| `wheelbase` | `rozvor` | **No - MISSING** | |
| `co2Emissions` | `emise_co2` | **No - MISSING** | |
| `fuelConsumption` | `spotreba_paliva` | **No - MISSING** | |
| `emissionStandard` | `emisni_norma` | **No - MISSING** | |
| `lastInspectionDate` | `datum_stk` | **No - MISSING** | |
| `nextInspectionDue` | `stk_platnost` | **No - MISSING** | |

---

## 6. Recommended Actions

### 6.1 Phase 1 - Critical Gap Closure

Add these fields to the `vehicles` table immediately:

```sql
-- High priority fields
ALTER TABLE vehicles ADD COLUMN tachometer_km INTEGER;
ALTER TABLE vehicles ADD COLUMN datum_posledni_preregistrace DATE;
ALTER TABLE vehicles ADD COLUMN barva VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN palivo VARCHAR(20);
ALTER TABLE vehicles ADD COLUMN objem_motoru INTEGER;
ALTER TABLE vehicles ADD COLUMN pocet_mist INTEGER;
```

### 6.2 Phase 2 - Enhanced Validation

```sql
-- Medium priority fields
ALTER TABLE vehicles ADD COLUMN cislo_motoru VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN karoserie VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN max_rychlost INTEGER;
ALTER TABLE vehicles ADD COLUMN kategorie_vozidla VARCHAR(10);
```

### 6.3 Phase 3 - Extended Data

```sql
-- Lower priority fields (VTP-sourced)
ALTER TABLE vehicles ADD COLUMN provozni_hmotnost INTEGER;
ALTER TABLE vehicles ADD COLUMN povolena_hmotnost INTEGER;
ALTER TABLE vehicles ADD COLUMN delka INTEGER;
ALTER TABLE vehicles ADD COLUMN sirka INTEGER;
ALTER TABLE vehicles ADD COLUMN vyska INTEGER;
ALTER TABLE vehicles ADD COLUMN rozvor INTEGER;
ALTER TABLE vehicles ADD COLUMN emise_co2 VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN spotreba_paliva VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN emisni_norma VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN datum_stk DATE;
ALTER TABLE vehicles ADD COLUMN stk_platnost DATE;
```

---

## 7. Field-to-OCR Mapping Matrix

| DB Field | ORV Field | VTP Field | Manual Input | BC Import |
|----------|-----------|-----------|--------------|-----------|
| `spz` | `registrationPlateNumber` | `registrationPlateNumber` | Yes | Yes |
| `vin` | `vin` | `vin` | Yes | Yes |
| `znacka` | `make` | `make` | Yes | Yes |
| `model` | `model` | `commercialName` | Yes | Yes |
| `majitel` | `keeperName` | `ownerName` | Yes | - |
| `datum_1_registrace` | `firstRegistrationDate` | `firstRegistrationDate` | Yes | - |
| `vykon_kw` | `maxPower` (parse) | `maxPowerKw` | Yes | - |
| `barva` | `color` | `color` | - | - |
| `palivo` | `fuelType` | `fuelType` | - | - |
| `objem_motoru` | `engineCcm` | `engineCcm` | - | - |
| `pocet_mist` | `seats` | `seats` | - | - |
| `max_rychlost` | `maxSpeed` | `maxSpeed` | - | - |
| `karoserie` | - | `bodyType` | - | - |
| `cislo_motoru` | - | `engineType` | - | - |
| `kategorie_vozidla` | - | `vehicleCategory` | - | - |
| `tachometer_km` | - | - | Yes | Yes |

---

## 8. Validation Rules Impact

### New rules needed after schema update:

| Rule ID | Field | Severity | Description |
|---------|-------|----------|-------------|
| VEH-010 | `barva` | INFO | Color match ORV vs VTP |
| VEH-011 | `palivo` | WARNING | Fuel type consistency |
| VEH-012 | `objem_motoru` | INFO | Engine displacement match |
| VEH-013 | `pocet_mist` | INFO | Seat count consistency |
| VEH-014 | `tachometer_km` | CRITICAL | Mileage tampering check (Cebia) |
| VEH-015 | `datum_posledni_preregistrace` | WARNING | 10-day fraud check |

---

## 9. Conclusion

The current `vehicles` table covers **core identifiers** but is missing **50%+ of extractable vehicle data** from OCR documents. Priority should be:

1. **Immediately add**: `tachometer_km`, `datum_posledni_preregistrace` (fraud detection)
2. **Short-term**: `barva`, `palivo`, `objem_motoru`, `pocet_mist` (already OCR-extracted)
3. **Medium-term**: Extended VTP fields for comprehensive vehicle profile

The OCR service already extracts most of this data via ORV and VTP schemas - the gap is in **persisting it to the database**.

---

## 10. Implementation Execution

### ADWS Agentic Workflow

Run Phase 7 implementation using the ADWS (Agentic Development Workflow System):

```bash
# Navigate to project root
cd /Users/jakubstrouhal/Documents/SecureDealAI

# Run Phase 7 with GitHub issue tracking
uv run ADWS/run_phase.py 7 --issue 33

# Dry-run to preview tasks
uv run ADWS/run_phase.py 7 --dry-run

# Skip completed tasks if resuming
uv run ADWS/run_phase.py 7 --issue 33 --skip-completed

# Continue after failure
uv run ADWS/run_phase.py 7 --issue 33 --continue
```

### Task Execution Order

```
1. 07_01 - Vehicle Schema Migration (DB columns)
2. 07_02 - OCR Extraction Mapping (transformer updates)  ← parallel with 07_03
3. 07_03 - Vehicle CRUD Update (API handlers)            ← parallel with 07_02
4. 07_04 - Vehicle Form Update (frontend)                ← after 07_03
5. 07_05 - Vehicle Validation Rules (new rules)          ← after 07_01 + 07_02
```

### Related Documents

| Document | Purpose |
|----------|---------|
| [PHASE7_00_ARCHITECTURE.md](../implementation/PHASE7_00_ARCHITECTURE.md) | High-level architecture |
| [PHASE7_IMPLEMENTATION_TRACKER.md](../implementation/PHASE7_IMPLEMENTATION_TRACKER.md) | Progress tracking |
| [07_01_VEHICLE_SCHEMA_MIGRATION.md](../implementation/07_01_VEHICLE_SCHEMA_MIGRATION.md) | Task: DB migration |
| [07_02_OCR_EXTRACTION_MAPPING.md](../implementation/07_02_OCR_EXTRACTION_MAPPING.md) | Task: OCR mapping |
| [07_03_VEHICLE_CRUD_UPDATE.md](../implementation/07_03_VEHICLE_CRUD_UPDATE.md) | Task: API update |
| [07_04_VEHICLE_FORM_UPDATE.md](../implementation/07_04_VEHICLE_FORM_UPDATE.md) | Task: Frontend |
| [07_05_VEHICLE_VALIDATION_RULES.md](../implementation/07_05_VEHICLE_VALIDATION_RULES.md) | Task: Rules |
