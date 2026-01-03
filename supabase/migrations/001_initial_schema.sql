-- ============================================================================
-- SecureDealAI MVP - Complete Database Schema
-- ============================================================================
-- Version: 2.0.0
-- Created: 2026-01-01
-- Updated: 2026-01-03 - Combined entity tables with dynamic validation rules
-- Purpose: Complete database schema for SecureDealAI MVP
-- Target: Supabase PostgreSQL
-- ============================================================================
--
-- TABLES:
--   1. buying_opportunities - Main entity (SPZ as business key)
--   2. vehicles - Vehicle data with OCR mappings
--   3. vendors - Seller data (FO/PO)
--   4. ocr_extractions - OCR processing results (SPZ-linked)
--   5. ares_validations - ARES/ADIS cache
--   6. validation_rules - Dynamic rules (JSON)
--   7. validation_results - Validation outputs
--   8. validation_audit_log - Audit trail
--   9. rule_change_history - Rule version tracking
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BUYING OPPORTUNITIES TABLE
-- Main entity - SPZ as business key
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS buying_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spz VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'VALIDATED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buying_opportunities_spz ON buying_opportunities(spz);
CREATE INDEX idx_buying_opportunities_status ON buying_opportunities(status);

COMMENT ON TABLE buying_opportunities IS 'Main entity table - each buying opportunity identified by SPZ';

-- ----------------------------------------------------------------------------
-- 2. VEHICLES TABLE
-- Vehicle data with OCR mappings
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

    -- Core vehicle data
    spz VARCHAR(20) NOT NULL,
    vin VARCHAR(17),
    znacka VARCHAR(100),
    model VARCHAR(100),
    rok_vyroby INTEGER,
    datum_1_registrace DATE,
    majitel VARCHAR(200),
    motor VARCHAR(50),
    vykon_kw DECIMAL(10,2),

    -- Metadata
    data_source VARCHAR(20) DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'OCR', 'BC_IMPORT')),
    validation_status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(buying_opportunity_id)
);

CREATE INDEX idx_vehicles_buying_opp ON vehicles(buying_opportunity_id);
CREATE INDEX idx_vehicles_spz ON vehicles(spz);
CREATE INDEX idx_vehicles_vin ON vehicles(vin) WHERE vin IS NOT NULL;

COMMENT ON TABLE vehicles IS 'Vehicle data from manual input or OCR extraction';

-- ----------------------------------------------------------------------------
-- 3. VENDORS TABLE
-- Seller data (FO = Physical Person, PO = Company)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

    -- Vendor type
    vendor_type VARCHAR(20) NOT NULL CHECK (vendor_type IN ('PHYSICAL_PERSON', 'COMPANY')),
    name VARCHAR(200) NOT NULL,

    -- FO specific (Fyzická osoba / Physical Person)
    personal_id VARCHAR(15),           -- Rodné číslo (######/####)
    date_of_birth DATE,
    place_of_birth VARCHAR(100),

    -- PO specific (Právnická osoba / Company)
    company_id VARCHAR(15),            -- IČO (8 digits)
    vat_id VARCHAR(15),                -- DIČ (CZxxxxxxxx)

    -- Address
    address_street VARCHAR(200),
    address_city VARCHAR(100),
    address_postal_code VARCHAR(10),
    country_code VARCHAR(2) DEFAULT 'CZ',

    -- Contact
    phone VARCHAR(20),
    email VARCHAR(100),
    bank_account VARCHAR(50),

    -- ID Document info (for FO)
    document_number VARCHAR(20),
    document_issue_date DATE,
    document_expiry_date DATE,
    issuing_authority VARCHAR(100),

    -- Metadata
    data_source VARCHAR(20) DEFAULT 'MANUAL',
    validation_status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(buying_opportunity_id),

    -- Constraint: IČO or RČ required based on type
    CONSTRAINT vendor_id_check CHECK (
        (vendor_type = 'PHYSICAL_PERSON' AND personal_id IS NOT NULL) OR
        (vendor_type = 'COMPANY' AND company_id IS NOT NULL)
    )
);

