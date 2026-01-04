-- ============================================================================
-- SecureDealAI - Rename document_file_url to document_file_path
-- ============================================================================
-- Version: 1.0.0
-- Created: 2026-01-04
-- Purpose: Store file paths instead of URLs for better security
-- ============================================================================

-- Rename the column
ALTER TABLE ocr_extractions
RENAME COLUMN document_file_url TO document_file_path;

-- Add comment explaining the change
COMMENT ON COLUMN ocr_extractions.document_file_path IS
  'Storage path to document file (e.g., 5L94454/orv/1704367200000.pdf). URLs are generated on-demand using signed URLs for security.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
