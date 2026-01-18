# Feature: ORV Document Upload or Manual Car Data Entry

## Feature Description
Enhance the "Nova Prílezitost" (New Opportunity) modal to allow users two options when creating a new buying opportunity:
1. **Upload ORV document** - Upload a vehicle registration certificate that will be processed via OCR to automatically extract vehicle data
2. **Manual entry** - Enter car data manually through a form without uploading a document

This provides flexibility for users who may not have immediate access to the ORV document, while still leveraging the existing OCR infrastructure when documents are available.

## User Story
As a vehicle purchasing agent
I want to either upload an ORV document or manually enter car data when creating a new opportunity
So that I can start the validation process regardless of whether I have the physical document at hand

## Problem Statement
Currently, the "Nova Prílezitost" modal only accepts an SPZ (license plate) to create a new buying opportunity. Users must then navigate to the Detail page and go through separate steps to add vehicle data. This creates friction when:
- Users already have the ORV document and want to process it immediately
- Users want to pre-fill vehicle data during opportunity creation
- Users need to quickly create opportunities with partial data

## Solution Statement
Transform the `CreateOpportunityModal` into a multi-option flow that:
1. First asks the user to choose between "Upload ORV" or "Manual Entry"
2. If "Upload ORV": Shows the existing DropZone component, triggers OCR, and creates the opportunity with extracted data
3. If "Manual Entry": Shows a compact VehicleForm with essential fields (SPZ, VIN, make, model, owner)
4. Both paths create a `buying_opportunity` and optionally a `vehicle` record with the provided data

## Relevant Files
Use these files to implement the feature:

### Modal & UI Components
- `apps/web/src/components/shared/CreateOpportunityModal.vue` - Main modal to be enhanced with upload/manual choice
- `apps/web/src/components/ocr/DropZone.vue` - Existing drag-and-drop upload component to reuse
- `apps/web/src/components/forms/VehicleForm.vue` - Reference for vehicle data fields and validation patterns
- `apps/web/src/components/ocr/OcrStatus.vue` - Shows OCR processing status, can be reused

### Page Integration
- `apps/web/src/pages/Dashboard.vue` - Uses CreateOpportunityModal, handles `@created` event
- `apps/web/src/pages/Detail.vue` - Reference for the full step flow pattern

### Types & Composables
- `apps/web/src/types/index.ts` - BuyingOpportunity, OcrExtraction types
- `apps/web/src/types/vehicle.ts` - Vehicle, VehicleFormInput types
- `apps/web/src/composables/useSupabase.ts` - Supabase client

### Backend Functions
- `supabase/functions/document-upload/index.ts` - Existing document upload endpoint
- `supabase/functions/ocr-extract/index.ts` - Existing OCR extraction endpoint
- `supabase/functions/ocr-extract/schemas/orv-schema.ts` - ORV extraction schema with field definitions

### Database
- `supabase/migrations/001_initial_schema.sql` - Contains `buying_opportunities`, `vehicles`, `ocr_extractions` table schemas

### New Files
- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - New wizard component with step-based flow
- `apps/web/src/components/shared/QuickVehicleForm.vue` - Simplified vehicle form for modal context

## Implementation Plan

### Phase 1: Foundation
Create the wizard structure and refactor the modal to support multiple entry paths.

1. Create `CreateOpportunityWizard.vue` as a container component
2. Add step state management (choice → upload/form → confirm)
3. Extract SPZ input as a shared element used in both paths

### Phase 2: Core Implementation
Implement both entry paths with proper state management and API integration.

1. **Upload Path**: Integrate DropZone, trigger document-upload and ocr-extract APIs
2. **Manual Path**: Create QuickVehicleForm with essential fields
3. Handle the creation of buying_opportunity and vehicle records
4. Show appropriate feedback (loading states, OCR status, validation errors)

### Phase 3: Integration
Ensure seamless integration with the existing Detail page flow.

1. After opportunity creation, navigate to Detail page at the appropriate step
2. If ORV uploaded: Start at step 2 (Vendor) since vehicle data is populated from OCR
3. If manual entry: Start at step 1 (Vehicle) to allow user to complete remaining fields
4. Pass OCR extraction data to Detail page for display in read-only OCR section

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create the Wizard Container Component
- Create `apps/web/src/components/shared/CreateOpportunityWizard.vue`
- Implement three steps: `choice`, `upload-orv`, `manual-entry`
- Add step navigation and state management
- Style consistently with existing modal design

### Step 2: Create Choice Step UI
- Display two prominent option cards:
  - "Nahrat ORV" (Upload ORV) with document icon
  - "Zadat rucne" (Manual Entry) with form icon
- Add brief descriptions for each option
- Handle option selection to advance to appropriate step