CREATE INDEX idx_vendors_buying_opp ON vendors(buying_opportunity_id);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_company_id ON vendors(company_id) WHERE company_id IS NOT NULL;

COMMENT ON TABLE vendors IS 'Vendor/seller data - supports both physical persons (FO) and companies (PO)';

-- ----------------------------------------------------------------------------
-- 4. OCR EXTRACTIONS TABLE
-- OCR processing results (SPZ-linked - ACBS pattern)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ocr_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- SPZ linking (ACBS pattern instead of FK)
    spz VARCHAR(20) NOT NULL,

    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('ORV', 'OP', 'VTP')),
    document_file_url TEXT,

    ocr_status VARCHAR(20) DEFAULT 'PENDING' CHECK (ocr_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    ocr_provider VARCHAR(50) DEFAULT 'MISTRAL',

    extracted_data JSONB,
    extraction_confidence DECIMAL(5,2),
    errors JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ocr_spz ON ocr_extractions(spz);
CREATE INDEX idx_ocr_spz_type ON ocr_extractions(spz, document_type);
CREATE INDEX idx_ocr_status ON ocr_extractions(ocr_status);

COMMENT ON TABLE ocr_extractions IS 'OCR processing results linked by SPZ (ACBS pattern)';

-- ----------------------------------------------------------------------------
-- 5. ARES VALIDATIONS TABLE
-- ARES/ADIS cache for company validations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ares_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

    -- Input data
    ico VARCHAR(15) NOT NULL,
    dic VARCHAR(15),
    bank_account VARCHAR(50),

    -- ARES response cache
    ares_data JSONB,
    ares_fetched_at TIMESTAMPTZ,

    -- DPH Registry response cache
    dph_status JSONB,
    dph_bank_accounts JSONB,
    dph_fetched_at TIMESTAMPTZ,

    -- Validation results
    validation_results JSONB NOT NULL,
    overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('GREEN', 'ORANGE', 'RED')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ares_buying_opp ON ares_validations(buying_opportunity_id);
CREATE INDEX idx_ares_ico ON ares_validations(ico);

COMMENT ON TABLE ares_validations IS 'ARES/ADIS validation results and cached data for company verification';

-- ----------------------------------------------------------------------------
-- 6. VALIDATION RULES TABLE
-- Dynamic validation rules with JSON definitions and versioning
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS validation_rules (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(20) NOT NULL,                     -- Human-readable ID (VEH-001, ARES-002)

    -- Rule definition (JSON matching VALIDATION_RULES_SCHEMA.json)
    rule_definition JSONB NOT NULL,

    -- Status flags
    is_active BOOLEAN DEFAULT false,                  -- Only active rules are used in validation
    is_draft BOOLEAN DEFAULT true,                    -- Draft rules can be edited freely

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES validation_rules(id),

    -- Schema compatibility
    schema_version VARCHAR(10) DEFAULT '1.0',         -- JSON Schema version this rule conforms to

    -- Audit fields
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    activated_by VARCHAR(100),
    activated_at TIMESTAMPTZ,
    deactivated_by VARCHAR(100),
    deactivated_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT uq_rule_id_version UNIQUE (rule_id, version),
    CONSTRAINT chk_rule_definition CHECK (jsonb_typeof(rule_definition) = 'object'),
    CONSTRAINT chk_active_not_draft CHECK (NOT (is_active = true AND is_draft = true))
);

-- Indexes for common queries
CREATE INDEX idx_validation_rules_rule_id ON validation_rules(rule_id);
CREATE INDEX idx_validation_rules_active ON validation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_validation_rules_category ON validation_rules((rule_definition->'metadata'->>'category'));
CREATE INDEX idx_validation_rules_severity ON validation_rules((rule_definition->>'severity'));

-- Indexes for VendorType and BuyingType filtering
CREATE INDEX idx_validation_rules_vendor_type ON validation_rules
    USING GIN ((rule_definition->'metadata'->'applicableTo'));
CREATE INDEX idx_validation_rules_buying_type ON validation_rules
    USING GIN ((rule_definition->'metadata'->'applicableToBuyingType'));

COMMENT ON TABLE validation_rules IS 'Dynamic validation rules with JSON definitions and version control';

-- ----------------------------------------------------------------------------
-- 7. VALIDATION RESULTS TABLE
-- Results of validation runs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to validated entity
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,
    spz VARCHAR(20),                                  -- For quick lookup by license plate
    vin VARCHAR(17),                                  -- For quick lookup by VIN

    -- Attempt tracking (history of all attempts)
    attempt_number INTEGER NOT NULL DEFAULT 1,

    -- Overall result
    overall_status VARCHAR(10) NOT NULL CHECK (overall_status IN ('GREEN', 'ORANGE', 'RED')),

    -- Detailed results (array of field validations)
    field_validations JSONB NOT NULL,

    -- Issues summary
    issues JSONB,

    -- Statistics
    total_rules_executed INTEGER NOT NULL DEFAULT 0,
    rules_passed INTEGER NOT NULL DEFAULT 0,
    rules_failed INTEGER NOT NULL DEFAULT 0,
    rules_skipped INTEGER NOT NULL DEFAULT 0,
    critical_issues INTEGER NOT NULL DEFAULT 0,
    warning_issues INTEGER NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Metadata
    validation_engine_version VARCHAR(20),
    rules_snapshot_hash VARCHAR(64),                  -- Hash of rules used (for reproducibility)

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_validation_results_bo_id ON validation_results(buying_opportunity_id);
CREATE INDEX idx_validation_results_spz ON validation_results(spz) WHERE spz IS NOT NULL;
CREATE INDEX idx_validation_results_vin ON validation_results(vin) WHERE vin IS NOT NULL;
CREATE INDEX idx_validation_results_status ON validation_results(overall_status);
CREATE INDEX idx_validation_results_created ON validation_results(created_at DESC);
CREATE INDEX idx_validation_history ON validation_results(buying_opportunity_id, attempt_number DESC);

COMMENT ON TABLE validation_results IS 'Results of validation runs with detailed field-level outcomes';

-- ----------------------------------------------------------------------------
-- 8. VALIDATION AUDIT LOG TABLE
-- Complete audit trail for all validation executions
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS validation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to result
    validation_result_id UUID REFERENCES validation_results(id),

    -- Who triggered
    triggered_by VARCHAR(100) NOT NULL,               -- User ID or system identifier
    triggered_at TIMESTAMPTZ DEFAULT NOW(),

    -- How it was triggered
    trigger_source VARCHAR(20) NOT NULL,              -- API, UI, BATCH, SCHEDULER, WEBHOOK

    -- Client information
    client_ip VARCHAR(45),                            -- IPv4 or IPv6
    user_agent TEXT,
    request_id UUID,                                  -- Correlation ID for tracing

    -- Input snapshot (for reproducibility)
    input_snapshot JSONB NOT NULL,                    -- Snapshot of all input data at validation time

    -- Performance metrics
    duration_ms INTEGER,
    external_calls_count INTEGER DEFAULT 0,           -- Number of external API calls (ARES, ADIS, etc.)
    cache_hits INTEGER DEFAULT 0,

    -- Error handling
    error_occurred BOOLEAN DEFAULT false,
    error_details JSONB,                              -- Error stack, message, etc.

    -- Metadata
    metadata JSONB                                    -- Additional context
);

