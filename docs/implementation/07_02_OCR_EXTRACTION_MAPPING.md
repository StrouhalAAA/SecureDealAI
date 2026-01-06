# Task 7.2: OCR Extraction Mapping

> **Phase**: 7 - Vehicle Data Schema Extension
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 07_01
> **Estimated Effort**: 2 hours

---

## Objective

Update the OCR extraction transformer to map newly-extractable fields from ORV and VTP documents to the extended `vehicles` table columns.

Currently, OCR extracts these fields but they are **not persisted**:
- ORV: `color`, `fuelType`, `engineCcm`, `seats`, `maxSpeed`
- VTP: All extended technical fields

---

## Prerequisites

- [ ] Task 07_01 completed (database columns exist)

---

## Architecture Reference

See: [PHASE7_00_ARCHITECTURE.md](./PHASE7_00_ARCHITECTURE.md)

### Field Mapping Table

| OCR Field (ORV) | OCR Field (VTP) | DB Column | Transform |
|-----------------|-----------------|-----------|-----------|
| `color` | `color` | `barva` | UPPERCASE |
| `fuelType` | `fuelType` | `palivo` | UPPERCASE |
| `engineCcm` | `engineCcm` | `objem_motoru` | INTEGER |
| `seats` | `seats` | `pocet_mist` | INTEGER |
| `maxSpeed` | `maxSpeed` | `max_rychlost` | INTEGER |
| - | `vehicleCategory` | `kategorie_vozidla` | UPPERCASE |
| - | `bodyType` | `karoserie` | UPPERCASE |
| - | `engineType` | `cislo_motoru` | UPPERCASE |
| - | `operatingWeight` | `provozni_hmotnost` | INTEGER |
| - | `maxPermittedWeight` | `povolena_hmotnost` | INTEGER |
| - | `length` | `delka` | INTEGER |
| - | `width` | `sirka` | INTEGER |
| - | `height` | `vyska` | INTEGER |
| - | `wheelbase` | `rozvor` | INTEGER |
| - | `co2Emissions` | `emise_co2` | STRING |
| - | `fuelConsumption` | `spotreba_paliva` | STRING |
| - | `emissionStandard` | `emisni_norma` | STRING |
| - | `lastInspectionDate` | `datum_stk` | DATE |
| - | `nextInspectionDue` | `stk_platnost` | DATE |
| - | `firstRegistrationDateCZ` | `datum_posledni_preregistrace` | DATE |

---

## Implementation Steps

### Step 1: Update Transformer Types

Update file: `supabase/functions/ocr-extract/transformer.ts`

Add to the `VehicleData` interface:

```typescript
// Extended vehicle data structure (Phase 7)
export interface VehicleDataExtended {
  // Existing fields
  spz?: string;
  vin?: string;
  znacka?: string;
  model?: string;
  datum_1_registrace?: string;
  majitel?: string;
  vykon_kw?: number;

  // Phase 7.1: Fraud detection
  datum_posledni_preregistrace?: string;

  // Phase 7.2: OCR-extractable
  barva?: string;
  palivo?: string;
  objem_motoru?: number;
  pocet_mist?: number;
  max_rychlost?: number;
  kategorie_vozidla?: string;

  // Phase 7.3: Extended VTP data
  karoserie?: string;
  cislo_motoru?: string;
  provozni_hmotnost?: number;
  povolena_hmotnost?: number;
  delka?: number;
  sirka?: number;
  vyska?: number;
  rozvor?: number;
  emise_co2?: string;
  spotreba_paliva?: string;
  emisni_norma?: string;
  datum_stk?: string;
  stk_platnost?: string;
}
```

### Step 2: Update ORV Transformer

Add to the ORV transformation function:

