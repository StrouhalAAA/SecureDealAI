# Task 5.3: Update RLS Policies for Authentication

> **Phase**: 5 - Access Code Authentication
> **Status**: [ ] Pending
> **Priority**: Critical
> **Depends On**: 5.2 (JWT Verification Enabled)
> **Estimated Effort**: 1 hour

---

## Objective

Update Row Level Security (RLS) policies to require `authenticated` role instead of allowing `anon` access. This ensures database-level security even if Edge Function protection is bypassed.

---

## Prerequisites

- [ ] Task 5.2 completed (JWT verification enabled for Edge Functions)
- [ ] Valid JWT tokens work with Edge Functions

---

## Architecture Reference

See: [05_00_ACCESS_CODE_ARCHITECTURE.md](./05_00_ACCESS_CODE_ARCHITECTURE.md)

---

## Current State

File: `supabase/migrations/004_anon_rls_policies.sql`

All tables currently allow anonymous access:

```sql
CREATE POLICY "buying_opportunities_anon_select" ON buying_opportunities
    FOR SELECT TO anon USING (true);
-- ... etc
```

---

## Implementation Steps

### Step 1: Create Migration File

Create file: `supabase/migrations/013_authenticated_rls_policies.sql`

```sql
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

CREATE POLICY "validation_audit_log_auth_select" ON validation_audit_log
    FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- STORAGE POLICIES (for documents bucket)
-- ============================================================================

-- Update storage policies to require authentication
-- Note: Storage policies are managed differently - via storage.objects table

-- Drop existing storage policies for documents bucket
DROP POLICY IF EXISTS "documents_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to documents" ON storage.objects;

-- Create authenticated storage policies
CREATE POLICY "documents_auth_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents');

CREATE POLICY "documents_auth_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_auth_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'documents');

CREATE POLICY "documents_auth_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'documents');

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
```

### Step 2: Create Rollback Migration (Optional but Recommended)

Create file: `supabase/migrations/013_authenticated_rls_policies_DOWN.sql`

```sql
-- ============================================================================
-- ROLLBACK: Restore Anonymous RLS Policies
-- ============================================================================
-- Run this migration to revert to anonymous access if needed.
-- Usage: psql -f 013_authenticated_rls_policies_DOWN.sql
-- ============================================================================

-- Drop authenticated policies and restore anonymous ones
-- (This is essentially the content of 004_anon_rls_policies.sql)

-- BUYING_OPPORTUNITIES
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

-- ... repeat for other tables (copy from 004_anon_rls_policies.sql)
```

### Step 3: Apply Migration

```bash
# Apply the migration
supabase db push

# Or for remote:
supabase db push --linked
```

### Step 4: Verify Policies

```bash
# Connect to database and check policies
supabase db shell

# In psql:
\dp buying_opportunities
\dp vehicles
\dp vendors

# Or query directly:
SELECT tablename, policyname, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Test Cases

### Test Anonymous Access is Blocked

```bash
# Using anon key (should fail with RLS)
curl -s "https://[project].supabase.co/rest/v1/buying_opportunities" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"

# Expected: Empty array [] or RLS error (not full data)
```

### Test Authenticated Access Works

```bash
# Get JWT token
TOKEN=$(curl -s -X POST "https://[project].supabase.co/functions/v1/verify-access-code" \
  -H "Content-Type: application/json" \
  -d '{"code": "your-code"}' | jq -r '.token')

# Use JWT token (should return data)
curl -s "https://[project].supabase.co/rest/v1/buying_opportunities" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: Array with actual data
```

### Test Storage Access

```bash
# Without auth (should fail)
curl -s "https://[project].supabase.co/storage/v1/object/documents/test.pdf" \
  -H "apikey: $SUPABASE_ANON_KEY"

# With auth (should work if file exists)
curl -s "https://[project].supabase.co/storage/v1/object/documents/test.pdf" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Validation Criteria

- [ ] Migration file created at `supabase/migrations/013_authenticated_rls_policies.sql`
- [ ] All `anon` policies dropped
- [ ] All `authenticated` policies created
- [ ] Storage bucket policies updated
- [ ] Anonymous REST API access returns empty/error
- [ ] Authenticated REST API access returns data
- [ ] Edge Functions still work (they use service role)

---

## Completion Checklist

- [ ] Migration file created
- [ ] Migration applied successfully
- [ ] Anonymous access blocked (verified)
- [ ] Authenticated access works (verified)
- [ ] Storage policies updated
- [ ] Rollback script prepared
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`

---

## Troubleshooting

### "permission denied for table" error

1. Check the JWT has `role: "authenticated"`
2. Verify policies exist: `\dp tablename` in psql
3. Ensure RLS is enabled: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`

### Edge Functions stopped working

Edge Functions using `SUPABASE_SERVICE_ROLE_KEY` bypass RLS. If they stopped working:
1. Check the function is using service role key, not anon key
2. Verify the service role key is correct in secrets

### Cannot revert changes

Run the rollback SQL manually:
```bash
supabase db shell < supabase/migrations/013_authenticated_rls_policies_DOWN.sql
```

---

## Security Notes

1. **Service Role Bypass**: Edge Functions using service role key bypass RLS entirely. This is intentional - the JWT verification at the Edge Function layer is the primary security gate.

2. **Defense in Depth**: RLS provides a second layer of protection. Even if someone bypasses Edge Functions (e.g., uses anon key directly with REST API), they still can't access data.

3. **Storage Bucket**: The `documents` bucket is now protected. Only authenticated users can read/write files.
