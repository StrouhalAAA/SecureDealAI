-- ============================================================================
-- ROLLBACK: Restore Anonymous RLS Policies
-- ============================================================================
-- Run this migration to revert to anonymous access if needed.
-- Usage: psql -f 013_authenticated_rls_policies_DOWN.sql
--
-- WARNING: This removes authentication requirements from database tables.
-- Only use this in emergency situations or if reverting to development mode.
-- ============================================================================

-- ============================================================================
-- BUYING_OPPORTUNITIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "buying_opportunities_auth_select" ON buying_opportunities;
DROP POLICY IF EXISTS "buying_opportunities_auth_insert" ON buying_opportunities;
DROP POLICY IF EXISTS "buying_opportunities_auth_update" ON buying_opportunities;
DROP POLICY IF EXISTS "buying_opportunities_auth_delete" ON buying_opportunities;

CREATE POLICY "buying_opportunities_anon_select" ON buying_opportunities
    FOR SELECT TO anon USING (true);

CREATE POLICY "buying_opportunities_anon_insert" ON buying_opportunities
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "buying_opportunities_anon_update" ON buying_opportunities
    FOR UPDATE TO anon USING (true);

CREATE POLICY "buying_opportunities_anon_delete" ON buying_opportunities
    FOR DELETE TO anon USING (true);

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "vehicles_auth_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_auth_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_auth_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_auth_delete" ON vehicles;

CREATE POLICY "vehicles_anon_select" ON vehicles
    FOR SELECT TO anon USING (true);

CREATE POLICY "vehicles_anon_insert" ON vehicles
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "vehicles_anon_update" ON vehicles
    FOR UPDATE TO anon USING (true);

CREATE POLICY "vehicles_anon_delete" ON vehicles
    FOR DELETE TO anon USING (true);

-- ============================================================================
-- VENDORS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "vendors_auth_select" ON vendors;
DROP POLICY IF EXISTS "vendors_auth_insert" ON vendors;
DROP POLICY IF EXISTS "vendors_auth_update" ON vendors;
DROP POLICY IF EXISTS "vendors_auth_delete" ON vendors;

CREATE POLICY "vendors_anon_select" ON vendors
    FOR SELECT TO anon USING (true);

CREATE POLICY "vendors_anon_insert" ON vendors
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "vendors_anon_update" ON vendors
    FOR UPDATE TO anon USING (true);

CREATE POLICY "vendors_anon_delete" ON vendors
    FOR DELETE TO anon USING (true);

-- ============================================================================
-- OCR_EXTRACTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "ocr_extractions_auth_select" ON ocr_extractions;
DROP POLICY IF EXISTS "ocr_extractions_auth_insert" ON ocr_extractions;
DROP POLICY IF EXISTS "ocr_extractions_auth_update" ON ocr_extractions;

CREATE POLICY "ocr_extractions_anon_select" ON ocr_extractions
    FOR SELECT TO anon USING (true);

CREATE POLICY "ocr_extractions_anon_insert" ON ocr_extractions
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "ocr_extractions_anon_update" ON ocr_extractions
    FOR UPDATE TO anon USING (true);

-- ============================================================================
-- ARES_VALIDATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "ares_validations_auth_select" ON ares_validations;
DROP POLICY IF EXISTS "ares_validations_auth_insert" ON ares_validations;
DROP POLICY IF EXISTS "ares_validations_auth_update" ON ares_validations;

CREATE POLICY "ares_validations_anon_select" ON ares_validations
    FOR SELECT TO anon USING (true);

CREATE POLICY "ares_validations_anon_insert" ON ares_validations
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "ares_validations_anon_update" ON ares_validations
    FOR UPDATE TO anon USING (true);

-- ============================================================================
-- VALIDATION_RULES TABLE (Read-only)
-- ============================================================================

DROP POLICY IF EXISTS "validation_rules_auth_select" ON validation_rules;

CREATE POLICY "validation_rules_anon_select" ON validation_rules
    FOR SELECT TO anon USING (true);

-- ============================================================================
-- VALIDATION_RESULTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "validation_results_auth_select" ON validation_results;
DROP POLICY IF EXISTS "validation_results_auth_insert" ON validation_results;

CREATE POLICY "validation_results_anon_select" ON validation_results
    FOR SELECT TO anon USING (true);

CREATE POLICY "validation_results_anon_insert" ON validation_results
    FOR INSERT TO anon WITH CHECK (true);

-- ============================================================================
-- VALIDATION_AUDIT_LOG TABLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'validation_audit_log') THEN
        DROP POLICY IF EXISTS "validation_audit_log_auth_select" ON validation_audit_log;
        EXECUTE 'CREATE POLICY "validation_audit_log_anon_select" ON validation_audit_log
            FOR SELECT TO anon USING (true)';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists, ignore
END
$$;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
