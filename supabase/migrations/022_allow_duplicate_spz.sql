-- ============================================================================
-- Migration: 022_allow_duplicate_spz.sql
-- Purpose: Allow multiple buying opportunities with the same SPZ and provide
--          historical lookup functionality for warning display
-- ============================================================================

-- Step 1: Drop the unique constraint
-- This allows the same vehicle (SPZ) to be processed multiple times
ALTER TABLE buying_opportunities DROP CONSTRAINT IF EXISTS buying_opportunities_spz_key;

-- Step 2: Add composite index for efficient history queries
-- The existing idx_buying_opportunities_spz handles basic lookups
-- This index optimizes ORDER BY created_at DESC queries
CREATE INDEX IF NOT EXISTS idx_buying_opportunities_spz_created
    ON buying_opportunities(spz, created_at DESC);

-- Step 3: Create history lookup function
CREATE OR REPLACE FUNCTION get_spz_history(p_spz VARCHAR(20))
RETURNS TABLE (
    total_count INTEGER,
    latest_id UUID,
    latest_status VARCHAR(20),
    latest_created_at TIMESTAMPTZ,
    validation_statuses JSONB,
    history JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH spz_records AS (
        SELECT
            bo.id,
            bo.spz,
            bo.status,
            bo.buying_type,
            bo.created_at,
            bo.updated_at,
            vr.overall_status AS validation_status
        FROM buying_opportunities bo
        LEFT JOIN LATERAL (
            SELECT overall_status
            FROM validation_results
            WHERE buying_opportunity_id = bo.id
            ORDER BY created_at DESC
            LIMIT 1
        ) vr ON true
        WHERE bo.spz = UPPER(TRIM(p_spz))
          AND bo.spz NOT LIKE 'TEMP-%'  -- Exclude placeholder records
        ORDER BY bo.created_at DESC
    )
    SELECT
        (SELECT COUNT(*)::INTEGER FROM spz_records),
        (SELECT id FROM spz_records LIMIT 1),
        (SELECT status FROM spz_records LIMIT 1),
        (SELECT created_at FROM spz_records LIMIT 1),
        (
            SELECT COALESCE(jsonb_object_agg(
                COALESCE(validation_status, 'NONE'),
                cnt
            ), '{}'::jsonb)
            FROM (
                SELECT validation_status, COUNT(*) AS cnt
                FROM spz_records
                GROUP BY validation_status
            ) counts
        ),
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'status', status,
                    'buying_type', buying_type,
                    'validation_status', validation_status,
                    'created_at', created_at
                )
            ), '[]'::jsonb)
            FROM (SELECT * FROM spz_records LIMIT 10) recent
        );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_spz_history IS
    'Returns historical data for a given SPZ including count, latest record, and validation summary. Used for warning display when duplicate SPZ is entered.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
