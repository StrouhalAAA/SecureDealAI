-- ============================================================================
-- SecureDealAI MVP - Anonymous RLS Policies
-- ============================================================================
-- Purpose: Allow anonymous (unauthenticated) access for MVP development
-- WARNING: This is for development only. Implement proper auth for production.
-- ============================================================================

-- Policies for buying_opportunities (anon access)
CREATE POLICY "buying_opportunities_anon_select" ON buying_opportunities
    FOR SELECT TO anon USING (true);

CREATE POLICY "buying_opportunities_anon_insert" ON buying_opportunities
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "buying_opportunities_anon_update" ON buying_opportunities
    FOR UPDATE TO anon USING (true);

CREATE POLICY "buying_opportunities_anon_delete" ON buying_opportunities
    FOR DELETE TO anon USING (true);

-- Policies for vehicles (anon access)
CREATE POLICY "vehicles_anon_select" ON vehicles
    FOR SELECT TO anon USING (true);

CREATE POLICY "vehicles_anon_insert" ON vehicles
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "vehicles_anon_update" ON vehicles
    FOR UPDATE TO anon USING (true);

CREATE POLICY "vehicles_anon_delete" ON vehicles
    FOR DELETE TO anon USING (true);

-- Policies for vendors (anon access)
CREATE POLICY "vendors_anon_select" ON vendors
    FOR SELECT TO anon USING (true);

CREATE POLICY "vendors_anon_insert" ON vendors
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "vendors_anon_update" ON vendors
    FOR UPDATE TO anon USING (true);

CREATE POLICY "vendors_anon_delete" ON vendors
    FOR DELETE TO anon USING (true);

-- Policies for ocr_extractions (anon access)
CREATE POLICY "ocr_extractions_anon_select" ON ocr_extractions
    FOR SELECT TO anon USING (true);

CREATE POLICY "ocr_extractions_anon_insert" ON ocr_extractions
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "ocr_extractions_anon_update" ON ocr_extractions
    FOR UPDATE TO anon USING (true);

-- Policies for ares_validations (anon access)
CREATE POLICY "ares_validations_anon_select" ON ares_validations
    FOR SELECT TO anon USING (true);

CREATE POLICY "ares_validations_anon_insert" ON ares_validations
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "ares_validations_anon_update" ON ares_validations
    FOR UPDATE TO anon USING (true);

-- Policies for validation_rules (anon read only)
CREATE POLICY "validation_rules_anon_select" ON validation_rules
    FOR SELECT TO anon USING (true);

-- Policies for validation_results (anon access)
CREATE POLICY "validation_results_anon_select" ON validation_results
    FOR SELECT TO anon USING (true);

CREATE POLICY "validation_results_anon_insert" ON validation_results
    FOR INSERT TO anon WITH CHECK (true);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
