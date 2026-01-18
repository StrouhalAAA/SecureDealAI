# Bug: ORV OCR Missing Fuel Type (Palivo) and Power (Výkon) Fields

## Bug Description

When uploading an ORV (Osvědčení o registraci vozidla - Vehicle Registration Certificate) document, some technical vehicle data is not being extracted or displayed in the application:

1. **Fuel Type (Palivo)** - Field P.3 "PALIVO" shows "NM" (Nafta/Diesel) in the document but is not displayed
2. **Engine Power (Výkon)** - Field P.2/P.4 "MAX. VÝKON [kW] / OT." shows "110/3 500" but is not displayed
3. **Engine Displacement (Objem motoru)** - Field P.1 "ZDVIHOVÝ OBJEM [cm³]" shows "1 968.0" but is not displayed

**Affected Document:** `/Users/jakubstrouhal/Downloads/ACDFGAX01.pdf` (ŠKODA SUPERB, SPZ: 2BD9586)

### Document Analysis (What I extracted from the PDF)

**Page 1 - Front (Owner Info):**
| Field | Value |
|-------|-------|
| A. Registrační značka | 2BD9586 |
| B. Datum první registrace | 12.07.2019 |
| C.1.1/C.1.2 Provozovatel | JIŘÍ TREBULA/76153037 |
| C.1.3 Adresa | PŘÍHON 183/64, 66402 OCHOZ U BRNA |
| Document Number | UBJ770407 |
| I. Datum | 22.07.2024 |

**Page 2 - Back (Technical Data):**
| Field | Value |
|-------|-------|
| D.1 Značka, Typ, Varianta | ŠKODA, 3T, ACDFGAX01 |
| D.3 Obchodní označení | SUPERB |
| E. VIN | TMBJH7NP8K7082940 |
| J. Druh vozidla | OSOBNÍ AUTOMOBIL |
| **P.1 Zdvihový objem** | **1 968.0 cm³** |
| **P.3 Palivo** | **NM** (= Nafta/Diesel) |
| **P.2/P.4 Max. výkon** | **110/3 500** (kW/rpm) |
| S.1 Počet míst | 5 |
| J. Kategorie | M1 |

> **Note**: Fields T. Nejvyšší rychlost (max speed), V.9 Emisní norma (emission standard), and V.8 Spotřeba (fuel consumption) are NOT in scope - they are informational only with no validation rules, and emission/consumption are VTP-only fields.

### Czech Fuel Type Codes Reference
- **BA** - Benzín (Gasoline)
- **NM** - Nafta motorová (Diesel) ← This document
- **EL** - Elektřina (Electric)
- **LPG** - Liquefied Petroleum Gas
- **CNG** - Compressed Natural Gas
- **H** - Vodík (Hydrogen)
- **HYBRID** - Hybrid

## Problem Statement

The OCR extraction schema (`orv-schema.ts`) correctly defines fields for `fuelType`, `engineCcm`, and `maxPower`, but:

1. **Frontend Display Issue**: The `OcrStatus.vue` component only displays 5 fields in the preview (SPZ, VIN, make, model, keeperName) and intentionally excludes technical specs
2. **Critical Field Name Mismatch**: The `useDetailData.ts` composable reads wrong field names from extraction data
3. **Database Mapping Issue**: Even if extracted, the `VehicleForm.vue` may not be displaying these fields

## Solution Statement

1. **Fix field name mapping** in `useDetailData.ts` - read OCR schema field names, not database column names
2. **Update frontend preview** - Add missing fields (fuelType, engineCcm, maxPower, seats) to `OcrStatus.vue`
3. **Add field labels** - Add Czech translations for new fields in the field name map

> **Out of Scope**: maxSpeed (max_rychlost), emissionStandard (emisni_norma), fuelConsumption (spotreba_paliva) - these are informational only with no validation rules.

---

## Implementation Tasks