-- Indexes
CREATE INDEX idx_audit_log_result_id ON validation_audit_log(validation_result_id);
CREATE INDEX idx_audit_log_triggered_by ON validation_audit_log(triggered_by);
CREATE INDEX idx_audit_log_triggered_at ON validation_audit_log(triggered_at DESC);
CREATE INDEX idx_audit_log_source ON validation_audit_log(trigger_source);

COMMENT ON TABLE validation_audit_log IS 'Audit trail for all validation executions with input snapshots';

-- ----------------------------------------------------------------------------
-- 9. RULE CHANGE HISTORY TABLE
-- Tracks all changes to validation rules
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rule_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Which rule changed
    rule_id UUID NOT NULL REFERENCES validation_rules(id),
    rule_code VARCHAR(20) NOT NULL,                   -- Human-readable rule ID for easy lookup

    -- What changed
    change_type VARCHAR(20) NOT NULL,                 -- CREATE, UPDATE, ACTIVATE, DEACTIVATE, DELETE

    -- Before/After snapshots
    old_definition JSONB,                             -- NULL for CREATE
    new_definition JSONB,                             -- NULL for DELETE

    -- Who and when
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Why (optional)
    change_reason TEXT,

    -- Additional context
    metadata JSONB,

    CONSTRAINT chk_change_type CHECK (change_type IN ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'DELETE'))
);

