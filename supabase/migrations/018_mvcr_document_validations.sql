-- ============================================================================
-- Migration: 018_mvcr_document_validations.sql
-- Purpose: Create table for caching MVCR Invalid Documents API results
-- Author: SecureDealAI
-- Date: 2026-01-18
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MVCR DOCUMENT VALIDATIONS TABLE
-- Cache for MVCR Invalid Documents registry checks
-- API: https://aplikace.mv.gov.cz/neplatne-doklady/doklady.aspx
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mvcr_document_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

    -- Input data
    document_number VARCHAR(20) NOT NULL,
    document_type INTEGER NOT NULL DEFAULT 0,  -- 0=ID Card, 4=Passport, 6=Weapons

    -- Validation result
    is_valid BOOLEAN NOT NULL,                 -- true = document NOT in invalid list (good)
    is_invalid_document BOOLEAN NOT NULL DEFAULT false,  -- true = found in MVCR invalid list (bad)

    -- Raw response for debugging/audit
    mvcr_response_raw TEXT,
    mvcr_checked_at TIMESTAMPTZ NOT NULL,

    -- Check status
    check_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS'
        CHECK (check_status IN ('SUCCESS', 'API_ERROR', 'TIMEOUT', 'INVALID_RESPONSE')),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint per buying opportunity + document
    CONSTRAINT uq_mvcr_bo_document UNIQUE (buying_opportunity_id, document_number)
);

-- Indexes for common queries
CREATE INDEX idx_mvcr_buying_opp ON mvcr_document_validations(buying_opportunity_id);
CREATE INDEX idx_mvcr_document_number ON mvcr_document_validations(document_number);
CREATE INDEX idx_mvcr_checked_at ON mvcr_document_validations(mvcr_checked_at);

-- Comment
COMMENT ON TABLE mvcr_document_validations IS 'MVCR Invalid Documents validation cache - checks if ID cards are not lost/stolen/revoked';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tr_mvcr_document_validations_updated ON mvcr_document_validations;
CREATE TRIGGER tr_mvcr_document_validations_updated
    BEFORE UPDATE ON mvcr_document_validations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE mvcr_document_validations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (following ares_validations pattern)
CREATE POLICY "mvcr_document_validations_select" ON mvcr_document_validations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "mvcr_document_validations_insert" ON mvcr_document_validations
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "mvcr_document_validations_update" ON mvcr_document_validations
    FOR UPDATE TO authenticated
    USING (true);

-- Also allow anon role for Edge Functions (following pattern from 004_anon_rls_policies.sql)
CREATE POLICY "anon_mvcr_document_validations_select" ON mvcr_document_validations
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "anon_mvcr_document_validations_insert" ON mvcr_document_validations
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "anon_mvcr_document_validations_update" ON mvcr_document_validations
    FOR UPDATE TO anon
    USING (true);
