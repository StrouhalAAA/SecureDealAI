# Bug: Keeper Name Includes ICO in Owner/Operator Field

## Bug Description
When a user uploads an ORV (vehicle registration document), the "Majitel / Provozovatel" (Owner/Operator) field displays the company name concatenated with the ICO (company ID). For example, instead of showing "EFFERODA CONSULTING S.R.O.", it displays "EFFERODA CONSULTING S.R.O./08852316".

**Expected behavior**: The owner/operator name field should display only the name portion: "EFFERODA CONSULTING S.R.O."

**Actual behavior**: The field displays the full raw OCR text including the ICO: "EFFERODA CONSULTING S.R.O./08852316"

## Problem Statement
The `keeperName` field from OCR extraction contains the raw text in format "NAME/IDENTIFIER" (e.g., "EFFERODA CONSULTING S.R.O./08852316"). The frontend uses this raw value directly without parsing out the name portion, causing the ICO to appear in user-facing name fields.

## Solution Statement
The transformer already correctly parses the keeper name internally but doesn't expose the parsed name in the output. The fix adds a new `keeperParsedName` field to the ORV extraction result that contains only the name portion without the identifier. The frontend will then use this parsed name field instead of the raw `keeperName`.

## Steps to Reproduce
1. Navigate to create opportunity page
2. Upload an ORV document with a company keeper (e.g., "EFFERODA CONSULTING S.R.O./08852316")
3. Observe the "Majitel / Provozovatel" field in the created opportunity
4. See that the field shows "EFFERODA CONSULTING S.R.O./08852316" instead of "EFFERODA CONSULTING S.R.O."

**Test case URL**: http://localhost:5173/opportunity/9326dec2-84ba-470c-92c4-045d0abda50d

## Root Cause Analysis
The OCR extraction correctly identifies the format "NAME/IDENTIFIER" and parses it in `extractVendorDataFromORV()` to extract `keeperVendorType`, `keeperPersonalId`, and `keeperCompanyId`. However, the parsed name is not stored in the output - only the raw `keeperName` is included.

The frontend's `CreateOpportunityWizard.vue` then uses this raw `keeperName` directly when:
1. Setting the `majitel` field in the vehicles table (line 379)
2. Setting the `name` field in the vendors table (line 410)

The existing `vendor-parser.ts` module has a `parseKeeperNameIdentifier()` function that correctly handles this parsing, but it's not being used in the frontend flow.

## Issues Identified

### Issue 1: Transformer doesn't output parsed keeper name
- **Error Pattern**: N/A - logic error, no runtime error
- **Category**: Backend
- **Affected Files**:
  - `supabase/functions/ocr-extract/transformer.ts` (line 270)
  - `supabase/functions/ocr-extract/schemas/orv-schema.ts` (line 106)
- **Root Cause**: The `extractVendorDataFromORV()` function parses the name internally but doesn't include the parsed name in its return value. The transformer stores the raw `keeperName` at line 270.
- **Fix Approach**: Add `keeperParsedName` field to return value and type definition

### Issue 2: Frontend uses raw keeperName for vendor name
- **Error Pattern**: N/A - logic error, no runtime error
- **Category**: Frontend
- **Affected Files**:
  - `apps/web/src/components/shared/CreateOpportunityWizard.vue` (lines 379, 410)
  - `apps/web/src/composables/useDetailData.ts` (line 237)
- **Root Cause**: Frontend code uses `keeperName` directly without checking for `keeperParsedName`
- **Fix Approach**: Update frontend to use `keeperParsedName` with fallback to `keeperName`

## Relevant Files
Use these files to fix the bug:

### Backend (Transformer & Types)
- `supabase/functions/ocr-extract/schemas/orv-schema.ts` - Type definition for `ORVExtractionResult`, needs new `keeperParsedName` field
- `supabase/functions/ocr-extract/transformer.ts` - Lines 200-270, `extractVendorDataFromORV()` and `transformORVData()` functions need to return parsed name
- `supabase/functions/ocr-extract/vendor-parser.ts` - Reference for `parseKeeperNameIdentifier()` function already exists

