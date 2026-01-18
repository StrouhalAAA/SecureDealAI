# Feature: ORV Vendor Identity Extraction (Rodné číslo / IČO)

## Feature Description
Enhance the OCR extraction system to automatically extract and differentiate vendor identity information from ORV (Osvědčení o registraci vozidla) documents. The ORV document contains the keeper/operator information in field C.1.1./C.1.2. in the format "NAME/IDENTIFIER" where:
- For **Fyzická Osoba (FO)**: IDENTIFIER is the "Rodné číslo" (birth number, 8-10 digits)
- For **Právnická Osoba (PO)**: IDENTIFIER is the "IČO" (company ID, 8 digits)

Currently, the OCR extracts only `keeperName` and `keeperAddress`, but ignores the critical identifier after the "/" separator. The system also defaults all vendors to `PHYSICAL_PERSON` type without detecting company entities.

## User Story
As a vehicle purchase validator
I want the system to automatically extract vendor identification (Rodné číslo or IČO) from ORV documents
So that vendor forms are pre-filled with correct identity data and vendor type, reducing manual data entry and errors

## Problem Statement
1. **Missing Identity Extraction**: The ORV OCR schema extracts `keeperName` as the full text "JIŘÍ TREBULA/76153037" but doesn't parse out the identifier "76153037" (Rodné číslo) or "08852316" (IČO)
2. **No Vendor Type Detection**: System always creates vendors as `PHYSICAL_PERSON`, even when the ORV clearly shows a company (indicated by "S.R.O." suffix and 8-digit IČO)
3. **Missing OCR Warning for Companies**: The OCR warning banner only shows for physical persons missing Rodné číslo, but doesn't handle the company case where IČO is missing
4. **Manual Data Entry Burden**: Users must manually enter Rodné číslo or IČO even though this information is visible on the ORV document

## Solution Statement
1. **Enhance ORV Schema**: Add new fields `keeperIdentifier` to capture the ID portion after the "/" separator
2. **Implement Vendor Type Detection**: Parse the name/identifier to detect:
   - Companies: Names containing "S.R.O.", "A.S.", "SPOL.", etc. with 8-digit IČO
   - Physical Persons: Personal names with 9-10 digit Rodné číslo
3. **Update Transformer**: Add parsing logic to split "NAME/IDENTIFIER" format and normalize both parts
4. **Enhance Vendor Creation**: Use detected vendor type and pre-fill appropriate identity field (personal_id or company_id)
5. **Update VendorForm**: Show appropriate OCR warning for both FO (missing Rodné číslo) and PO (missing IČO)
6. **Integrate VTP Owner Data**: Use VTP's `ownerIco` field as fallback/cross-validation source for company IČO
7. **Add Frontend Data Layer**: Create `vendorOCRData` computed property in `useDetailData.ts` to expose vendor OCR fields to components

## Relevant Files
Use these files to implement the feature:

### OCR Schema & Processing
- `supabase/functions/ocr-extract/schemas/orv-schema.ts` - Add `keeperIdentifier` field to ORV extraction schema
- `supabase/functions/ocr-extract/transformer.ts` - Add parsing logic for "NAME/IDENTIFIER" format and vendor type detection

### Frontend - Vendor Creation
- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - Update vendor auto-creation to use detected vendor type and identity
- `apps/web/src/components/forms/VendorForm.vue` - Update OCR warning banner for company case

### Frontend - Data Layer
- `apps/web/src/composables/useDetailData.ts` - Add `vendorOCRData` computed property to expose vendor OCR fields

### Types
- `apps/web/src/types/index.ts` - Add `VendorOCRData` interface and update `OcrExtraction` type

### Documentation
- `docs/architecture/FIELD_NAMING_CONVENTIONS.md` - Document new OCR field mappings

### New Files
- `supabase/functions/ocr-extract/vendor-parser.ts` - New utility module for vendor identity parsing and type detection

## Implementation Plan

