-- ============================================================================
-- Migration 017: Fix kategorie_vozidla VARCHAR Size
-- ============================================================================
-- Purpose: Increase kategorie_vozidla column size to accommodate OCR-extracted
--          Czech vehicle type descriptions (e.g., "OSOBNÍ AUTOMOBIL")
-- Created: 2026-01-18
-- Bug Reference: PostgreSQL error 22001 on vehicle insert
-- ============================================================================

-- Increase column size from VARCHAR(10) to VARCHAR(50)
-- This matches other similar text columns in the vehicles table
ALTER TABLE vehicles ALTER COLUMN kategorie_vozidla TYPE VARCHAR(50);

COMMENT ON COLUMN vehicles.kategorie_vozidla IS 'Vehicle category/type (Czech description). Source: ORV/VTP OCR field "vehicleType". Example values: OSOBNÍ AUTOMOBIL, NÁKLADNÍ AUTOMOBIL, MOTOCYKL';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