| # | Task | File | Priority | Status |
|---|------|------|----------|--------|
| 1 | Fix field mapping (fuelType→palivo, etc.) | `useDetailData.ts` | CRITICAL | ⬜ |
| 2 | Show technical fields in preview | `OcrStatus.vue` | HIGH | ⬜ |
| 3 | Add Czech labels | `OcrStatus.vue` | HIGH | ⬜ |
| 4 | Add vendor pre-fill from ORV | `useDetailData.ts` | MEDIUM | ⬜ |
| 5 | Build and verify | `npm run build` | - | ⬜ |

**Reference**: See `docs/architecture/FIELD_NAMING_CONVENTIONS.md` for complete field mapping table.

---

## Relevant Files

### Files to Modify

| File | Lines | Changes Required |
|------|-------|------------------|
| `apps/web/src/composables/useDetailData.ts` | 159-178 | Fix field mapping (CRITICAL) + Add vendorOCRData |
| `apps/web/src/components/ocr/OcrStatus.vue` | 88-95, 118-131 | Add technical fields + Czech labels |

### Files Already Correct (No Changes Needed)

| File | Status | Notes |
|------|--------|-------|
| `apps/web/src/components/forms/VehicleForm.vue` | ✅ | Already displays OCR data section |
| `apps/web/src/types/vehicle.ts` | ✅ | VehicleOCRData interface correct |
| `supabase/functions/ocr-extract/schemas/orv-schema.ts` | ✅ | Schema defines all fields correctly |
| `supabase/functions/ocr-extract/transformer.ts` | ✅ | Transformer maps fields correctly |

### Reference Documentation

| File | Purpose |
|------|---------|
| `docs/architecture/FIELD_NAMING_CONVENTIONS.md` | OCR ↔ Database field mapping table |
| `CLAUDE.md` | Quick reference for field conventions |

---

## Steps to Reproduce

1. Navigate to https://secure-deal-ai-web.vercel.app/opportunity/5f8da53e-ffec-40ee-9a48-9d644f215999
2. Upload ORV document `/Users/jakubstrouhal/Downloads/ACDFGAX01.pdf`
3. Wait for OCR extraction to complete
4. Observe that "Motor" (Fuel/Palivo) and "Výkon" (Power) fields are missing from the extracted data preview

## Root Cause Analysis

After deep analysis of the codebase, I identified **three root causes**:

### Root Cause 1: Frontend OCR Preview Display Limitation
The `OcrStatus.vue` component (lines 88-95) intentionally limits the preview to only 5 fields:
```javascript
if (props.extraction.document_type === 'ORV') {
  return {
    registrationPlateNumber: data.registrationPlateNumber,
    vin: data.vin,
    make: data.make,
    model: data.model,
    keeperName: data.keeperName,
  };
}
```

The fields `fuelType`, `engineCcm`, `maxPower`, and `seats` exist in the extraction but are **never displayed in the preview**.

### Root Cause 2: Field Name Mismatch in useDetailData.ts
**CRITICAL BUG**: The `vehicleOCRData` computed property in `useDetailData.ts` (lines 159-178) uses **database column names** (`palivo`, `objem_motoru`, `vykon_kw`) but the `extracted_data` JSON stores **OCR schema field names** (`fuelType`, `engineCcm`, `maxPower`).

```typescript
// WRONG - uses database column names
palivo: (vtpData?.palivo as string) || (orvData?.palivo as string) || null,
objem_motoru: (vtpData?.objem_motoru as number) || (orvData?.objem_motoru as number) || null,

// CORRECT - should use OCR schema field names
palivo: (vtpData?.fuelType as string) || (orvData?.fuelType as string) || null,
objem_motoru: (vtpData?.engineCcm as number) || (orvData?.engineCcm as number) || null,
```

This means even if OCR extracts all fields correctly, the `VehicleForm.vue` OCR data section will show `-` for all these fields.