### Phase 1: Foundation
1. Create vendor parsing utility module with:
   - Function to split "NAME/IDENTIFIER" format
   - Function to detect vendor type (FO vs PO) based on name patterns
   - Function to validate and normalize Rodné číslo (9-10 digits, divisibility check)
   - Function to validate and normalize IČO (8 digits, modulo 11 checksum)
2. Add unit tests for the parsing logic with edge cases

### Phase 2: Core Implementation
1. Update ORV OCR schema to request `keeperIdentifier` as separate field
2. Update transformer to use vendor parser utilities
3. Add new normalized output fields: `keeperVendorType`, `keeperPersonalId`, `keeperCompanyId`

### Phase 3: Integration
1. Update CreateOpportunityWizard to:
   - Detect vendor type from OCR data
   - Pre-fill appropriate identity field (personal_id or company_id)
   - Set correct vendor_type
2. Update VendorForm to:
   - Show OCR warning for companies missing IČO
   - Auto-trigger ARES lookup when company IČO is pre-filled
3. Update field naming conventions documentation

## Step by Step Tasks

### Step 1: Create Vendor Parser Utility Module
- Create new file `supabase/functions/ocr-extract/vendor-parser.ts`
- Implement `parseKeeperNameIdentifier(fullText: string)` function:
  - Use regex `/^(.+)\/(\d{8,10})$/` to find name and identifier
  - This handles multiple "/" separators by matching the last "/" followed by 8-10 digits
  - Handle cases with no valid identifier (return name only)
  - Return `{ name: string, identifier?: string, rawIdentifier?: string }`
  - `rawIdentifier` stores original OCR value for debugging even if invalid
- Implement `detectVendorType(name: string, identifier?: string)` function:
  - Check for company patterns (case-insensitive): "S.R.O.", "A.S.", "SPOL. S R.O.", "K.S.", "V.O.S.", "Z.S.", "DRUŽSTVO", "O.P.S.", "S.V.J.", "N.O.", "P.O.", "SE" (European company)
  - Check identifier length: 8 digits = IČO (company), 9-10 digits = Rodné číslo (FO)
  - Return `{ vendorType: 'PHYSICAL_PERSON' | 'COMPANY', confidence: number }`
- Implement `validateRodneCislo(rc: string)` function:
  - Validate format (9-10 digits)
  - Validate divisibility by 11 for 10-digit RČ
  - Return `{ valid: boolean, normalized: string }`
- Implement `validateIco(ico: string)` function:
  - Validate 8 digits
  - Validate modulo 11 checksum
  - Return `{ valid: boolean, normalized: string }`

### Step 2: Write Unit Tests for Vendor Parser
- Create test file `supabase/functions/ocr-extract/__tests__/vendor-parser.test.ts`
- Test cases for `parseKeeperNameIdentifier`:
  - "JIŘÍ TREBULA/76153037" → { name: "JIŘÍ TREBULA", identifier: "76153037" }
  - "EFTERODA CONSULTING S.R.O./08852316" → { name: "EFTERODA CONSULTING S.R.O.", identifier: "08852316" }
  - "JAN NOVÁK" (no separator) → { name: "JAN NOVÁK", identifier: undefined }
  - "FIRMA A/S NĚCO/08852316" → { name: "FIRMA A/S NĚCO", identifier: "08852316" } (use last "/" with valid identifier)
- Test cases for `detectVendorType`:
  - Company detection (S.R.O., A.S., etc.)
  - Physical person detection
  - Ambiguous cases
  - Case-insensitive matching (s.r.o. vs S.R.O.)
- Test cases for validation functions
- Test cases for invalid identifiers:
  - 7-digit number (invalid IČO) → { valid: false }
  - 6-digit number (invalid RC) → { valid: false }
  - Non-numeric characters → { valid: false }

### Step 3: Update ORV OCR Schema
- Modify `supabase/functions/ocr-extract/schemas/orv-schema.ts`
- Add new field `keeperIdentifier`:
  ```typescript
  keeperIdentifier: {
    type: "string",
    description: "C.1.1./C.1.2. PROVOZOVATEL - Rodné číslo (for FO) or IČO (for PO) - the number after '/' in the keeper field"
  }
  ```
