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
