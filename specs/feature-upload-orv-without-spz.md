# Feature: Upload ORV Without SPZ Requirement

## Feature Description
Allow users to upload an ORV (Osvědčení o registraci vozidla) document without first entering the SPZ (registrační značka) manually. The SPZ will be automatically extracted from the uploaded document via OCR processing. This streamlines the vehicle data entry process by removing the redundant step of manually entering information that is already present in the document being uploaded.

## User Story
As a vehicle buyer (vykupčí)
I want to upload an ORV document without entering the SPZ first
So that I can save time and avoid potential data entry errors when the SPZ is clearly visible on the document

## Problem Statement
Currently, users must manually enter the SPZ (license plate number) BEFORE they can upload an ORV document. This creates unnecessary friction because:
1. The SPZ is already present on the ORV document and will be extracted via OCR
2. Users must type the same information twice (once in the input, once extracted by OCR)
3. If the user makes a typo in the manual entry, it creates a mismatch with the OCR-extracted value
4. The DropZone shows an error "Nejprve vyplňte SPZ" when attempting to upload without entering SPZ

## Solution Statement
Remove the SPZ input requirement from the ORV upload step and instead:
1. Allow immediate document upload without SPZ pre-entry
2. Extract SPZ from the OCR results (`registrationPlateNumber` field)
3. Auto-populate the SPZ from OCR extraction
4. Display the extracted SPZ for user verification
5. Only require manual SPZ entry as a fallback if OCR fails to extract it

The backend `document-upload` Edge Function needs to accept uploads without SPZ (using a placeholder or making SPZ optional), and the frontend wizard needs to be updated to handle the new upload-first flow.

## Relevant Files
Use these files to implement the feature:

**Frontend - Wizard Components:**
- `apps/web/src/pages/NewOpportunity.vue` - Main page for new opportunity creation, contains the upload-orv step logic
- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - Modal wizard component with same logic (for Dashboard modal use)
- `apps/web/src/components/ocr/DropZone.vue` - File upload component (no changes needed)
- `apps/web/src/components/ocr/OcrStatus.vue` - Displays OCR extraction results including SPZ preview

**Backend - Edge Functions:**
- `supabase/functions/document-upload/index.ts` - Handles document upload, currently requires SPZ in form data
- `supabase/functions/ocr-extract/index.ts` - OCR processing function
- `supabase/functions/ocr-extract/schemas/orv-schema.ts` - Defines ORV extraction schema including `registrationPlateNumber`

**Tests:**
- `apps/web/src/components/shared/__tests__/CreateOpportunityWizard.spec.ts` - Wizard component tests

### New Files
- No new files required - only modifications to existing files

## Implementation Plan

### Phase 1: Backend Changes
Make the `document-upload` Edge Function accept uploads without requiring SPZ upfront. Instead, use a placeholder SPZ during upload and update it after OCR extraction.

### Phase 2: Frontend Changes
Update the wizard's upload-orv step to:
1. Remove the SPZ input requirement before upload
2. Allow immediate file upload
3. After OCR completes, extract and display SPZ from OCR data
4. Show extracted SPZ in a read-only field with option to edit
5. Enable the "Pokracovat" button based on OCR completion and SPZ availability

### Phase 3: Integration & Validation
1. Update the submit logic to use OCR-extracted SPZ
2. Add validation that SPZ was successfully extracted
3. Provide fallback manual entry if OCR fails to extract SPZ
4. Update tests to reflect new flow

## Step by Step Tasks

### Step 1: Update document-upload Edge Function to make SPZ optional
- Modify `supabase/functions/document-upload/index.ts`
- Change SPZ validation to be optional (not required in form data)
- When SPZ is not provided, generate a placeholder like `PENDING-{timestamp}`
- Store the document with placeholder SPZ for OCR processing