- Update TypeScript type `ORVExtractionResult` to include new field

### Step 4: Update Transformer
- Modify `supabase/functions/ocr-extract/transformer.ts`
- Import vendor parser utilities
- Update `transformORVData` function:
  - If `keeperIdentifier` is present, use it directly
  - If not, attempt to parse from `keeperName` using `parseKeeperNameIdentifier`
- Add new fields to return value:
  - `keeperVendorType`: 'PHYSICAL_PERSON' | 'COMPANY'
  - `keeperPersonalId`: normalized Rodné číslo (if FO)
  - `keeperCompanyId`: normalized IČO (if PO)
- Add helper function `extractVendorDataFromORV()`

### Step 5: Update useDetailData.ts (Frontend Data Layer)
- Modify `apps/web/src/composables/useDetailData.ts`
- Add `VendorOCRData` type to imports or define inline
- Add `vendorOCRData` computed property after `vehicleOCRData`:
  ```typescript
  const vendorOCRData = computed<VendorOCRData | null>(() => {
    if (ocrExtractions.value.length === 0) return null;

    const orv = ocrExtractions.value.find(e => e.document_type === 'ORV');
    const vtp = ocrExtractions.value.find(e => e.document_type === 'VTP');
    const orvData = orv?.extracted_data as Record<string, unknown> | null;
    const vtpData = vtp?.extracted_data as Record<string, unknown> | null;

    if (!orvData && !vtpData) return null;

    // Prefer ORV keeper data, fallback to VTP owner for IČO
    return {
      vendor_type: (orvData?.keeperVendorType as string) || 'PHYSICAL_PERSON',
      personal_id: (orvData?.keeperPersonalId as string) || null,
      company_id: (orvData?.keeperCompanyId as string) || (vtpData?.ownerIco as string) || null,
      name: (orvData?.keeperName as string) || (vtpData?.ownerName as string) || null,
      address: (orvData?.keeperAddress as string) || (vtpData?.ownerAddress as string) || null,
    };
  });
  ```
- Export `vendorOCRData` in return statement
- Update `UseDetailDataReturn` interface to include `vendorOCRData`

### Step 6: Update CreateOpportunityWizard
- Modify `apps/web/src/components/shared/CreateOpportunityWizard.vue`
- In the vendor auto-creation section (around line 397-412):
  - Read `keeperVendorType` from OCR data (default to 'PHYSICAL_PERSON')
  - Read `keeperPersonalId` or `keeperCompanyId` based on type
  - Update vendor insert to use detected type:
    ```typescript
    const vendorType = ocrData.keeperVendorType || 'PHYSICAL_PERSON';
    const personalId = vendorType === 'PHYSICAL_PERSON' ? ocrData.keeperPersonalId : null;
    const companyId = vendorType === 'COMPANY' ? ocrData.keeperCompanyId : null;
    ```

### Step 7: Update VendorForm OCR Warning and ARES Auto-Trigger
- Modify `apps/web/src/components/forms/VendorForm.vue`
- Update the OCR warning banner condition (around line 35-52):
  - Add condition for company missing IČO:
    ```vue
    <div
      v-if="isOcrCreated && vendorType === 'COMPANY' && !form.company_id"
      class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
    >
      ... "Data z OCR - doplňte IČO" ...
    </div>
    ```
  - Add success indicator when company IČO is pre-filled from OCR:
    ```vue
    <span v-if="isOcrCreated && form.company_id" class="text-blue-600 text-xs ml-2">
      (z OCR)
    </span>
    ```
- Add ARES auto-trigger in `onMounted` (around line 887-949):
  ```typescript
  // Auto-trigger ARES lookup if company IČO was pre-filled from OCR
  if (isOcrCreated.value && vendorType.value === 'COMPANY' && form.value.company_id && isValidIco.value) {
    // Small delay to ensure UI is ready
    setTimeout(() => {
      lookupAres();
    }, 500);
  }
  ```
