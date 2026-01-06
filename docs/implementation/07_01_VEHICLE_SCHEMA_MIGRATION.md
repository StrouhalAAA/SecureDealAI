# Task 7.1: Vehicle Schema Migration

> **Phase**: 7 - Vehicle Data Schema Extension
> **Status**: [ ] Pending
> **Priority**: Critical
> **Depends On**: None
> **Estimated Effort**: 1 hour

---

## Objective

Create a database migration to extend the `vehicles` table with additional fields for:
- Fraud detection (`tachometer_km`, `datum_posledni_preregistrace`)
- OCR-extractable data (color, fuel type, engine specs, etc.)
- Extended VTP technical data (dimensions, weights, emissions)

**All new columns must be nullable** to maintain backward compatibility.

---

## Prerequisites

- [ ] None - this task can start immediately

---

## Architecture Reference

See: [PHASE7_00_ARCHITECTURE.md](./PHASE7_00_ARCHITECTURE.md)
See: [VEHICLE_TABLE_GAP_ANALYSIS.md](../Analysis/VEHICLE_TABLE_GAP_ANALYSIS.md)

---

## Implementation Steps

### Step 1: Create Migration File

Create file: `supabase/migrations/014_vehicle_schema_extension.sql`

```sql
-- ============================================================================
-- Migration 014: Vehicle Schema Extension
-- ============================================================================
-- Purpose: Add missing fields for fraud detection and OCR data capture
-- Created: 2026-01-06
-- Phase: 7.1
-- ============================================================================

-- ============================================================================
-- PHASE 7.1: FRAUD DETECTION FIELDS (Critical Priority)
-- ============================================================================

-- Tachometer reading for mileage tampering detection
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tachometer_km INTEGER;
COMMENT ON COLUMN vehicles.tachometer_km IS 'Odometer reading in km. Source: Manual input or BC import. Used for tampering detection.';

-- Last re-registration date for 10-day fraud rule
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS datum_posledni_preregistrace DATE;
COMMENT ON COLUMN vehicles.datum_posledni_preregistrace IS 'Last re-registration date. Source: VTP OCR. Used for 10-day fraud check.';

-- ============================================================================
-- PHASE 7.2: OCR-EXTRACTABLE FIELDS (Already parsed but not stored)
-- ============================================================================

-- Vehicle color from ORV/VTP (R. BARVA)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS barva VARCHAR(50);
COMMENT ON COLUMN vehicles.barva IS 'Vehicle color in Czech. Source: ORV/VTP OCR field "color".';

-- Fuel type code from ORV/VTP (P.3 PALIVO)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS palivo VARCHAR(20);
COMMENT ON COLUMN vehicles.palivo IS 'Fuel type code (BA, NM, EL, LPG, CNG, H, HYBRID). Source: ORV/VTP OCR field "fuelType".';

-- Engine displacement from ORV/VTP (P.1 ZDVIHOVÝ OBJEM)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS objem_motoru INTEGER;
COMMENT ON COLUMN vehicles.objem_motoru IS 'Engine displacement in cm3. Source: ORV/VTP OCR field "engineCcm".';

-- Number of seats from ORV/VTP (S.1 POČET MÍST K SEZENÍ)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pocet_mist INTEGER;
COMMENT ON COLUMN vehicles.pocet_mist IS 'Number of seats. Source: ORV/VTP OCR field "seats".';

-- Maximum speed from ORV/VTP (T. NEJVYŠŠÍ RYCHLOST)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS max_rychlost INTEGER;
COMMENT ON COLUMN vehicles.max_rychlost IS 'Maximum speed in km/h. Source: ORV/VTP OCR field "maxSpeed".';

-- Vehicle category from VTP (J. KATEGORIE VOZIDLA)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS kategorie_vozidla VARCHAR(10);
COMMENT ON COLUMN vehicles.kategorie_vozidla IS 'Vehicle category code (M1, N1, L, etc.). Source: VTP OCR field "vehicleCategory".';

-- ============================================================================
-- PHASE 7.3: EXTENDED VTP DATA
-- ============================================================================

-- Body type from VTP (2. Karoserie)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS karoserie VARCHAR(50);
COMMENT ON COLUMN vehicles.karoserie IS 'Body type code (AC KOMBI, AB SEDAN, etc.). Source: VTP OCR field "bodyType".';

-- Engine number/type from VTP (5. Typ motoru)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS cislo_motoru VARCHAR(50);
COMMENT ON COLUMN vehicles.cislo_motoru IS 'Engine type/number. Source: VTP OCR field "engineType".';

-- Operating weight from VTP (G. Provozní hmotnost)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS provozni_hmotnost INTEGER;
COMMENT ON COLUMN vehicles.provozni_hmotnost IS 'Operating weight in kg. Source: VTP OCR field "operatingWeight".';

-- Maximum permitted weight from VTP (F.2 Povolená hmotnost)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS povolena_hmotnost INTEGER;
COMMENT ON COLUMN vehicles.povolena_hmotnost IS 'Maximum permitted weight in kg. Source: VTP OCR field "maxPermittedWeight".';

-- Dimensions from VTP (12, 13, 14, M)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS delka INTEGER;
COMMENT ON COLUMN vehicles.delka IS 'Total length in mm. Source: VTP OCR field "length".';

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sirka INTEGER;
COMMENT ON COLUMN vehicles.sirka IS 'Total width in mm. Source: VTP OCR field "width".';

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vyska INTEGER;
COMMENT ON COLUMN vehicles.vyska IS 'Total height in mm. Source: VTP OCR field "height".';

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rozvor INTEGER;
COMMENT ON COLUMN vehicles.rozvor IS 'Wheelbase in mm. Source: VTP OCR field "wheelbase".';

-- Environmental data from VTP
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS emise_co2 VARCHAR(50);
COMMENT ON COLUMN vehicles.emise_co2 IS 'CO2 emissions in g/km. Source: VTP OCR field "co2Emissions".';

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS spotreba_paliva VARCHAR(50);
COMMENT ON COLUMN vehicles.spotreba_paliva IS 'Fuel consumption (may be multiple values). Source: VTP OCR field "fuelConsumption".';

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS emisni_norma VARCHAR(50);
COMMENT ON COLUMN vehicles.emisni_norma IS 'Emission standard (Euro 6, etc.). Source: VTP OCR field "emissionStandard".';

-- STK (technical inspection) dates from VTP
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS datum_stk DATE;
COMMENT ON COLUMN vehicles.datum_stk IS 'Last technical inspection date. Source: VTP OCR field "lastInspectionDate".';

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS stk_platnost DATE;
COMMENT ON COLUMN vehicles.stk_platnost IS 'Next technical inspection due date. Source: VTP OCR field "nextInspectionDue".';

-- ============================================================================
-- INDEXES for frequently queried fields
-- ============================================================================

-- Tachometer index for range queries (fraud detection)
CREATE INDEX IF NOT EXISTS idx_vehicles_tachometer ON vehicles(tachometer_km) WHERE tachometer_km IS NOT NULL;

-- Fuel type index for filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_palivo ON vehicles(palivo) WHERE palivo IS NOT NULL;

-- STK expiry for alerts
CREATE INDEX IF NOT EXISTS idx_vehicles_stk_platnost ON vehicles(stk_platnost) WHERE stk_platnost IS NOT NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
```