### Root Cause 3: Potential OCR Extraction Gap (To Verify)
The Mistral OCR schema (`orv-schema.ts`) correctly defines the fields, but we need to verify:
1. The `extracted_data` in the database actually contains these fields
2. The Mistral API is successfully extracting data from page 2 (technical specs)

## Issues Identified

### Issue 1: Frontend OCR Preview Missing Technical Fields
- **Error Pattern**: UI limitation - fields exist in extraction but are not shown
- **Category**: Frontend
- **Affected Files**: `apps/web/src/components/ocr/OcrStatus.vue`
- **Root Cause**: Hardcoded field list in `extractedDataPreview` computed property only shows 5 fields
- **Fix Approach**: Add fuelType, engineCcm, maxPower, seats to the ORV preview object

### Issue 2: Missing Field Label Translations in OcrStatus
- **Error Pattern**: New fields have no Czech translations in fieldNameMap
- **Category**: Frontend
- **Affected Files**: `apps/web/src/components/ocr/OcrStatus.vue`
- **Root Cause**: fieldNameMap only includes 12 labels
- **Fix Approach**: Add Czech labels: fuelType→"Palivo", engineCcm→"Objem motoru [cm³]", maxPower→"Výkon [kW/ot.]", seats→"Počet míst"

### Issue 3: Field Name Mismatch in useDetailData.ts (CRITICAL)
- **Error Pattern**: VehicleForm OCR section shows `-` for all technical fields
- **Category**: Frontend / Data Mapping
- **Affected Files**: `apps/web/src/composables/useDetailData.ts`
- **Root Cause**: The `vehicleOCRData` computed property reads from wrong field names. It uses database column names (`palivo`, `objem_motoru`) but `extracted_data` stores OCR schema names (`fuelType`, `engineCcm`)
- **Fix Approach**: Update field mapping to read from correct OCR field names:
  - `palivo` ← read from `fuelType`
  - `objem_motoru` ← read from `engineCcm`
  - `vykon_kw` ← read from `maxPower` (need to extract number)
  - `pocet_mist` ← read from `seats`

### Issue 4: Need to Verify OCR Extraction Contains Fields
- **Error Pattern**: Unknown if Mistral extracts technical fields from page 2
- **Category**: Backend / Investigation
- **Affected Files**: Database / OCR extraction
- **Root Cause**: Need to verify actual extraction results
- **Fix Approach**: Query database or re-upload document to verify extracted_data JSON contains fuelType, engineCcm, maxPower

## Step by Step Implementation

### Step 1: Fix useDetailData.ts Field Name Mapping (CRITICAL)
- Open `apps/web/src/composables/useDetailData.ts`
- Update `vehicleOCRData` computed property (lines 159-178)
- Change field reads to use OCR schema names instead of database column names:
```typescript
// For ORV extractions, the extracted_data uses schema field names:
// fuelType, engineCcm, maxPower, seats, color, vehicleType

// Fix the mapping:
barva: (vtpData?.color as string) || (orvData?.color as string) || null,
palivo: (vtpData?.fuelType as string) || (orvData?.fuelType as string) || null,
objem_motoru: (vtpData?.engineCcm as number) || (orvData?.engineCcm as number) || null,
pocet_mist: (vtpData?.seats as number) || (orvData?.seats as number) || null,
// For vykon_kw, need to extract number from maxPower string like "110/3500"
vykon_kw: extractPowerKw((vtpData?.maxPower || orvData?.maxPower) as string | null | undefined),
```
- Add helper function `extractPowerKw(maxPower)` to parse "110/3500" → 110

### Step 2: Update OcrStatus.vue Preview Fields
- Open `apps/web/src/components/ocr/OcrStatus.vue`
- Modify `extractedDataPreview` computed property (lines 88-95)
- Add technical fields to the ORV return object:
```typescript
if (props.extraction.document_type === 'ORV') {
  return {
    registrationPlateNumber: data.registrationPlateNumber,
    vin: data.vin,
    make: data.make,
    model: data.model,
    keeperName: data.keeperName,
    fuelType: data.fuelType,       // ADD
    engineCcm: data.engineCcm,     // ADD
    maxPower: data.maxPower,       // ADD
    seats: data.seats,             // ADD
  };
}
```