- Add handling for invalid OCR-extracted identifiers:
  - If OCR provides invalid IČO/RC, show warning but don't pre-fill
  - Store validation status to show appropriate user guidance

### Step 8: Update Field Naming Conventions
- Modify `docs/architecture/FIELD_NAMING_CONVENTIONS.md`
- Add new OCR field mappings:
  ```
  keeperIdentifier → (parsed into personal_id or company_id)
  keeperVendorType → vendor_type
  keeperPersonalId → personal_id (vendors table)
  keeperCompanyId → company_id (vendors table)
  ```
- Add to "Owner/Keeper Fields" section:
  | Czech Document Field | OCR Schema | Database Column | Notes |
  |---------------------|------------|-----------------|-------|
  | C.1.1/C.1.2 (identifier) | `keeperIdentifier` | `personal_id` or `company_id` | Parsed from "NAME/ID" format |
  | (detected) | `keeperVendorType` | `vendor_type` | 'PHYSICAL_PERSON' or 'COMPANY' |

### Step 9: Update Types Definition
- Modify `apps/web/src/types/index.ts`
- Add `VendorOCRData` interface:
  ```typescript
  export interface VendorOCRData {
    vendor_type: 'PHYSICAL_PERSON' | 'COMPANY';
    personal_id: string | null;
    company_id: string | null;
    name: string | null;
    address: string | null;
  }
  ```

### Step 10: Run Validation Commands
- Run `npm run test:db` to verify database connection
- Run `supabase functions serve ocr-extract --env-file supabase/.env.local` to test Edge Function
- Run `cd apps/web && npm run build` to verify frontend builds

## Database Changes
No database schema changes required. The `vendors` table already has:
- `vendor_type` column (VARCHAR(20))
- `personal_id` column (VARCHAR(15))
- `company_id` column (VARCHAR(15))

The `ocr_extractions` table uses JSONB for `extracted_data`, which will automatically accommodate the new fields:
- `keeperIdentifier` (string)
- `keeperVendorType` ('PHYSICAL_PERSON' | 'COMPANY')
- `keeperPersonalId` (string | null)
- `keeperCompanyId` (string | null)
- `keeperIdentifierValid` (boolean) - tracks if OCR identifier passed validation

## Testing Strategy

### Unit Tests
1. **Vendor Parser Tests** (`vendor-parser.test.ts`):
   - Parse "NAME/ID" format correctly
   - Handle missing identifier
   - Detect company by name patterns
   - Detect company by 8-digit IČO
   - Validate Rodné číslo format and checksum
   - Validate IČO format and checksum

2. **Transformer Tests**:
   - ORV with FO keeper extracts correct vendor data
   - ORV with PO keeper extracts correct vendor data
   - Fallback parsing when `keeperIdentifier` not provided by OCR

### Edge Cases
1. **Name contains "/" in company name** (e.g., "FIRMA A/S NĚCO/12345678")
   - Resolution: Use regex to find the last "/" followed by 8-10 digits at end of string
   - Pattern: `/^(.+)\/(\d{8,10})$/` - captures name and identifier separately
2. **Malformed identifier** (wrong number of digits)
   - Resolution: Store null for identifier, log warning, let user enter manually
   - Show warning banner: "OCR nenalezlo platné identifikační číslo"
3. **Invalid checksum on Rodné číslo or IČO**
   - Resolution: Do not pre-fill invalid identifiers, show validation error if user enters
   - Store raw OCR value in `ocr_extractions.extracted_data` for debugging
4. **Mixed case company suffixes** (s.r.o. vs S.R.O.)
   - Resolution: Case-insensitive matching using regex with `i` flag
5. **No identifier present on ORV** (older format)
   - Resolution: Fall back to `PHYSICAL_PERSON` type, require manual entry
6. **Multiple "/" separators in name field**
   - Resolution: Use last "/" that precedes 8-10 digits as the separator
7. **VTP and ORV have different owner/keeper**
   - Resolution: Prefer ORV keeper data (current vehicle operator), log discrepancy