-- Indexes
CREATE INDEX idx_rule_history_rule_id ON rule_change_history(rule_id);
CREATE INDEX idx_rule_history_rule_code ON rule_change_history(rule_code);
CREATE INDEX idx_rule_history_changed_at ON rule_change_history(changed_at DESC);
CREATE INDEX idx_rule_history_change_type ON rule_change_history(change_type);

COMMENT ON TABLE rule_change_history IS 'Complete history of all rule changes for compliance and debugging';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get all active rules for validation
CREATE OR REPLACE FUNCTION get_active_validation_rules()
RETURNS TABLE (
    rule_id VARCHAR(20),
    rule_definition JSONB,
    version INTEGER,
    activated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vr.rule_id,
        vr.rule_definition,
        vr.version,
        vr.activated_at
    FROM validation_rules vr
    WHERE vr.is_active = true
    ORDER BY
        (vr.rule_definition->'metadata'->>'priority')::INTEGER NULLS LAST,
        vr.rule_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get active rules filtered by VendorType and BuyingType
CREATE OR REPLACE FUNCTION get_active_validation_rules_filtered(
    p_vendor_type VARCHAR(20) DEFAULT NULL,      -- PHYSICAL_PERSON, COMPANY
    p_buying_type VARCHAR(20) DEFAULT 'BRANCH'   -- BRANCH, MOBILE_BUYING
)
RETURNS TABLE (
    rule_id VARCHAR(20),
    rule_definition JSONB,
    version INTEGER,
    activated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vr.rule_id,
        vr.rule_definition,
        vr.version,
        vr.activated_at
    FROM validation_rules vr
    WHERE vr.is_active = true
      -- Filter by VendorType (if specified, rule must either have no restriction or include the type)
      AND (
          p_vendor_type IS NULL
          OR vr.rule_definition->'metadata'->'applicableTo' IS NULL
          OR vr.rule_definition->'metadata'->'applicableTo' @> to_jsonb(p_vendor_type)
      )
      -- Filter by BuyingType (rule must either have no restriction or include the type)
      AND (
          vr.rule_definition->'metadata'->'applicableToBuyingType' IS NULL
          OR vr.rule_definition->'metadata'->'applicableToBuyingType' @> to_jsonb(p_buying_type)
      )
    ORDER BY
        (vr.rule_definition->'metadata'->>'priority')::INTEGER NULLS LAST,
        vr.rule_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_validation_rules_filtered IS
    'Get active rules filtered by VendorType (FO/PO) and BuyingType (BRANCH/MOBILE_BUYING)';

-- Function to compute rules snapshot hash (for reproducibility)
CREATE OR REPLACE FUNCTION compute_rules_snapshot_hash()
RETURNS VARCHAR(64) AS $$
DECLARE
    rules_json JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'rule_id', rule_id,
            'version', version,
            'definition_hash', md5(rule_definition::text)
        )
        ORDER BY rule_id
    )
    INTO rules_json
    FROM validation_rules
    WHERE is_active = true;

    RETURN md5(COALESCE(rules_json::text, '[]'));
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to log rule changes automatically (trigger)
CREATE OR REPLACE FUNCTION log_rule_change()
RETURNS TRIGGER AS $$
DECLARE
    change_type_val VARCHAR(20);
