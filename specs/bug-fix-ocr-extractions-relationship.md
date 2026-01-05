# Bug: Missing Relationship Between buying_opportunities and ocr_extractions

## Bug Description
The validation-run Edge Function fails with the error:
```
Failed to load buying opportunity: Could not find a relationship between 'buying_opportunities' and 'ocr_extractions' in the schema cache
```

This occurs when calling the `/functions/v1/validation-run` endpoint with a valid `buying_opportunity_id`. The function attempts to join `ocr_extractions` in a Supabase query, but no foreign key relationship exists between these tables.

**Expected Behavior**: Validation should load all related data (vehicle, vendor, OCR extractions) and execute validation rules.

**Actual Behavior**: API returns 500 error due to missing relationship.

## Problem Statement
The `ocr_extractions` table was designed with the ACBS pattern (linking by SPZ string) instead of a direct foreign key to `buying_opportunities`. However, the `loadValidationData` function in `index.ts` uses Supabase's join syntax (`ocr_extractions (*)`) which requires a foreign key relationship in the PostgREST schema cache.

## Solution Statement
Modify the `loadValidationData` function to query `ocr_extractions` separately using the SPZ value from the buying opportunity, matching the actual database design pattern (ACBS linking by SPZ).

## Steps to Reproduce
1. Ensure a buying opportunity exists with ID `505d8171-ebb1-4034-b3dd-89bda16d3bc2`
2. Call the validation-run endpoint:
```bash
curl 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/validation-run' \
  -H 'authorization: Bearer <anon_key>' \
  -H 'content-type: application/json' \
  --data-raw '{"buying_opportunity_id":"505d8171-ebb1-4034-b3dd-89bda16d3bc2"}'
```
3. Observe error response with code `INTERNAL_ERROR`

## Root Cause Analysis
1. **Database Design**: `ocr_extractions` uses `spz VARCHAR(20)` as the linking column (ACBS pattern - linking by business key, not FK). This is documented in the schema: "OCR processing results (SPZ-linked - ACBS pattern)"

2. **Code Assumption**: The `loadValidationData` function assumes a foreign key exists:
```typescript
const { data: opportunity, error: oppError } = await supabase
  .from('buying_opportunities')
  .select(`
    id,
    spz,
    vin,
    vehicles (*),
    vendors (*),
    ocr_extractions (*)  // <-- This requires FK relationship
  `)
```

3. **PostgREST Limitation**: Supabase's PostgREST layer requires actual foreign key constraints to resolve the join syntax. Without a FK, it cannot determine how to link the tables.

## Issues Identified

### Issue 1: OCR Extractions Query Fails
- **Error Pattern**: `Could not find a relationship between 'buying_opportunities' and 'ocr_extractions' in the schema cache`
- **Category**: Backend
- **Affected Files**: `supabase/functions/validation-run/index.ts`
- **Root Cause**: Attempting to use PostgREST join syntax on tables without FK relationship
- **Fix Approach**: Query `ocr_extractions` separately by SPZ after loading buying opportunity

## Relevant Files
Use these files to fix the bug:

- `supabase/functions/validation-run/index.ts` - Main Edge Function entry point containing the `loadValidationData` function that needs to be fixed. Lines 71-142 contain the data loading logic.
- `supabase/migrations/001_initial_schema.sql` - Database schema showing that `ocr_extractions` table uses SPZ linking (lines 140-164), not a foreign key to `buying_opportunities`.

### New Files
None required - this is a fix to existing code.

## Step by Step Tasks

### 1. Review Current Data Loading Logic
- Read the `loadValidationData` function in `supabase/functions/validation-run/index.ts`
- Confirm the issue is on lines 78-89 where the query attempts to join `ocr_extractions`

### 2. Modify loadValidationData Function
- Remove `ocr_extractions (*)` from the main buying_opportunities query
- After loading the buying opportunity, execute a separate query to fetch OCR extractions by SPZ
- Query: `supabase.from('ocr_extractions').select('*').eq('spz', opportunity.spz)`

### 3. Update OCR Data Extraction Logic
- Ensure the separate OCR query results are correctly assigned to the `ocrExtractions` variable
- Maintain the existing logic for parsing OCR extractions by document type (ORV, OP, VTP)

### 4. Test the Fix Locally
- Start local Supabase: `supabase start`
- Serve the Edge Function: `supabase functions serve validation-run --env-file supabase/.env.local`
- Test with a sample request to verify the fix works

### 5. Run Validation Commands
- Execute all validation commands listed below to ensure no regressions

## Database Changes
No database schema changes required. The fix adapts the application code to match the existing database design (ACBS pattern).

## Testing Strategy

### Regression Tests
- Test validation with a buying opportunity that has OCR extractions
- Test validation with a buying opportunity without OCR extractions (should handle gracefully)
- Test validation with multiple OCR document types (ORV, OP, VTP)

### Edge Cases
- Buying opportunity with no SPZ (edge case - may need null check)
- OCR extractions with matching SPZ but different document types
- Multiple OCR extractions for the same SPZ and document type (should get latest)

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Notes
- The ACBS pattern (linking by SPZ) was an intentional design decision documented in the schema
- This same pattern may affect other parts of the codebase if they assume FK relationships
- Consider adding a code comment explaining why OCR extractions are queried separately
- The fix maintains the same end result (ValidationInputData structure) but with two queries instead of one
