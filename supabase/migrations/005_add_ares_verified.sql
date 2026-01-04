-- ============================================================================
-- Migration: Add ares_verified column to vendors table
-- ============================================================================
-- Version: 005
-- Created: 2026-01-04
-- Purpose: Add ares_verified boolean column for ARES verification status
-- ============================================================================

-- Add ares_verified columns to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ares_verified BOOLEAN DEFAULT NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ares_verified_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN vendors.ares_verified IS 'ARES verification status: true = verified, false = failed, null = not checked';
COMMENT ON COLUMN vendors.ares_verified_at IS 'Timestamp when ARES verification was performed';