### Step 2: Update NewOpportunity.vue upload-orv step UI
- Remove the SPZ input field from being a prerequisite for upload
- Remove the `validateSpz()` check in `handleFileSelected()`
- Remove the `uploadError.value = 'Nejprve vyplnte SPZ'` error message
- Keep the SPZ input but make it optional and read-only after OCR

### Step 3: Add OCR-extracted SPZ display and auto-population
- After OCR completes, extract `registrationPlateNumber` from `ocrExtraction.value.extracted_data`
- Auto-populate the `spz` ref with the extracted value
- Show the extracted SPZ in a highlighted display area
- Allow user to edit if OCR extraction is incorrect

### Step 4: Update canSubmitUpload computed property
- Remove SPZ length check from validation
- Require either OCR-extracted SPZ or manually entered SPZ
- Update condition to check for valid SPZ from any source

### Step 5: Update createVehicleFromUpload to use extracted SPZ
- Get SPZ from `ocrExtraction.value.extracted_data.registrationPlateNumber`
- Fall back to manually entered SPZ if extraction failed
- Update buying_opportunities record with final SPZ value

### Step 6: Update CreateOpportunityWizard.vue with same changes
- Apply same changes from Steps 2-5 to the modal wizard component
- Ensure both entry points have consistent behavior

### Step 7: Handle OCR extraction failure gracefully
- If OCR fails to extract SPZ, show manual input field
- Display error message indicating SPZ could not be extracted
- Allow user to enter SPZ manually and proceed

### Step 8: Update handleFileSelected to work without SPZ
- Remove SPZ validation requirement before upload
- Pass placeholder or empty SPZ to document-upload API
- Update formData to not require SPZ field or use placeholder

### Step 9: Update tests for new flow
- Update `CreateOpportunityWizard.spec.ts` tests
- Add tests for upload-without-SPZ flow
- Add tests for OCR SPZ extraction display
- Add tests for manual SPZ fallback

### Step 10: Run validation commands
- Execute validation commands to ensure feature works correctly

## Database Changes

### Schema Changes
No database schema changes required. The `ocr_extractions` table already stores documents with SPZ, and the `registrationPlateNumber` field is already extracted by OCR.

### Migrations
No migrations needed.

### RLS Policies
No RLS policy changes needed.

### Indexes & Performance
No index changes needed.

## Testing Strategy

### Unit Tests
1. Test that file upload proceeds without SPZ input
2. Test OCR-extracted SPZ is displayed correctly
3. Test manual SPZ fallback when OCR fails
4. Test canSubmitUpload validation logic
5. Test createVehicleFromUpload uses correct SPZ source

### Edge Cases
1. OCR extracts SPZ but user wants to correct it
2. OCR fails to extract SPZ (null/undefined registrationPlateNumber)
3. OCR extracts malformed SPZ (too short, invalid characters)
4. User navigates back and forth between steps
5. Multiple document uploads (replacing previous)
6. Network failure during upload but before OCR

## Acceptance Criteria
1. User can upload ORV document immediately without entering SPZ first
2. After OCR completes, extracted SPZ is displayed in the UI
3. Extracted SPZ is auto-populated and used for vehicle creation
4. User can manually correct extracted SPZ if needed
5. If OCR fails to extract SPZ, user can enter it manually
6. "Pokracovat" button is enabled when valid SPZ is available (from OCR or manual)
7. Vehicle record is created with correct SPZ value
8. Existing manual-entry flow remains unchanged
9. All existing tests pass
10. No regression in document upload functionality

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `npm run test:web` - Run frontend unit tests
- `cd apps/web && npm run build` - Build frontend

## Notes
- The OCR schema already includes `registrationPlateNumber` as a required field, so extraction should be reliable
- The placeholder SPZ approach for document storage allows the upload to proceed without frontend changes to the API contract
- Consider adding visual indication that SPZ was extracted from OCR vs manually entered
- Future enhancement: validate extracted SPZ format matches Czech license plate patterns
