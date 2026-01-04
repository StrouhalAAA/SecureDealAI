-- ============================================================================
-- Migration: Add ares_verified_at column to vendors table
-- ============================================================================

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ares_verified_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN vendors.ares_verified_at IS 'Timestamp when ARES verification was performed';
