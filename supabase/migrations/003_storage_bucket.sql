-- ============================================================================
-- SecureDealAI MVP - Storage Bucket Configuration
-- ============================================================================
-- Version: 1.0.0
-- Created: 2026-01-03
-- Purpose: Create storage bucket for document uploads (ORV, OP images/PDFs)
-- ============================================================================
--
-- BUCKET CONFIGURATION:
--   Name: documents
--   Public: No (private)
--   File Size Limit: 10 MB
--   Allowed MIME Types: image/jpeg, image/png, application/pdf
--
-- FOLDER STRUCTURE:
--   documents/{spz}/orv/{timestamp}_{filename}.pdf
--   documents/{spz}/op/{timestamp}_{filename}.pdf
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE STORAGE BUCKET
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    10485760,  -- 10 MB in bytes
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- ----------------------------------------------------------------------------
-- 2. RLS POLICIES FOR STORAGE OBJECTS
-- ----------------------------------------------------------------------------

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;

-- Allow authenticated users to upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read documents in the bucket
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow service role full access (for Edge Functions)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- ----------------------------------------------------------------------------
-- 3. VERIFICATION QUERY
-- ----------------------------------------------------------------------------
-- Run this query to verify bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'documents';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
