-- ============================================================================
-- Migration: Replace Anonymous RLS Policies with Authenticated Policies
-- ============================================================================
-- This migration removes the open anonymous access and requires authentication.
-- The verify-access-code Edge Function issues JWTs with role='authenticated'.
-- ============================================================================

-- ============================================================================
-- BUYING_OPPORTUNITIES TABLE
-- ============================================================================

-- Drop anonymous policies
DROP POLICY IF EXISTS "buying_opportunities_anon_select" ON buying_opportunities;
DROP POLICY IF EXISTS "buying_opportunities_anon_insert" ON buying_opportunities;
DROP POLICY IF EXISTS "buying_opportunities_anon_update" ON buying_opportunities;
DROP POLICY IF EXISTS "buying_opportunities_anon_delete" ON buying_opportunities;

-- Create authenticated policies
CREATE POLICY "buying_opportunities_auth_select" ON buying_opportunities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "buying_opportunities_auth_insert" ON buying_opportunities
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "buying_opportunities_auth_update" ON buying_opportunities
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "buying_opportunities_auth_delete" ON buying_opportunities
    FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "vehicles_anon_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_anon_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_anon_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_anon_delete" ON vehicles;

CREATE POLICY "vehicles_auth_select" ON vehicles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "vehicles_auth_insert" ON vehicles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "vehicles_auth_update" ON vehicles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "vehicles_auth_delete" ON vehicles
    FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- VENDORS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "vendors_anon_select" ON vendors;
DROP POLICY IF EXISTS "vendors_anon_insert" ON vendors;
DROP POLICY IF EXISTS "vendors_anon_update" ON vendors;
DROP POLICY IF EXISTS "vendors_anon_delete" ON vendors;

CREATE POLICY "vendors_auth_select" ON vendors
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "vendors_auth_insert" ON vendors
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "vendors_auth_update" ON vendors
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "vendors_auth_delete" ON vendors
    FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- OCR_EXTRACTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "ocr_extractions_anon_select" ON ocr_extractions;
DROP POLICY IF EXISTS "ocr_extractions_anon_insert" ON ocr_extractions;
DROP POLICY IF EXISTS "ocr_extractions_anon_update" ON ocr_extractions;

CREATE POLICY "ocr_extractions_auth_select" ON ocr_extractions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ocr_extractions_auth_insert" ON ocr_extractions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ocr_extractions_auth_update" ON ocr_extractions
    FOR UPDATE TO authenticated USING (true);

-- ============================================================================
-- ARES_VALIDATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "ares_validations_anon_select" ON ares_validations;
DROP POLICY IF EXISTS "ares_validations_anon_insert" ON ares_validations;
DROP POLICY IF EXISTS "ares_validations_anon_update" ON ares_validations;

CREATE POLICY "ares_validations_auth_select" ON ares_validations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ares_validations_auth_insert" ON ares_validations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ares_validations_auth_update" ON ares_validations
    FOR UPDATE TO authenticated USING (true);

-- ============================================================================
-- VALIDATION_RULES TABLE (Read-only for authenticated users)
-- ============================================================================

DROP POLICY IF EXISTS "validation_rules_anon_select" ON validation_rules;

CREATE POLICY "validation_rules_auth_select" ON validation_rules
    FOR SELECT TO authenticated USING (true);

-- Note: No INSERT/UPDATE/DELETE for authenticated - rules managed by service role

-- ============================================================================
-- VALIDATION_RESULTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "validation_results_anon_select" ON validation_results;
DROP POLICY IF EXISTS "validation_results_anon_insert" ON validation_results;

CREATE POLICY "validation_results_auth_select" ON validation_results
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "validation_results_auth_insert" ON validation_results
    FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- VALIDATION_AUDIT_LOG TABLE (Read-only for authenticated)
-- ============================================================================

-- Check if table exists and has anon policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'validation_audit_log' AND policyname LIKE '%anon%') THEN
        DROP POLICY IF EXISTS "validation_audit_log_anon_select" ON validation_audit_log;
    END IF;
END
$$;

-- Create authenticated policy only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'validation_audit_log') THEN
        EXECUTE 'CREATE POLICY "validation_audit_log_auth_select" ON validation_audit_log
            FOR SELECT TO authenticated USING (true)';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists, ignore
END
$$;

-- ============================================================================
-- ACCESS_CODE_ATTEMPTS TABLE (already requires service_role, no changes needed)
-- ============================================================================
-- Note: access_code_attempts table (from migration 012) already has service_role
-- policies and no anon access, so no changes are required.

-- ============================================================================
-- STORAGE POLICIES (for documents bucket)
-- ============================================================================
-- Note: Storage bucket policies in 003_storage_bucket.sql already require
-- 'authenticated' role, not 'anon'. The existing policies are:
--   - "Users can upload documents" (INSERT, authenticated)
--   - "Users can read own documents" (SELECT, authenticated)
--   - "Service role full access" (ALL, service_role)
-- No changes needed for storage.

-- ============================================================================
-- SERVICE ROLE ACCESS (Edge Functions)
-- ============================================================================
-- Note: Edge Functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS entirely.
-- This is intentional - service role is for server-side operations.
-- The JWT verification at the Edge Function layer is the primary gate.

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "buying_opportunities_auth_select" ON buying_opportunities IS
    'Allow authenticated users to read buying opportunities';

COMMENT ON POLICY "vehicles_auth_select" ON vehicles IS
    'Allow authenticated users to read vehicles';

COMMENT ON POLICY "vendors_auth_select" ON vendors IS
    'Allow authenticated users to read vendors';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
