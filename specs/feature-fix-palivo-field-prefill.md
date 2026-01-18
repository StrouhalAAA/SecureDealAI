# Feature: Fix Palivo (Fuel Type) Field and OCR Auto-Prefill

## Feature Description
The vehicle form currently displays a field labeled "Motor" with fuel type options, but this label is incorrect - it should be "Palivo" (fuel in Czech). Additionally, when a buying opportunity is created via OCR upload, the extracted fuel type from the ORV document (shown in "Udaje z OCR" section as e.g. "Nafta (Diesel)") should automatically pre-select the corresponding value in the editable "Palivo" dropdown.

## User Story
As a vehicle evaluator
I want the fuel type field to be correctly labeled and auto-filled from OCR data
So that I can quickly review and confirm vehicle data without manual re-entry

## Problem Statement
1. The form field is labeled "Motor" but displays fuel type options (Benzin, Nafta, Elektro, etc.) - this is semantically incorrect
2. When OCR extracts fuel type (e.g., "NM" for Nafta), this value is displayed in the read-only OCR section but not pre-selected in the editable dropdown
3. The form field uses `form.motor` internally but should use `form.palivo` to match the database column name

## Solution Statement
1. Rename the form field label from "Motor" to "Palivo"
2. Update the form model to use `palivo` instead of `motor`
3. Update the select options to use standard fuel type codes (BA, NM, EL, etc.) that match OCR output
4. Implement auto-prefill logic that maps OCR-extracted `palivo` value to the form dropdown
5. When loading existing vehicle data, populate the dropdown from `vehicle.palivo`

## Relevant Files
Use these files to implement the feature:

- `apps/web/src/components/forms/VehicleForm.vue` - Main vehicle form containing the "Motor" field that needs renaming and prefill logic
- `apps/web/src/types/vehicle.ts` - Contains `FUEL_TYPE_OPTIONS` constant with proper codes (BA, NM, EL, etc.) and `getFuelTypeLabel` function
- `apps/web/src/composables/useDetailData.ts` - Provides `vehicleOCRData` computed property that includes `palivo` field from OCR
- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - Creates vehicle record with `palivo` from OCR data during opportunity creation

### New Files
No new files needed - this is a modification of existing files.

## Implementation Plan

### Phase 1: Foundation
- Understand current fuel type codes used in OCR (fuelType → palivo mapping)
- Review the `FUEL_TYPE_OPTIONS` constant to ensure it covers all OCR output values

### Phase 2: Core Implementation
- Rename "Motor" label to "Palivo" in VehicleForm.vue
- Change form model from `form.motor` to `form.palivo`
- Update select options to use `FUEL_TYPE_OPTIONS` from types/vehicle.ts
- Update form save logic to write `palivo` instead of `motor` to database

### Phase 3: Integration
- Add auto-prefill logic: when `ocrData.palivo` exists, set `form.palivo` to that value
- Ensure existing vehicle load populates `form.palivo` from `vehicle.palivo`
- Update VehicleForm to accept and use ocrData prop for prefilling

## Step by Step Tasks

### Step 1: Update VehicleForm.vue - Rename Field and Model
- Change label from "Motor" to "Palivo" on line 154
- Change `id="motor-select"` to `id="palivo-select"`
- Change `v-model="form.motor"` to `v-model="form.palivo"`
- Update form reactive object: rename `motor: ''` to `palivo: ''`

### Step 2: Update VehicleForm.vue - Use Standard Fuel Type Options
- Import `FUEL_TYPE_OPTIONS` from `@/types/vehicle`
- Replace hardcoded `<option>` elements with dynamic rendering from `FUEL_TYPE_OPTIONS`
- Keep the empty "-- Vyberte --" option as default

### Step 3: Update VehicleForm.vue - Form Save Logic
- In `saveAndContinue()` function, change `motor: form.value.motor || null` to `palivo: form.value.palivo || null`

### Step 4: Update VehicleForm.vue - Load Existing Vehicle Data
- In `onMounted()`, change `motor: props.existingVehicle.motor || ''` to `palivo: props.existingVehicle.palivo || ''`

### Step 5: Implement OCR Auto-Prefill
- In `onMounted()`, add logic to prefill `form.palivo` from `props.ocrData?.palivo` when available
- Only prefill if the form field is empty (don't override existing user selection)

### Step 6: Validate and Build
- Run `npm run build` in apps/web to ensure no TypeScript errors
- Test locally with `npm run dev`

## Database Changes
No database changes required - the `palivo` column already exists in the vehicles table (added in migration 014).

## Testing Strategy

### Unit Tests
- Verify form renders with "Palivo" label
- Verify form model uses `palivo` field
- Verify OCR data prefills the dropdown correctly
- Verify existing vehicle data loads into form correctly

### Edge Cases
- OCR returns fuel type code not in FUEL_TYPE_OPTIONS list (should show raw value or fallback)
- OCR returns null/undefined for fuelType (dropdown should remain on default)
- User manually changes prefilled value (should persist user's choice)
- Existing vehicle has no palivo value (should remain on default)

## Acceptance Criteria
1. Form field label displays "Palivo" instead of "Motor"
2. Dropdown options use standard codes (BA, NM, EL, LPG, CNG, H, HYBRID)
3. When creating opportunity via OCR upload with fuel type "NM", the "Nafta (Diesel)" option is pre-selected
4. When editing existing vehicle with `palivo: 'BA'`, the "Benzin" option is pre-selected
5. Form saves `palivo` value to database (not `motor`)
6. Build completes with no TypeScript errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd apps/web && npm run build` - Build frontend to check for TypeScript errors
- `cd apps/web && npm run test` - Run frontend unit tests (if available)

## Notes
- The `FUEL_TYPE_OPTIONS` constant already exists in `types/vehicle.ts` with proper Czech fuel codes
- OCR extracts `fuelType` field which is mapped to `palivo` in `useDetailData.ts`
- The read-only OCR display section already shows the fuel type correctly using `fuelTypeLabel` computed property
- Future consideration: Add "Unknown" option if OCR returns unrecognized fuel type code
