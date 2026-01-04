-- ============================================================================
-- SecureDealAI - Update existing document_file_path values
-- ============================================================================
-- Version: 1.0.0
-- Created: 2026-01-04
-- Purpose: Convert existing public URLs to file paths
-- ============================================================================

-- Update existing records that have public URLs to just file paths
-- URL format: https://{project}.supabase.co/storage/v1/object/public/documents/{path}
-- Target format: {path}

UPDATE ocr_extractions
SET document_file_path = regexp_replace(
  document_file_path,
  '^https://[^/]+/storage/v1/object/public/documents/',
  ''
)
WHERE document_file_path LIKE 'https://%/storage/v1/object/public/documents/%';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
