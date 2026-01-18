-- ============================================================================
-- Migration 016: Relax Vendor Constraint for OCR Data
-- ============================================================================
-- Purpose: Allow PHYSICAL_PERSON vendors to have NULL personal_id when
--          data_source is 'OCR', enabling auto-creation from OCR keeper info
-- Created: 2026-01-18
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendor_id_check;

-- Add updated constraint that allows NULL personal_id for OCR-sourced vendors
-- This enables creating vendor records from OCR data where personal_id (rodne cislo)
-- is not available on the ORV document - users must fill it in manually later
ALTER TABLE vendors ADD CONSTRAINT vendor_id_check CHECK (
    (vendor_type = 'PHYSICAL_PERSON' AND (personal_id IS NOT NULL OR data_source = 'OCR')) OR
    (vendor_type = 'COMPANY' AND company_id IS NOT NULL)
);

COMMENT ON CONSTRAINT vendor_id_check ON vendors IS
    'Ensures FO vendors have personal_id (except OCR-created) and PO vendors have company_id';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
