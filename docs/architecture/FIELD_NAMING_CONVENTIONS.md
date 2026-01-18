# Field Naming Conventions - SecureDealAI

> **Status**: MVP Implementation
> **Last Updated**: 2024-01-18
> **Purpose**: Document field naming across layers and provide alignment instructions for future development

## Overview

The application uses different naming conventions across layers due to:
- **OCR Layer**: Mistral API schema uses English camelCase (industry standard for JSON APIs)
- **Database Layer**: PostgreSQL uses Czech snake_case (domain-specific, aligned with Czech vehicle documents)
- **Frontend Layer**: TypeScript interfaces bridge both conventions

**MVP Decision**: Keep both conventions and maintain a translation layer in `useDetailData.ts`.

---

## Current Field Mapping

### Vehicle Technical Fields

| Czech Document Field | OCR Schema (camelCase) | Database Column (snake_case) | VehicleOCRData Interface |
|---------------------|------------------------|------------------------------|--------------------------|
| P.3 PALIVO | `fuelType` | `palivo` | `palivo` |
| P.1 ZDVIHOVÝ OBJEM | `engineCcm` | `objem_motoru` | `objem_motoru` |
| P.2 MAX. VÝKON | `maxPower` | `vykon_kw` | `vykon_kw` |
| S.1 POČET MÍST | `seats` | `pocet_mist` | `pocet_mist` |
| T. NEJVYŠŠÍ RYCHLOST | `maxSpeed` | `max_rychlost` | `max_rychlost` |
| R. BARVA | `color` | `barva` | `barva` |
| J. DRUH VOZIDLA | `vehicleType` | `kategorie_vozidla` | `kategorie_vozidla` |

### Vehicle Identification Fields

| Czech Document Field | OCR Schema | Database Column | Notes |
|---------------------|------------|-----------------|-------|
| A. REGISTRAČNÍ ZNAČKA | `registrationPlateNumber` | `spz` | License plate |
| E. VIN | `vin` | `vin` | Same in both |
| D.1 TOVÁRNÍ ZNAČKA | `make` | `znacka` | Vehicle brand |
| D.3 OBCHODNÍ OZNAČENÍ | `model` | `model` | Same in both |
| B. DATUM PRVNÍ REG. | `firstRegistrationDate` | `datum_1_registrace` | ISO date format |

### Owner/Keeper Fields (ORV)

| Czech Document Field | OCR Schema | Database Column | Notes |
|---------------------|------------|-----------------|-------|
| C.1.1/C.1.2 PROVOZOVATEL | `keeperName` | `majitel` (vehicle) / `name` (vendor) | Format: "NAME/ID" |
| C.1.1/C.1.2 (identifier) | `keeperIdentifier` | `personal_id` or `company_id` (vendor) | Parsed from "NAME/ID" format |
| (detected) | `keeperVendorType` | `vendor_type` (vendor) | 'PHYSICAL_PERSON' or 'COMPANY' |
| (validated) | `keeperPersonalId` | `personal_id` (vendor) | Normalized Rodné číslo if FO |
| (validated) | `keeperCompanyId` | `company_id` (vendor) | Normalized IČO if PO |
| (validation status) | `keeperIdentifierValid` | - | Boolean: identifier passed validation |
| C.1.3 ADRESA | `keeperAddress` | → vendor table | Street, postal, city |

---

## Translation Layer

### Location
`apps/web/src/composables/useDetailData.ts` - `vehicleOCRData` computed property

### Current Implementation (NEEDS FIX)
```typescript
// WRONG - reads snake_case from OCR JSON (doesn't exist)
palivo: (vtpData?.palivo as string) || (orvData?.palivo as string) || null,
```

### Correct Implementation
```typescript
// CORRECT - reads camelCase from OCR, outputs snake_case for UI
palivo: (vtpData?.fuelType as string) || (orvData?.fuelType as string) || null,
objem_motoru: (vtpData?.engineCcm as number) || (orvData?.engineCcm as number) || null,
vykon_kw: extractPowerKw((vtpData?.maxPower || orvData?.maxPower) as string),
pocet_mist: (vtpData?.seats as number) || (orvData?.seats as number) || null,
max_rychlost: (vtpData?.maxSpeed as number) || (orvData?.maxSpeed as number) || null,
barva: (vtpData?.color as string) || (orvData?.color as string) || null,
kategorie_vozidla: (vtpData?.vehicleType as string) || (orvData?.vehicleType as string) || null,
```

### Helper Function
```typescript
function extractPowerKw(maxPower: string | null | undefined): number | null {
  if (!maxPower) return null;
  const match = maxPower.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
```

---

## Instructions for Future Development

