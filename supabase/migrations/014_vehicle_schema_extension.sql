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
