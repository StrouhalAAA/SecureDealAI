-- ============================================================================
-- Migration: Add is_vat_payer column to vendors table
-- ============================================================================
-- This migration adds the is_vat_payer boolean column to the vendors table
-- to track whether the vendor is a VAT payer (platce DPH).
-- The vat_id column already exists from the initial schema.
-- ============================================================================

-- Add is_vat_payer column
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS is_vat_payer BOOLEAN DEFAULT false;

-- Add constraint: VAT ID is required when is_vat_payer is true
ALTER TABLE vendors
ADD CONSTRAINT vendor_vat_check CHECK (
    (is_vat_payer = false) OR (is_vat_payer = true AND vat_id IS NOT NULL)
);

COMMENT ON COLUMN vendors.is_vat_payer IS 'Whether the vendor is a VAT payer (platce DPH)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