### Adding New OCR Fields

1. **Define in OCR Schema** (`supabase/functions/ocr-extract/schemas/orv-schema.ts`)
   - Use English camelCase
   - Add description with Czech document field reference
   ```typescript
   newField: {
     type: "string",
     description: "X.X CZECH_FIELD_NAME - Description"
   }
   ```

2. **Add Database Column** (migration)
   - Use Czech snake_case
   - Match terminology from Czech vehicle documents
   ```sql
   ALTER TABLE vehicles ADD COLUMN novy_sloupec VARCHAR(100);
   ```

3. **Update Translation Layer** (`useDetailData.ts`)
   - Map from OCR camelCase to database snake_case
   ```typescript
   novy_sloupec: (orvData?.newField as string) || null,
   ```

4. **Update TypeScript Interface** (`types/vehicle.ts`)
   - Add to `VehicleOCRData` interface using snake_case
   ```typescript
   novy_sloupec?: string | null;
   ```

5. **Add Validation Rule** (if needed)
   - Create rule comparing `vehicle.novy_sloupec` with `ocr_orv.newField`

### Adding New Document Types

1. Create schema in `supabase/functions/ocr-extract/schemas/`
2. Add transformer in `transformer.ts`
3. Update `useDetailData.ts` to handle new document type
4. Add to this mapping document

---

## Validation Engine Mapping

The validation rules use explicit field paths that respect both naming conventions:

```typescript
// Example rule
{
  source: { entity: 'vehicle', field: 'znacka' },     // Database column
  target: { entity: 'ocr_orv', field: 'make' },       // OCR schema field
  comparison: { type: 'FUZZY', threshold: 0.85 }
}
```

### Current Validation Rules Coverage

| Rule ID | Source (DB) | Target (OCR) | Status |
|---------|-------------|--------------|--------|
| VEH-001 | `vehicle.spz` | `ocr_orv.registrationPlateNumber` | ✅ Active |
| VEH-002 | `vehicle.vin` | `ocr_orv.vin` | ✅ Active |
| VEH-003 | `vehicle.znacka` | `ocr_orv.make` | ✅ Active |
| VEH-004 | `vehicle.model` | `ocr_orv.model` | ✅ Active |
| VEH-005 | `vehicle.palivo` | `ocr_orv.fuelType` | ⚠️ TODO |
| VEH-006 | `vehicle.vykon_kw` | `ocr_orv.maxPower` | ⚠️ TODO |

---

## Future Alignment Options

### Option A: Keep Current (Recommended for MVP)
- Maintain translation layer in `useDetailData.ts`
- Document all mappings in this file
- Minimal refactoring risk

### Option B: Standardize to English camelCase
- Rename database columns to English
- Update all queries and forms
- **Risk**: Breaking changes, migration complexity

### Option C: Standardize to Czech snake_case
- Update OCR schema to output Czech names
- Modify transformer to output Czech field names
- **Risk**: Diverges from Mistral API conventions

**Recommendation**: Continue with Option A until post-MVP, then evaluate based on team preference.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│ FIELD TRANSLATION QUICK REFERENCE                               │
├─────────────────────────────────────────────────────────────────┤
│ OCR → Database (in useDetailData.ts)                            │
│                                                                 │
│ fuelType        → palivo                                        │
│ engineCcm       → objem_motoru                                  │
│ maxPower        → vykon_kw (parse "110/3500" → 110)            │
│ seats           → pocet_mist                                    │
│ maxSpeed        → max_rychlost                                  │
│ color           → barva                                         │
│ vehicleType     → kategorie_vozidla                             │
│ keeperName      → majitel (vehicle) / name (vendor)            │
│ keeperIdentifier → personal_id or company_id (vendor)          │
│ keeperVendorType → vendor_type (vendor)                        │
│ keeperPersonalId → personal_id (vendor)                        │
│ keeperCompanyId  → company_id (vendor)                         │
│ keeperAddress   → adresa (vendor)                               │
│ make            → znacka                                        │
│ model           → model (same)                                  │
│ vin             → vin (same)                                    │
│ registrationPlateNumber → spz                                   │
│ firstRegistrationDate   → datum_1_registrace                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Files

- OCR Schemas: `supabase/functions/ocr-extract/schemas/`
- Transformer: `supabase/functions/ocr-extract/transformer.ts`
- Translation Layer: `apps/web/src/composables/useDetailData.ts`
- Type Definitions: `apps/web/src/types/vehicle.ts`
- Validation Rules: `docs/architecture/VALIDATION_RULES_SEED.json`
- Database Schema: `docs/architecture/DB_SCHEMA_DYNAMIC_RULES.sql`
