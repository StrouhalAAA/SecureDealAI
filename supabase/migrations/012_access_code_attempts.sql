-- Migration: 012_access_code_attempts.sql
-- Purpose: Track access code attempts for rate limiting
-- Phase: 5 - Access Code Authentication

-- Track access code attempts for rate limiting
CREATE TABLE IF NOT EXISTS access_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false,
  code_identifier TEXT  -- Hash identifier of code used (for audit, only on success)
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_access_code_attempts_ip_time
  ON access_code_attempts(ip_address, attempted_at DESC);

-- Auto-cleanup old attempts (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_access_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM access_code_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- RLS: Only service role can access this table
ALTER TABLE access_code_attempts ENABLE ROW LEVEL SECURITY;

-- No policies for anon or authenticated - only service role can access
COMMENT ON TABLE access_code_attempts IS 'Rate limiting for access code attempts. Only accessible via service role.';