### Step 2: Create Rollback Migration

Create file: `supabase/rollbacks/014_vehicle_schema_extension_DOWN.sql`

```sql
-- ============================================================================
-- Rollback Migration 014: Vehicle Schema Extension
-- ============================================================================
-- WARNING: This will drop all Phase 7 columns and their data
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_vehicles_tachometer;
DROP INDEX IF EXISTS idx_vehicles_palivo;
DROP INDEX IF EXISTS idx_vehicles_stk_platnost;

-- Phase 7.3 columns
ALTER TABLE vehicles DROP COLUMN IF EXISTS stk_platnost;
ALTER TABLE vehicles DROP COLUMN IF EXISTS datum_stk;
ALTER TABLE vehicles DROP COLUMN IF EXISTS emisni_norma;
ALTER TABLE vehicles DROP COLUMN IF EXISTS spotreba_paliva;
ALTER TABLE vehicles DROP COLUMN IF EXISTS emise_co2;
ALTER TABLE vehicles DROP COLUMN IF EXISTS rozvor;
ALTER TABLE vehicles DROP COLUMN IF EXISTS vyska;
ALTER TABLE vehicles DROP COLUMN IF EXISTS sirka;
ALTER TABLE vehicles DROP COLUMN IF EXISTS delka;
ALTER TABLE vehicles DROP COLUMN IF EXISTS povolena_hmotnost;
ALTER TABLE vehicles DROP COLUMN IF EXISTS provozni_hmotnost;
ALTER TABLE vehicles DROP COLUMN IF EXISTS cislo_motoru;
ALTER TABLE vehicles DROP COLUMN IF EXISTS karoserie;

-- Phase 7.2 columns
ALTER TABLE vehicles DROP COLUMN IF EXISTS kategorie_vozidla;
ALTER TABLE vehicles DROP COLUMN IF EXISTS max_rychlost;
ALTER TABLE vehicles DROP COLUMN IF EXISTS pocet_mist;
ALTER TABLE vehicles DROP COLUMN IF EXISTS objem_motoru;
ALTER TABLE vehicles DROP COLUMN IF EXISTS palivo;
ALTER TABLE vehicles DROP COLUMN IF EXISTS barva;

-- Phase 7.1 columns
ALTER TABLE vehicles DROP COLUMN IF EXISTS datum_posledni_preregistrace;
ALTER TABLE vehicles DROP COLUMN IF EXISTS tachometer_km;
```