8. **OCR extracts partial identifier** (e.g., only 6 digits visible on damaged document)
   - Resolution: Do not pre-fill, show info message about incomplete OCR data

## Acceptance Criteria
1. [ ] ORV OCR extraction includes `keeperIdentifier` field
2. [ ] System correctly detects vendor type as COMPANY when name contains "S.R.O.", "A.S.", etc.
3. [ ] System correctly detects vendor type as PHYSICAL_PERSON when identifier is 9-10 digits
4. [ ] Extracted Rodné číslo is normalized to format "######/####"
5. [ ] Extracted IČO is normalized to 8 digits with leading zeros
6. [ ] Vendor auto-creation uses detected vendor type
7. [ ] VendorForm pre-fills `personal_id` for FO or `company_id` for PO
8. [ ] Warning banner shows for FO missing Rodné číslo
9. [ ] Warning banner shows for PO missing IČO
10. [ ] ARES lookup auto-triggers when company IČO is pre-filled
11. [ ] All validation commands pass with zero regressions
12. [ ] Unit tests cover main parsing logic and edge cases

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve ocr-extract --env-file supabase/.env.local` - Test OCR Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Validation Rules (Future Enhancement)
After this feature is implemented, consider adding validation rules to cross-check vendor identity:

| Rule ID | Source (DB) | Target (OCR) | Comparison | Severity |
|---------|-------------|--------------|------------|----------|
| VEN-001 | `vendor.personal_id` | `ocr_orv.keeperPersonalId` | EXACT | CRITICAL |
| VEN-002 | `vendor.company_id` | `ocr_orv.keeperCompanyId` | EXACT | CRITICAL |
| VEN-003 | `vendor.company_id` | `ocr_vtp.ownerIco` | EXACT | WARNING |
| VEN-004 | `vendor.name` | `ocr_orv.keeperName` | FUZZY (0.85) | WARNING |

These rules would detect mismatches between manually entered vendor data and OCR-extracted identity.

## Notes
- The ORV document format shows keeper info as "C.1.1./C.1.2. PROVOZOVATEL" which contains both name and identifier separated by "/"
- **Czech company suffixes to detect** (case-insensitive):
  - S.R.O. (společnost s ručením omezeným)
  - A.S. (akciová společnost)
  - SPOL. S R.O. (alternate form)
  - K.S. (komanditní společnost)
  - V.O.S. (veřejná obchodní společnost)
  - Z.S. (zapsaný spolek)
  - DRUŽSTVO
  - O.P.S. (obecně prospěšná společnost)
  - S.V.J. (společenství vlastníků jednotek)
  - SE (Societas Europaea - European company)
  - N.O. (nadační fond)
  - P.O. (příspěvková organizace)
- Rodné číslo format: 6 digits (birth date YYMMDD) + 3-4 digit suffix, total 9-10 digits
- IČO format: exactly 8 digits with modulo 11 checksum (same validation as in VendorForm.vue)
- **VTP Integration**: VTP document has explicit `ownerIco` field that can serve as fallback/cross-validation for company IČO
- **Data Priority**: ORV keeper > VTP owner (for current operator), but VTP ownerIco may be more reliable for company identification

## Error Handling Strategy
| Scenario | Behavior | User Feedback |
|----------|----------|---------------|
| Valid IČO extracted | Pre-fill `company_id`, auto-trigger ARES | "(z OCR)" indicator, ARES lookup starts |
| Valid RC extracted | Pre-fill `personal_id` | "(z OCR)" indicator |
| Invalid identifier (checksum fail) | Do not pre-fill | Warning: "Neplatný formát čísla z OCR" |
| Partial identifier (<8 digits) | Do not pre-fill | Info: "Neúplné číslo z OCR dokumentu" |
| No identifier found | Fall back to PHYSICAL_PERSON | Warning banner: "Doplňte rodné číslo" |
| Company detected but no IČO | Set COMPANY type, no pre-fill | Warning banner: "Doplňte IČO" |