### Step 3: Implement Upload ORV Step
- Integrate existing `DropZone.vue` component
- Add SPZ input field (required before upload starts)
- Call `document-upload` API on file selection
- Show upload progress using existing patterns
- Trigger `ocr-extract` API after successful upload
- Display `OcrStatus` component during processing
- Show extracted data preview on completion

### Step 4: Create QuickVehicleForm Component
- Create `apps/web/src/components/shared/QuickVehicleForm.vue`
- Include essential fields: SPZ, VIN, Znacka (make), Model, Majitel (owner)
- Reuse validation logic from VehicleForm.vue (SPZ pattern, VIN pattern)
- Keep form compact for modal context
- Add proper Czech labels and error messages

### Step 5: Implement Manual Entry Step
- Integrate QuickVehicleForm in the wizard
- Add form submission handler
- Validate all required fields before proceeding

### Step 6: Create Opportunity & Vehicle Records
- For Upload path: Create buying_opportunity with SPZ from OCR or user input
- For Manual path: Create buying_opportunity and vehicle record together
- Handle duplicate SPZ error (code 23505) with user-friendly message
- Link vehicle to buying_opportunity via foreign key

### Step 7: Update Dashboard Integration
- Replace `CreateOpportunityModal` with `CreateOpportunityWizard` in Dashboard.vue
- Update `@created` event handler to receive additional data (entry method, OCR status)
- Navigate to Detail page with appropriate query params to indicate starting step

### Step 8: Enhance Detail Page Navigation
- Read query params to determine starting step
- If `?from=upload&ocr=completed`: Start at step 2 (Vendor)
- If `?from=manual`: Start at step 1 (Vehicle) to add additional fields
- Preserve existing step navigation logic

### Step 9: Add Loading States and Error Handling
- Show spinner during API calls
- Display error messages in Czech
- Handle network errors gracefully
- Add retry options for failed OCR

### Step 10: Add Tests
- Create unit tests for CreateOpportunityWizard
- Test step navigation logic
- Test form validation
- Test API integration mocks

### Step 11: Run Validation Commands
- Run all validation commands to ensure no regressions

## Database Changes
No database schema changes required. This feature uses existing tables:

- `buying_opportunities` - Stores new opportunities (existing)
- `vehicles` - Stores vehicle data (existing)
- `ocr_extractions` - Stores OCR results (existing)

The implementation will:
1. Create `buying_opportunity` record with SPZ
2. Optionally create `vehicle` record linked via `buying_opportunity_id`
3. For OCR path: Create `ocr_extractions` record via existing document-upload flow

## Testing Strategy

### Unit Tests
- `CreateOpportunityWizard.spec.ts`:
  - Test initial state shows choice step
  - Test clicking "Upload ORV" navigates to upload step
  - Test clicking "Manual Entry" navigates to form step
  - Test back navigation returns to choice step
  - Test cancel emits close event
- `QuickVehicleForm.spec.ts`:
  - Test SPZ validation (5-8 characters)
  - Test VIN validation (17 characters, no I/O/Q)
  - Test required field validation
  - Test form submission emits correct data

### Edge Cases
- User uploads file but OCR fails → Show retry option
- User enters duplicate SPZ → Show "already exists" error
- Network error during upload → Show error with retry
- User cancels during OCR processing → Handle cleanup
- Very large file upload → Validate 10MB limit before sending
- Invalid file type → Show format error message

## Acceptance Criteria
1. [ ] User can click "Nova Prílezitost" and see two options: Upload ORV or Manual Entry
2. [ ] Selecting "Upload ORV" shows a file dropzone with SPZ input
3. [ ] After successful ORV upload and OCR, user is navigated to Detail page step 2
4. [ ] Selecting "Manual Entry" shows a form with SPZ, VIN, make, model, owner fields
5. [ ] After manual entry submission, user is navigated to Detail page step 1
6. [ ] Duplicate SPZ shows a user-friendly error message
7. [ ] Loading states are shown during API operations
8. [ ] Czech language labels are used throughout
9. [ ] Existing DropZone, OcrStatus components are reused
10. [ ] All existing tests continue to pass
11. [ ] Frontend builds without errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend
- `cd apps/web && npm run test` - Run frontend tests

## Notes
- The existing `CreateOpportunityModal` should be renamed/refactored to `CreateOpportunityWizard` to better reflect its new multi-step nature
- Consider adding analytics tracking to understand which entry method users prefer
- Future enhancement: Add "Import from BC" option for bulk imports
- The OCR extraction fields in `orv-schema.ts` include: registrationPlateNumber, vin, firstRegistrationDate, keeperName, keeperAddress, make, model, fuelType, engineCcm, maxPower, seats, color, vehicleType, maxSpeed
- Validation rules will be applied when the full validation is run from the Detail page step 3