```typescript
/**
 * Transform ORV OCR extraction to vehicle data (extended)
 */
export function transformORVToVehicle(orvData: ORVExtractionResult): VehicleDataExtended {
  return {
    // Existing mappings
    spz: orvData.registrationPlateNumber?.replace(/\s+/g, '').toUpperCase(),
    vin: orvData.vin?.replace(/\s+/g, '').toUpperCase(),
    znacka: orvData.make?.toUpperCase(),
    model: orvData.model?.toUpperCase(),
    datum_1_registrace: normalizeDate(orvData.firstRegistrationDate),
    majitel: orvData.keeperName?.toUpperCase(),
    vykon_kw: extractPowerKw(orvData.maxPower),

    // Phase 7.2: New OCR-extractable fields from ORV
    barva: orvData.color?.toUpperCase() || undefined,
    palivo: orvData.fuelType?.toUpperCase() || undefined,
    objem_motoru: orvData.engineCcm || undefined,
    pocet_mist: orvData.seats || undefined,
    max_rychlost: orvData.maxSpeed || undefined,
  };
}

/**
 * Extract power in kW from maxPower string (e.g., "228/5700" -> 228)
 */
function extractPowerKw(maxPower?: string): number | undefined {
  if (!maxPower) return undefined;
  const match = maxPower.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : undefined;
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  // Handle DD.MM.YYYY format
  const ddmmyyyy = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }

  // Handle DD/MM/YYYY format
  const ddmmyyyySlash = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyySlash) {
    return `${ddmmyyyySlash[3]}-${ddmmyyyySlash[2]}-${ddmmyyyySlash[1]}`;
  }

  // Already YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  return undefined;
}
```

### Step 3: Update VTP Transformer

Add VTP transformation function:

```typescript
/**
 * Transform VTP OCR extraction to vehicle data (extended)
 */
export function transformVTPToVehicle(vtpData: VTPExtractionResult): VehicleDataExtended {
  return {
    // Core identification (same as ORV, for cross-validation)
    spz: vtpData.registrationPlateNumber?.replace(/\s+/g, '').toUpperCase(),
    vin: vtpData.vin?.replace(/\s+/g, '').toUpperCase(),
    znacka: vtpData.make?.toUpperCase(),
    model: vtpData.commercialName?.toUpperCase(),
    datum_1_registrace: normalizeDate(vtpData.firstRegistrationDate),
    majitel: vtpData.ownerName?.toUpperCase(),
    vykon_kw: vtpData.maxPowerKw || undefined,

    // Phase 7.1: Fraud detection
    // Note: firstRegistrationDateCZ can indicate re-registration if different from firstRegistrationDate
    datum_posledni_preregistrace: vtpData.firstRegistrationDateCZ !== vtpData.firstRegistrationDate
      ? normalizeDate(vtpData.firstRegistrationDateCZ)
      : undefined,

    // Phase 7.2: OCR-extractable (also in ORV, VTP has priority for some)
    barva: vtpData.color?.toUpperCase() || undefined,
    palivo: vtpData.fuelType?.toUpperCase() || undefined,
    objem_motoru: vtpData.engineCcm || undefined,
    pocet_mist: vtpData.seats || undefined,
    max_rychlost: vtpData.maxSpeed || undefined,
    kategorie_vozidla: vtpData.vehicleCategory?.toUpperCase() || undefined,

    // Phase 7.3: Extended VTP-only fields
    karoserie: vtpData.bodyType?.toUpperCase() || undefined,
    cislo_motoru: vtpData.engineType?.toUpperCase() || undefined,
    provozni_hmotnost: vtpData.operatingWeight || undefined,
    povolena_hmotnost: vtpData.maxPermittedWeight || undefined,
    delka: vtpData.length || undefined,
    sirka: vtpData.width || undefined,
    vyska: vtpData.height || undefined,
    rozvor: vtpData.wheelbase || undefined,
    emise_co2: vtpData.co2Emissions || undefined,
    spotreba_paliva: vtpData.fuelConsumption || undefined,
    emisni_norma: vtpData.emissionStandard || undefined,
    datum_stk: normalizeDate(vtpData.lastInspectionDate),
    stk_platnost: normalizeDate(vtpData.nextInspectionDue),
  };
}
```

### Step 4: Update Vehicle Data Merger

Create a function to merge ORV and VTP data intelligently:

