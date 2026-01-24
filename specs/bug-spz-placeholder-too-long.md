# Bug: SPZ Placeholder Exceeds VARCHAR(20) Limit

## Bug Description
When uploading an ORV document without providing an SPZ (new OCR-first flow), the document-upload Edge Function generates a placeholder SPZ using the format `PENDING-{timestamp}`. This placeholder is 21+ characters long (e.g., `PENDING-1737749123456`), which exceeds the `VARCHAR(20)` constraint on the `spz` column in the `ocr_extractions` table, causing a database error.

**Symptoms:**
- Error message: `"value too long for type character varying(20)"`
- Error code: `DATABASE_ERROR`
- HTTP status: 500

**Expected behavior:**
- User uploads ORV document successfully
- Document is stored with a valid placeholder SPZ
- OCR processing proceeds and extracts the actual SPZ

## Problem Statement
The placeholder SPZ format `PENDING-${Date.now()}` generates strings of 21+ characters, but the `spz` column in `ocr_extractions` (and related tables) only allows 20 characters.

## Solution Statement
Shorten the placeholder SPZ format to fit within the 20 character limit. Use a shorter prefix and a truncated timestamp. For example: `P-{timestamp_base36}` or `TMP-{short_id}`.

## Steps to Reproduce
1. Navigate to http://localhost:5173/new-opportunity
2. Select a deal type (Pobočka or Mobilní výkup)
3. Proceed to "ORV/VTP" step
4. Upload an ORV document without entering SPZ first
5. Observe the error: `"value too long for type character varying(20)"`

## Root Cause Analysis
In `supabase/functions/document-upload/index.ts` line 165:
```typescript
spz = `PENDING-${Date.now()}`;
```

- `Date.now()` returns a 13-digit millisecond timestamp (e.g., `1737749123456`)
- `PENDING-` prefix is 8 characters
- Total: 8 + 13 = 21 characters
- Database constraint: `spz VARCHAR(20)` in `ocr_extractions` table

## Issues Identified

### Issue 1: Placeholder SPZ exceeds column limit
- **Error Pattern**: `value too long for type character varying(20)`
- **Category**: Backend / Database
- **Affected Files**: `supabase/functions/document-upload/index.ts`
- **Root Cause**: Placeholder SPZ `PENDING-{timestamp}` generates 21+ characters
- **Fix Approach**: Shorten placeholder format to fit within 20 characters

## Relevant Files
Use these files to fix the bug:

- `supabase/functions/document-upload/index.ts` - Contains the placeholder generation logic at line 165
  - This is the only file that needs modification
  - The fix is surgical: change line 165 to generate a shorter placeholder

### New Files
- No new files required

## Step by Step Tasks

### Step 1: Update placeholder SPZ generation
- Modify `supabase/functions/document-upload/index.ts` line 165
- Change from `PENDING-${Date.now()}` to a shorter format
- Recommended format: `P${Date.now().toString(36).toUpperCase()}` (results in 10-11 chars)
- Alternative: `TMP-${Date.now().toString(36)}` (results in 12-13 chars)

### Step 2: Deploy the fix
- Run `supabase functions deploy document-upload`

### Step 3: Run Validation Commands
- Test document upload without SPZ works correctly
- Verify no regressions in normal upload flow

## Database Changes
No database schema changes required. The fix is purely in the application code.

## Testing Strategy

### Regression Tests
1. Upload ORV without SPZ - should succeed with placeholder
2. Upload ORV with SPZ - should succeed with provided SPZ
3. Upload VTP without SPZ - should succeed with placeholder
4. Upload OP without SPZ - should succeed with placeholder

### Edge Cases
1. Multiple concurrent uploads (ensure unique placeholders)
2. Very rapid uploads (timestamp collision prevention)
3. Verify placeholder is replaced with actual SPZ after OCR extraction

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd apps/web && npm run build` - Build frontend
- Manual test: Upload ORV without SPZ at http://localhost:5173/new-opportunity

## Notes
- The placeholder only needs to be unique enough to identify the upload before OCR extraction replaces it with the real SPZ
- Base36 encoding of timestamp reduces 13 digits to ~8 characters while maintaining uniqueness
- The `P` prefix distinguishes placeholder SPZs from real license plates (which wouldn't start with just `P`)
- Future consideration: add a unique suffix if sub-millisecond uniqueness is needed
