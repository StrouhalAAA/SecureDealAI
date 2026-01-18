# Bug: kategorie_vozidla VARCHAR(10) Overflow

## Bug Description
When creating a new buying opportunity by uploading an ORV document, the vehicle insert fails with PostgreSQL error `22001: "value too long for type character varying(10)"`. This occurs because the OCR-extracted `vehicleType` field (e.g., "OSOBNÍ AUTOMOBIL" - 16 characters) exceeds the `kategorie_vozidla VARCHAR(10)` column limit in the database.

## Problem Statement
The `kategorie_vozidla` database column is sized too small (`VARCHAR(10)`) to store typical Czech vehicle type descriptions that the OCR extracts. Standard values like "OSOBNÍ AUTOMOBIL", "NÁKLADNÍ AUTOMOBIL", or "MOTOCYKL" can range from 8-18+ characters.

## Solution Statement
Increase the `kategorie_vozidla` column size from `VARCHAR(10)` to `VARCHAR(50)` via a database migration. This aligns with other text columns in the same migration (e.g., `barva VARCHAR(50)`, `karoserie VARCHAR(50)`) and accommodates all standard Czech vehicle type descriptions.

## Steps to Reproduce
1. Navigate to `http://localhost:5173`
2. Click "+ Nová příležitost" button
3. Select "Nahrát ORV" option
4. Enter a valid SPZ (e.g., "TEST123")
5. Upload an ORV document image containing a vehicle type field
6. Wait for OCR extraction to complete
7. Click "Vytvořit příležitost"
8. **Result**: Error `22001: "value too long for type character varying(10)"` in console

## Root Cause Analysis
The migration `014_vehicle_schema_extension.sql` at line 46 defines:
```sql
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS kategorie_vozidla VARCHAR(10);
```

The VARCHAR(10) limit was chosen based on short category codes (like "M1", "N1", "L"), but the OCR schema (`orv-schema.ts` line 74) documents that `vehicleType` contains full Czech descriptions:
```typescript
vehicleType: {
  type: "string",
  description: "J. DRUH VOZIDLA - Vehicle type (e.g., 'OSOBNÍ AUTOMOBIL')"
}
```

The `CreateOpportunityWizard.vue` maps this directly to the database at line 388:
```typescript
kategorie_vozidla: (ocrData.vehicleType as string) || null,
```

## Issues Identified

### Issue 1: kategorie_vozidla VARCHAR(10) Too Small
- **Error Pattern**: `PostgreSQL error 22001: "value too long for type character varying(10)"`
- **Category**: Database
- **Affected Files**:
  - `supabase/migrations/014_vehicle_schema_extension.sql`
  - `apps/web/src/components/shared/CreateOpportunityWizard.vue`
- **Root Cause**: Column size insufficient for OCR-extracted vehicle type values
- **Fix Approach**: Create migration to alter column type to `VARCHAR(50)`

### Issue 2: HTTP 406 Errors (Secondary - Not Root Cause)
- **Error Pattern**: `Failed to load resource: the server responded with a status of 406`
- **Category**: Network/API
- **Affected Files**: Supabase REST API calls
- **Root Cause**: These are likely RLS policy or query issues on Supabase, but they are cascading errors that occur after the main insert fails, not the primary bug
- **Fix Approach**: Will likely resolve automatically once the primary issue is fixed; monitor after fix

## Relevant Files
Use these files to fix the bug:

### Files to Modify
- **`supabase/migrations/014_vehicle_schema_extension.sql`** - Contains the original column definition; need to understand the context
- **New migration file** - Will create `017_fix_kategorie_vozidla_varchar.sql` to alter the column

### Files for Context
- **`apps/web/src/components/shared/CreateOpportunityWizard.vue`** (line 388) - Where the vehicle insert occurs
- **`supabase/functions/ocr-extract/schemas/orv-schema.ts`** (line 74) - Documents expected vehicleType values
- **`docs/architecture/FIELD_NAMING_CONVENTIONS.md`** - Documents the OCR→DB field mapping

### New Files
- `supabase/migrations/017_fix_kategorie_vozidla_varchar.sql` - Migration to fix the column size

## Step by Step Tasks

### Step 1: Verify the Database Column Definition
- Read `supabase/migrations/014_vehicle_schema_extension.sql` to confirm the current column definition
- Confirm `kategorie_vozidla VARCHAR(10)` is the problematic constraint

### Step 2: Check for Other Potentially Small VARCHAR Columns
- Review all VARCHAR columns added in the vehicle schema extension
- Identify any other columns that might have similar issues
- Specifically check: `palivo VARCHAR(20)` - may also be too small for some fuel descriptions

### Step 3: Create Migration to Fix Column Size
- Create `supabase/migrations/017_fix_kategorie_vozidla_varchar.sql`
- Use `ALTER TABLE vehicles ALTER COLUMN kategorie_vozidla TYPE VARCHAR(50)`
- This is a safe, non-destructive operation for expanding VARCHAR size

### Step 4: Apply Migration Locally
- Run `supabase db push` to apply the migration to the local database
- Verify the column type change with a query or schema inspection

### Step 5: Test the Fix
- Navigate to the app at `http://localhost:5173`
- Create a new opportunity with ORV upload
- Verify the vehicle insert succeeds without the varchar overflow error

### Step 6: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes

### Migration: 017_fix_kategorie_vozidla_varchar.sql
```sql
-- ============================================================================
-- Migration 017: Fix kategorie_vozidla VARCHAR Size
-- ============================================================================
-- Purpose: Increase kategorie_vozidla column size to accommodate OCR-extracted
--          Czech vehicle type descriptions (e.g., "OSOBNÍ AUTOMOBIL")
-- Created: 2026-01-18
-- Bug Reference: PostgreSQL error 22001 on vehicle insert
-- ============================================================================

-- Increase column size from VARCHAR(10) to VARCHAR(50)
-- This matches other similar text columns in the vehicles table
ALTER TABLE vehicles ALTER COLUMN kategorie_vozidla TYPE VARCHAR(50);

COMMENT ON COLUMN vehicles.kategorie_vozidla IS 'Vehicle category/type (Czech description). Source: ORV/VTP OCR field "vehicleType". Example values: OSOBNÍ AUTOMOBIL, NÁKLADNÍ AUTOMOBIL, MOTOCYKL';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
```

## Testing Strategy

### Regression Tests
1. **OCR Upload Flow**: Create new opportunity via ORV upload with vehicle containing `vehicleType` > 10 chars
2. **Manual Entry Flow**: Create new opportunity via manual entry (should still work)
3. **Existing Data**: Query existing vehicles to ensure no data corruption
4. **Edit Flow**: Open existing opportunity and verify vehicle data displays correctly

### Edge Cases
1. `vehicleType` is null/undefined - should insert NULL
2. `vehicleType` is empty string - should insert empty string or NULL
3. `vehicleType` is very long (>50 chars) - document if this is possible
4. Mixed-case vehicle types (OCR might return different cases)

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase db push` - Apply the migration
- `cd apps/web && npm run build` - Build frontend (verify no TypeScript errors)

## Notes
- The `VARCHAR(10)` size was likely chosen assuming short category codes (M1, N1, L, etc.) but Czech vehicle documents contain full descriptions
- Consider a follow-up ticket to review all VARCHAR column sizes in the vehicle schema extension
- The `palivo VARCHAR(20)` might also need review if OCR returns long fuel type descriptions
- The 406 HTTP errors in the console are secondary issues likely caused by cascading failures after the main insert error
