-- ============================================================================
-- SecureDealAI MVP - Dynamic Validation Rules Database Schema
-- ============================================================================
-- Version: 1.0.0
-- Created: 2026-01-01
-- Purpose: Database schema for dynamic validation rules management
-- Target: Supabase PostgreSQL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VALIDATION RULES TABLE
-- Stores validation rule definitions as JSON with versioning support
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

-- Comment
COMMENT ON TABLE validation_rules IS 'Dynamic validation rules with JSON definitions and version control';

-- ----------------------------------------------------------------------------
-- 2. VALIDATION RESULTS TABLE
-- Stores results of validation runs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to validated entity
    buying_opportunity_id UUID NOT NULL,              -- FK to buying_opportunities
    spz VARCHAR(20),                                  -- For quick lookup by license plate
    vin VARCHAR(17),                                  -- For quick lookup by VIN

    -- Overall result
    overall_status VARCHAR(10) NOT NULL,              -- GREEN, ORANGE, RED

    -- Detailed results (array of field validations)
    field_validations JSONB NOT NULL,

    -- Statistics
    total_rules_executed INTEGER NOT NULL DEFAULT 0,
    rules_passed INTEGER NOT NULL DEFAULT 0,
    rules_failed INTEGER NOT NULL DEFAULT 0,
    rules_skipped INTEGER NOT NULL DEFAULT 0,

    -- Issues summary
    critical_issues INTEGER NOT NULL DEFAULT 0,
    warning_issues INTEGER NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER GENERATED ALWAYS AS (
        EXTRACT(MILLISECONDS FROM (completed_at - started_at))::INTEGER
    ) STORED,

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

COMMENT ON TABLE validation_results IS 'Results of validation runs with detailed field-level outcomes';

-- ----------------------------------------------------------------------------
-- 3. VALIDATION AUDIT LOG TABLE
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
-- 4. RULE CHANGE HISTORY TABLE
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

-- ----------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) - Supabase specific
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_change_history ENABLE ROW LEVEL SECURITY;

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
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Policies for audit tables (read: admin only)
CREATE POLICY "audit_log_select" ON validation_audit_log
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "rule_history_select" ON rule_change_history
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- ----------------------------------------------------------------------------
-- 7. SAMPLE DATA - Initial rules (commented out, use migration script)
-- ----------------------------------------------------------------------------

/*
-- Example: Insert VEH-001 rule
INSERT INTO validation_rules (rule_id, rule_definition, is_active, is_draft, created_by)
VALUES (
    'VEH-001',
    '{
        "id": "VEH-001",
        "name": "VIN Match",
        "description": "VIN must match exactly between manual input and OCR from ORV",
        "enabled": true,
        "source": {
            "entity": "vehicle",
            "field": "vin",
            "transforms": ["REMOVE_SPACES", "UPPERCASE", "VIN_NORMALIZE"]
        },
        "target": {
            "entity": "ocr_orv",
            "field": "vin",
            "transforms": ["REMOVE_SPACES", "UPPERCASE", "VIN_NORMALIZE"]
        },
        "comparison": {
            "type": "EXACT",
            "caseSensitive": false
        },
        "severity": "CRITICAL",
        "blockOnFail": true,
        "errorMessage": {
            "cs": "VIN se neshoduje s technickým průkazem",
            "en": "VIN does not match the vehicle registration certificate"
        },
        "metadata": {
            "category": "vehicle",
            "phase": "mvp",
            "requiresDocument": "ORV",
            "priority": 1,
            "tags": ["critical", "vehicle-identity"]
        }
    }'::jsonb,
    false,
    true,
    'system'
);
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