### Frontend (Usage of keeperName)
- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - Lines 379, 398-410, uses `keeperName` for vendor creation
- `apps/web/src/composables/useDetailData.ts` - Line 237, uses `keeperName` for vendor OCR data display

### Tests
- `supabase/functions/tests/vendor-parser.test.ts` - Existing tests for vendor parsing, can verify fix

### New Files
None required - existing files will be modified.

## Step by Step Tasks

### Step 1: Update ORV extraction result type
- Add `keeperParsedName?: string;` field to `ORVExtractionResult` type in `supabase/functions/ocr-extract/schemas/orv-schema.ts`
- Place it after `keeperName` field for logical grouping

### Step 2: Modify extractVendorDataFromORV to return parsed name
- Update the return type of `extractVendorDataFromORV()` in `supabase/functions/ocr-extract/transformer.ts` to include `keeperParsedName`
- Return the parsed `name` variable that's already computed at line 218

### Step 3: Store keeperParsedName in transformORVData output
- Update `transformORVData()` in `supabase/functions/ocr-extract/transformer.ts` to include `keeperParsedName` in the return object
- Use the value from `vendorData.keeperParsedName`

### Step 4: Update CreateOpportunityWizard to use parsed name
- In `apps/web/src/components/shared/CreateOpportunityWizard.vue`:
  - Line 379: Use `keeperParsedName || keeperName` for `majitel` field
  - Line 410: Use `keeperParsedName || keeperName` for vendor `name` field
- Extract `keeperParsedName` from ocrData alongside existing fields

### Step 5: Update useDetailData to use parsed name
- In `apps/web/src/composables/useDetailData.ts` line 237:
  - Update to use `orvData?.keeperParsedName || orvData?.keeperName` for the vendor name

### Step 6: Run tests to verify fix
- Run existing vendor-parser tests to ensure parsing still works
- Build frontend to verify no TypeScript errors
- Test locally with ORV upload to verify ICO no longer appears in name

### Step 7: Execute Validation Commands
- Run all validation commands listed below

## Database Changes
No database schema changes required. The fix is contained within the OCR extraction logic and frontend display code. Existing data in the database is not affected (the raw `keeperName` in `ocr_extractions` table remains unchanged, only the display and vendor creation logic changes).

## Testing Strategy

### Regression Tests
1. Upload ORV with company keeper (NAME/ICO format) - verify only name appears
2. Upload ORV with personal keeper (NAME/RC format) - verify only name appears
3. Upload ORV with no identifier (NAME only) - verify name appears correctly
4. Verify existing vendor type detection still works correctly
5. Verify ICO is still correctly stored in `company_id` field

### Edge Cases
- ORV with company name containing "/" character (e.g., "A/S COMPANY")
- ORV with malformed identifier (wrong digit count)
- ORV with missing keeperName field
- ORV with only identifier, no name portion

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/jakubstrouhal/Documents/SecureDealAI && npm run test:db` - Test Supabase connection
- `cd /Users/jakubstrouhal/Documents/SecureDealAI/supabase/functions && deno test tests/vendor-parser.test.ts` - Run vendor parser tests
- `cd /Users/jakubstrouhal/Documents/SecureDealAI/apps/web && npm run build` - Build frontend to check for TypeScript errors

## Notes
- The `vendor-parser.ts` module already has comprehensive parsing logic including `parseKeeperNameIdentifier()` and `extractVendorDataFromKeeper()` functions. The fix leverages this existing code rather than duplicating logic.
- The `keeperName` field in the OCR output is intentionally kept as-is for audit/debugging purposes. The new `keeperParsedName` field provides the clean name for display and storage.
- This fix ensures backwards compatibility - if `keeperParsedName` is not available (old OCR data), the code falls back to `keeperName`.
