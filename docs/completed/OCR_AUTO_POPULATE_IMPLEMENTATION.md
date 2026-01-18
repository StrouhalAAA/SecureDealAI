# OCR Auto-Populate Vehicle & Vendor Data - Implementation Summary

**Completed**: 2026-01-18
**Status**: ✅ Implemented and deployed

---

## Overview

When an ORV (Vehicle Registration Certificate) document is uploaded and OCR extraction completes:
1. **Vehicle record** is created with all extractable fields (not just basic info)
2. **Vendor record** is auto-created from keeper information
3. **OCR data** is retained in `ocr_extractions` table for validation comparison

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/utils/addressParser.ts` | **NEW** - Czech address parser + `extractPowerKw()` helper |
| `apps/web/src/components/shared/CreateOpportunityWizard.vue` | Enhanced vehicle insert with all OCR fields + auto-creates vendor |
| `apps/web/src/components/forms/VendorForm.vue` | OCR warning banner + "(z OCR)" field indicators |
| `apps/web/src/components/forms/VehicleForm.vue` | Preserves OCR fields when updating |
| `supabase/migrations/016_vendor_ocr_constraint.sql` | **NEW** - Allows NULL `personal_id` for OCR vendors |

---

## Field Mapping (OCR → Database)

| OCR Schema Field | Database Column | Notes |
|------------------|-----------------|-------|
| `fuelType` | `palivo` | BA, NM, EL, LPG, CNG, H, HYBRID |
| `engineCcm` | `objem_motoru` | Integer (cm³) |
| `maxPower` | `vykon_kw` | Parsed from "110/3500" → 110 |
| `seats` | `pocet_mist` | Integer |
| `maxSpeed` | `max_rychlost` | Integer (km/h) |
| `color` | `barva` | String |
| `vehicleType` | `kategorie_vozidla` | M1, N1, L, etc. |
| `keeperName` | vendor `name` | Auto-creates vendor |
| `keeperAddress` | vendor address fields | Parsed into street/city/postal |

---

## Address Parser

Located at `apps/web/src/utils/addressParser.ts`

Handles Czech address formats:
- `"PŘÍHON 183/64, 66402 OCHOZ U BRNA"` → street: "PŘÍHON 183/64", city: "OCHOZ U BRNA", postal: "66402"
- `"BRNO - BYSTRC, VEJROSTOVA 1294/24, 635 00"` → street: "VEJROSTOVA 1294/24", city: "BRNO - BYSTRC", postal: "63500"

---

## Vendor Constraint Change

**Before**: `personal_id IS NOT NULL` required for PHYSICAL_PERSON vendors

**After**: `personal_id IS NOT NULL OR data_source = 'OCR'`

This allows auto-creating vendor records from OCR where rodné číslo (personal ID) is not available on the ORV document. Users must fill it in manually in VendorForm.

---

## UI Indicators

**VendorForm** shows:
- Yellow warning banner when OCR-created vendor is missing `personal_id`
- Blue "(z OCR)" labels on auto-filled fields (name, address)

**OcrStatus** preview shows:
- SPZ, VIN, make, model, keeperName
- fuelType, engineCcm, maxPower, seats (with Czech labels)

---

## Related Specs (Now Complete)

- `specs/bug-orv-ocr-missing-fuel-power-fields.md` - Field display issues fixed
- `specs/feature-orv-upload-or-manual-entry.md` - Upload wizard implemented

---

## Verification

```bash
# Build passes
cd apps/web && npm run build

# Migration applied
supabase db push  # Migration 016_vendor_ocr_constraint.sql
```

Test by uploading an ORV document and verifying:
1. Vehicle has all technical fields populated
2. Vendor auto-created with keeper name/address
3. VendorForm shows OCR warning + indicators
