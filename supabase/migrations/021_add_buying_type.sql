-- Migration: 021_add_buying_type
-- Description: Add buying_type column to buying_opportunities table for deal channel classification
-- Date: 2026-01-21

-- Add buying_type column with default 'BRANCH' for backward compatibility
ALTER TABLE buying_opportunities
ADD COLUMN IF NOT EXISTS buying_type VARCHAR(20) DEFAULT 'BRANCH'
CHECK (buying_type IN ('BRANCH', 'MOBILE_BUYING'));

-- Add comment for documentation
COMMENT ON COLUMN buying_opportunities.buying_type IS
    'Deal channel type: BRANCH (default) for branch deals, MOBILE_BUYING for mobile agents';

-- Create index for filtering by buying_type
CREATE INDEX IF NOT EXISTS idx_buying_opportunities_buying_type
ON buying_opportunities(buying_type);