BEGIN
    IF TG_OP = 'INSERT' THEN
        change_type_val := 'CREATE';
        INSERT INTO rule_change_history (rule_id, rule_code, change_type, new_definition, changed_by)
        VALUES (NEW.id, NEW.rule_id, change_type_val, NEW.rule_definition, COALESCE(NEW.created_by, 'system'));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine change type
        IF OLD.is_active = false AND NEW.is_active = true THEN
            change_type_val := 'ACTIVATE';
        ELSIF OLD.is_active = true AND NEW.is_active = false THEN
            change_type_val := 'DEACTIVATE';
        ELSE
            change_type_val := 'UPDATE';
        END IF;

        INSERT INTO rule_change_history (rule_id, rule_code, change_type, old_definition, new_definition, changed_by)
        VALUES (NEW.id, NEW.rule_id, change_type_val, OLD.rule_definition, NEW.rule_definition, COALESCE(NEW.updated_by, 'system'));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        change_type_val := 'DELETE';
        INSERT INTO rule_change_history (rule_id, rule_code, change_type, old_definition, changed_by)
        VALUES (OLD.id, OLD.rule_id, change_type_val, OLD.rule_definition, 'system');
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic change logging
DROP TRIGGER IF EXISTS tr_rule_change_log ON validation_rules;
CREATE TRIGGER tr_rule_change_log
    AFTER INSERT OR UPDATE OR DELETE ON validation_rules
    FOR EACH ROW EXECUTE FUNCTION log_rule_change();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for buying_opportunities updated_at
DROP TRIGGER IF EXISTS tr_buying_opportunities_updated ON buying_opportunities;
CREATE TRIGGER tr_buying_opportunities_updated
    BEFORE UPDATE ON buying_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ares_validations updated_at
DROP TRIGGER IF EXISTS tr_ares_validations_updated ON ares_validations;
CREATE TRIGGER tr_ares_validations_updated
    BEFORE UPDATE ON ares_validations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Supabase specific
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE buying_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ares_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_change_history ENABLE ROW LEVEL SECURITY;

-- Policies for buying_opportunities (read/write: authenticated)
CREATE POLICY "buying_opportunities_select" ON buying_opportunities
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "buying_opportunities_insert" ON buying_opportunities
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "buying_opportunities_update" ON buying_opportunities
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "buying_opportunities_delete" ON buying_opportunities
    FOR DELETE TO authenticated
    USING (true);

-- Policies for vehicles (read/write: authenticated)
CREATE POLICY "vehicles_select" ON vehicles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "vehicles_insert" ON vehicles
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "vehicles_update" ON vehicles
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "vehicles_delete" ON vehicles
    FOR DELETE TO authenticated
    USING (true);

-- Policies for vendors (read/write: authenticated)
CREATE POLICY "vendors_select" ON vendors
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "vendors_insert" ON vendors
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "vendors_update" ON vendors
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "vendors_delete" ON vendors
    FOR DELETE TO authenticated
    USING (true);

-- Policies for ocr_extractions (read/write: authenticated)
CREATE POLICY "ocr_extractions_select" ON ocr_extractions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "ocr_extractions_insert" ON ocr_extractions
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "ocr_extractions_update" ON ocr_extractions
    FOR UPDATE TO authenticated
    USING (true);

-- Policies for ares_validations (read/write: authenticated)
CREATE POLICY "ares_validations_select" ON ares_validations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "ares_validations_insert" ON ares_validations
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "ares_validations_update" ON ares_validations
    FOR UPDATE TO authenticated
    USING (true);

-- Policies for validation_rules (read: all authenticated, write: admin only)
CREATE POLICY "validation_rules_select" ON validation_rules
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "validation_rules_insert" ON validation_rules
    FOR INSERT TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "validation_rules_update" ON validation_rules
    FOR UPDATE TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "validation_rules_delete" ON validation_rules
    FOR DELETE TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Policies for validation_results (read: authenticated, write: service role)
CREATE POLICY "validation_results_select" ON validation_results
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "validation_results_insert" ON validation_results
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Policies for audit tables (read: admin only)
CREATE POLICY "audit_log_select" ON validation_audit_log
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "audit_log_insert" ON validation_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "rule_history_select" ON rule_change_history
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