```typescript
/**
 * Merge vehicle data from multiple OCR sources
 * Priority: VTP > ORV > Manual (for technical specs)
 */
export function mergeVehicleData(
  orv?: VehicleDataExtended,
  vtp?: VehicleDataExtended,
  manual?: VehicleDataExtended
): VehicleDataExtended {
  // Start with manual data as base
  const merged: VehicleDataExtended = { ...manual };

  // Layer ORV data (overwrites manual for OCR-able fields)
  if (orv) {
    Object.keys(orv).forEach((key) => {
      const value = orv[key as keyof VehicleDataExtended];
      if (value !== undefined && value !== null) {
        (merged as any)[key] = value;
      }
    });
  }

  // Layer VTP data (highest priority for technical specs)
  if (vtp) {
    Object.keys(vtp).forEach((key) => {
      const value = vtp[key as keyof VehicleDataExtended];
      if (value !== undefined && value !== null) {
        (merged as any)[key] = value;
      }
    });
  }

  return merged;
}
```

### Step 5: Update OCR Extract Index Handler

Update `supabase/functions/ocr-extract/index.ts` to use extended transformer:

```typescript
// After OCR extraction, transform and merge with existing vehicle data
const transformedData = documentType === 'VTP'
  ? transformVTPToVehicle(extractionResult)
  : transformORVToVehicle(extractionResult);

// Store in ocr_extractions with extended data
await supabase
  .from('ocr_extractions')
  .update({
    extracted_data: {
      ...extractionResult,
      _transformed: transformedData  // Include transformed data for validation
    },
    ocr_status: 'COMPLETED'
  })
  .eq('id', extractionId);
```

---

## Test Cases

### Unit Test: ORV Transformation

```typescript
Deno.test("transformORVToVehicle extracts all Phase 7 fields", () => {
  const orvData = {
    registrationPlateNumber: "5L94454",
    vin: "YV1PZA3TCL1103985",
    make: "VOLVO",
    model: "V90 CROSS COUNTRY",
    firstRegistrationDate: "15.08.2019",
    keeperName: "OSIT S.R.O.",
    maxPower: "228/5700",
    color: "MODRÁ",
    fuelType: "BA",
    engineCcm: 1969,
    seats: 5,
    maxSpeed: 230
  };

  const result = transformORVToVehicle(orvData);

  assertEquals(result.barva, "MODRÁ");
  assertEquals(result.palivo, "BA");
  assertEquals(result.objem_motoru, 1969);
  assertEquals(result.pocet_mist, 5);
  assertEquals(result.max_rychlost, 230);
});
```

### Unit Test: VTP Transformation

```typescript
Deno.test("transformVTPToVehicle extracts extended fields", () => {
  const vtpData = {
    registrationPlateNumber: "5L94454",
    vin: "YV1PZA3TCL1103985",
    make: "VOLVO",
    commercialName: "V90 CROSS COUNTRY",
    vehicleCategory: "M1",
    bodyType: "AC KOMBI",
    engineType: "B4204T29",
    operatingWeight: 1950,
    maxPermittedWeight: 2500,
    length: 4939,
    width: 1879,
    height: 1543,
    wheelbase: 2941,
    co2Emissions: "232/155/183",
    fuelConsumption: "10.0/6.7/7.9",
    emissionStandard: "715/2007*692/2008AIRZ"
  };

  const result = transformVTPToVehicle(vtpData);

  assertEquals(result.kategorie_vozidla, "M1");
  assertEquals(result.karoserie, "AC KOMBI");
  assertEquals(result.cislo_motoru, "B4204T29");
  assertEquals(result.provozni_hmotnost, 1950);
  assertEquals(result.delka, 4939);
  assertEquals(result.emise_co2, "232/155/183");
});
```

---

## Validation Criteria

- [ ] `transformORVToVehicle` extracts all Phase 7.2 fields
- [ ] `transformVTPToVehicle` extracts all Phase 7.2 and 7.3 fields
- [ ] Date normalization handles DD.MM.YYYY format
- [ ] Power extraction handles "kW/rpm" format
- [ ] Merge function prioritizes VTP > ORV > Manual
- [ ] Unit tests pass for both transformers

---

## Completion Checklist

- [ ] Transformer types extended with new fields
- [ ] ORV transformer updated
- [ ] VTP transformer updated
- [ ] Merge function created
- [ ] Index handler updated
- [ ] Unit tests created and passing
- [ ] Update tracker: `PHASE7_IMPLEMENTATION_TRACKER.md`