### Step 3: Apply Migration

```bash
# Apply migration to remote database
supabase db push

# Verify columns were added
supabase db dump --schema public | grep -A 50 "CREATE TABLE.*vehicles"
```

---

## Test Cases

### Verification Queries

```sql
-- Check all new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles'
  AND column_name IN (
    'tachometer_km', 'datum_posledni_preregistrace',
    'barva', 'palivo', 'objem_motoru', 'pocet_mist', 'max_rychlost', 'kategorie_vozidla',
    'karoserie', 'cislo_motoru', 'provozni_hmotnost', 'povolena_hmotnost',
    'delka', 'sirka', 'vyska', 'rozvor',
    'emise_co2', 'spotreba_paliva', 'emisni_norma',
    'datum_stk', 'stk_platnost'
  )
ORDER BY column_name;

-- Verify backward compatibility (insert with old fields only)
INSERT INTO vehicles (buying_opportunity_id, spz, vin, znacka, model)
VALUES ('00000000-0000-0000-0000-000000000001', 'TEST123', 'TESTVIN12345678', 'TEST', 'MODEL');

-- Verify new fields can be updated
UPDATE vehicles
SET tachometer_km = 150000, barva = 'ČERNÁ', palivo = 'BA'
WHERE spz = 'TEST123';

-- Cleanup test data
DELETE FROM vehicles WHERE spz = 'TEST123';
```

### Expected Results

| Check | Expected |
|-------|----------|
| Column count | 21 new columns added |
| All columns nullable | Yes (is_nullable = 'YES') |
| Old inserts work | Success without new fields |
| Indexes created | 3 new indexes |

---

## Validation Criteria

- [ ] Migration file created at `supabase/migrations/014_vehicle_schema_extension.sql`
- [ ] Rollback file created at `supabase/rollbacks/014_vehicle_schema_extension_DOWN.sql`
- [ ] Migration applied successfully (`supabase db push`)
- [ ] All 21 new columns exist and are nullable
- [ ] Existing data preserved (no data loss)
- [ ] Backward compatibility verified (old-format inserts work)
- [ ] New indexes created

---

## Completion Checklist

- [ ] Migration file created
- [ ] Rollback file created
- [ ] Migration applied to remote database
- [ ] Columns verified via SQL query
- [ ] Backward compatibility tested
- [ ] Update tracker: `PHASE7_IMPLEMENTATION_TRACKER.md`

---

## Troubleshooting

### Migration fails with "column already exists"
- The `IF NOT EXISTS` clause should prevent this
- If it persists, check if a partial migration was applied
- Use rollback script then re-apply

### Permission denied
- Ensure you're using service role key
- Check RLS policies (service role should bypass)

### Data type mismatch
- All new columns are standard PostgreSQL types
- VARCHAR, INTEGER, DATE are universally supported