### Step 3: Add Czech Field Labels to OcrStatus.vue
- Add to `fieldNameMap` object (after line 131):
```typescript
fuelType: 'Palivo',
engineCcm: 'Objem motoru [cm³]',
maxPower: 'Výkon [kW/ot.]',
seats: 'Počet míst',
```

### Step 4: Verify VTP Field Mapping (if applicable)
- VTP uses different field names in schema - verify mapping is correct
- VTP schema uses: `fuelType`, `engineCcm`, `maxPowerKw` (not maxPower string)
- Ensure both ORV and VTP extractions map correctly

### Step 5: Build and Test
- Run `cd apps/web && npm run build` to verify no TypeScript errors
- Start dev server with `npm run dev`
- Upload ORV document `/Users/jakubstrouhal/Downloads/ACDFGAX01.pdf`
- Verify:
  - OcrStatus preview shows: SPZ, VIN, make, model, keeperName, Palivo=NM, Objem=1968, Výkon=110/3500, Míst=5
  - VehicleForm OCR section shows: Palivo=NM, Objem=1968 cm³, Výkon=110 kW, Počet míst=5

### Step 6: Run Validation Commands
```bash
# Build frontend to check for TypeScript errors
cd apps/web && npm run build
```

## Database Changes

No schema changes required. The `vehicles` table already has:
- `palivo VARCHAR(20)` - for fuel type
- `objem_motoru INTEGER` - for engine displacement
- `vykon_kw DECIMAL(10,2)` - for power in kW

The transformer (`transformORVToVehicle`) already maps these correctly.

## Testing Strategy

### Regression Tests
1. Upload ORV document and verify 9 fields are extracted and displayed (SPZ, VIN, make, model, keeperName, fuelType, engineCcm, maxPower, seats)
2. Verify VTP document extraction still works (has similar technical fields)
3. Verify OP document extraction still works (no technical fields expected)

### Edge Cases
1. ORV document missing fuel type field (should show "-" not break)
2. ORV document with unusual fuel type (e.g., HYBRID)
3. Power format variations ("110/3500" vs "110 / 3 500")
4. Engine displacement with decimals (1968.0 vs 1968)

## Validation Commands

Execute every command to validate the bug is fixed:

```bash
# 1. Test database connection
npm run test:db

# 2. Build frontend to check for TypeScript errors
cd apps/web && npm run build

# 3. Start local development server for manual testing
npm run dev
```

## Notes

### Czech Fuel Type Codes (Official)
According to Czech Ministry of Transport:
- **BA** = Benzín (Petrol/Gasoline)
- **NM** = Nafta Motorová (Motor Diesel)
- **EL** = Elektřina (Electric)
- **LPG** = Liquefied Petroleum Gas
- **CNG** = Compressed Natural Gas
- **H** = Vodík (Hydrogen)
- **HYBRID** = Hybrid

The user mentioned the field should be named "Palivo" (Fuel) not "Motor" - this is correct. The Czech term on ORV documents is "P.3 PALIVO".

### Power Field Format
The ORV document shows power as "P.2/P.4 MAX. VÝKON [kW] / OT. [min⁻¹]" with format like "110/3 500" meaning 110 kW at 3,500 RPM. The `extractPowerKw()` function in transformer.ts already handles this by extracting the first number.

### Multi-Page Document Consideration
The ORV is a two-sided document:
- **Front (Page 1)**: Owner/keeper info, registration number, document number
- **Back (Page 2)**: Technical specifications (brand, model, VIN, fuel, power, etc.)

Mistral OCR should process both pages. Need to verify page 2 extraction is working correctly.
