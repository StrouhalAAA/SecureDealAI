# Validation Backend Architecture - SecureDealAI MVP

> **Version**: 1.0
> **Created**: 2026-01-01
> **Purpose**: Architectural specification for validation matching engine

---

## 1. Overview

This document describes the backend architecture for the validation/matching engine in SecureDealAI MVP. The engine compares manually entered data with OCR-extracted data to validate vehicle purchase opportunities.

### Key Principles

1. **Binary Matching** - OCR either extracts a value or it doesn't. No fuzzy matching.
2. **Exact Comparison** - After normalization, values are compared exactly (equal or not equal)
3. **Severity-based Status** - Fields have CRITICAL or WARNING severity determining overall status
4. **Production-aligned** - MVP architecture mirrors intended production design

---

## 2. Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER FLOW                                      │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1-2: Manual Input          STEP 3: OCR Upload           STEP 4: Validation
       │                              │                            │
       ▼                              ▼                            ▼
┌─────────────┐               ┌─────────────┐              ┌─────────────┐
│  vehicles   │               │   Mistral   │              │ validation- │
│  vendors    │               │   OCR API   │              │    run      │
│  (tables)   │               │             │              │ (Edge Func) │
└──────┬──────┘               └──────┬──────┘              └──────┬──────┘
       │                             │                            │
       │                             ▼                            │
       │                      ┌─────────────┐                     │
       │                      │    ocr_     │                     │
       │                      │ extractions │                     │
       │                      │  (table)    │                     │
       │                      └──────┬──────┘                     │
       │                             │                            │
       └─────────────┬───────────────┘                            │
                     │                                            │
                     ▼                                            │
              ┌─────────────┐                                     │
              │   COMPARE   │◄────────────────────────────────────┘
              │   ENGINE    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │ validation_ │
              │  results    │
              └─────────────┘
```

---

## 3. Validation Logic

### 3.1 Result Types

```
OCR extracts value?
├── NO  → MISSING (requires manual review)
└── YES → Compare with manual input
          ├── MATCH     → ✅ GREEN
          └── MISMATCH  → 🔴 RED (CRITICAL) or 🟠 ORANGE (WARNING)
```

### 3.2 Status Determination

```typescript
function determineOverallStatus(validations: FieldValidation[]): Status {
  // 🔴 RED: Any CRITICAL MISMATCH
  if (validations.some(v => v.severity === 'CRITICAL' && v.result === 'MISMATCH')) {
    return 'RED';
  }

  // 🟠 ORANGE: WARNING MISMATCH or CRITICAL MISSING
  if (validations.some(v =>
    (v.severity === 'WARNING' && v.result === 'MISMATCH') ||
    (v.severity === 'CRITICAL' && v.result === 'MISSING')
  )) {
    return 'ORANGE';
  }

  // 🟢 GREEN: All OK
  return 'GREEN';
}
```

---

## 4. Edge Function: `validation-run`

### 4.1 API Endpoint

```
POST /functions/v1/validation-run
Body: { "buying_opportunity_id": "uuid-123" }
```

### 4.2 Handler Logic

```typescript
// Supabase Edge Function (Deno/TypeScript)

export async function handler(req: Request) {
  const { buying_opportunity_id } = await req.json();

  // 1. LOAD - Load all data
  const manualData = await loadManualData(buying_opportunity_id);
  const ocrData = await loadOcrData(buying_opportunity_id);

  // 2. NORMALIZE - Unify formats
  const normalizedManual = normalize(manualData);
  const normalizedOcr = normalize(ocrData);

  // 3. COMPARE - Compare fields
  const fieldValidations = compareFields(normalizedManual, normalizedOcr);

  // 4. EVALUATE - Determine overall status
  const overallStatus = evaluateStatus(fieldValidations);

  // 5. STORE - Save result
  await storeValidationResult(buying_opportunity_id, fieldValidations, overallStatus);

  return { status: overallStatus, validations: fieldValidations };
}
```

---

## 5. Data Structures

### 5.1 Manual Data (from DB tables)

```typescript
interface ManualData {
  vehicle: {
    spz: string;
    vin: string;
    znacka: string;
    model: string;
    majitel: string;
    datum_1_registrace: string;
  };
  vendor: {
    vendor_type: 'PHYSICAL_PERSON' | 'COMPANY';
    name: string;
    personal_id?: string;    // FO (Physical Person)
    company_id?: string;     // PO (Company)
    address_city: string;
    address_postal_code: string;
  };
}
```

### 5.2 OCR Data (from ocr_extractions table)

```typescript
interface OcrData {
  orv: {                          // FROM ocr_extractions WHERE document_type = 'ORV'
    registrationPlateNumber: string | null;
    vin: string | null;
    make: string | null;
    model: string | null;
    keeperName: string | null;
    firstRegistrationDate: string | null;
  };
  op: {                           // FROM ocr_extractions WHERE document_type = 'OP'
    firstName: string | null;
    lastName: string | null;
    personalNumber: string | null;
    permanentStay: string | null;
  };
}
```

### 5.3 Field Validation Result

```typescript
interface FieldValidation {
  field: string;
  manual_value: string | null;
  ocr_value: string | null;
  normalized_manual: string | null;
  normalized_ocr: string | null;
  result: 'MATCH' | 'MISMATCH' | 'MISSING';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'GREEN' | 'ORANGE' | 'RED';
  message?: string;
}
```

---

## 6. Normalization Functions

```typescript
const normalizers = {
  // SPZ: remove spaces, uppercase
  spz: (value: string) => value?.replace(/\s/g, '').toUpperCase(),

  // VIN: remove spaces, uppercase, 17 chars
  vin: (value: string) => value?.replace(/\s/g, '').toUpperCase().slice(0, 17),

  // Names: uppercase, trim
  name: (value: string) => value?.trim().toUpperCase(),

  // Personal ID (Rodné číslo): format ######/####
  personalId: (value: string) => {
    const digits = value?.replace(/\D/g, '');
    if (digits?.length === 10) {
      return `${digits.slice(0, 6)}/${digits.slice(6)}`;
    }
    return digits;
  },

  // Date: YYYY-MM-DD
  date: (value: string) => {
    const d = new Date(value);
    return d.toISOString().split('T')[0];
  }
};
```

---

## 7. Validation Rules Configuration

### 7.1 Rule Definition

```typescript
interface ValidationRule {
  field: string;           // Field identifier
  manualPath: string;      // Path in ManualData object
  ocrPath: string;         // Path in OcrData object
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  normalizer: keyof typeof normalizers;
  condition?: (data: ManualData) => boolean;  // Optional: only apply if condition is met
}
```

### 7.2 Vehicle vs ORV Rules

| Field | Manual Path | OCR Path | Severity | Normalizer |
|-------|-------------|----------|----------|------------|
| `vin` | `vehicle.vin` | `orv.vin` | CRITICAL | `vin` |
| `spz` | `vehicle.spz` | `orv.registrationPlateNumber` | CRITICAL | `spz` |
| `majitel` | `vehicle.majitel` | `orv.keeperName` | CRITICAL | `name` |
| `znacka` | `vehicle.znacka` | `orv.make` | WARNING | `name` |
| `model` | `vehicle.model` | `orv.model` | WARNING | `name` |
| `datum_1_registrace` | `vehicle.datum_1_registrace` | `orv.firstRegistrationDate` | WARNING | `date` |

### 7.3 Vendor (FO) vs OP Rules

| Field | Manual Path | OCR Path | Severity | Condition |
|-------|-------------|----------|----------|-----------|
| `name` | `vendor.name` | `op.fullName` | CRITICAL | `vendor_type === 'PHYSICAL_PERSON'` |
| `personal_id` | `vendor.personal_id` | `op.personalNumber` | CRITICAL | `vendor_type === 'PHYSICAL_PERSON'` |
| `address_city` | `vendor.address_city` | (parsed from `op.permanentStay`) | WARNING | `vendor_type === 'PHYSICAL_PERSON'` |
| `address_postal_code` | `vendor.address_postal_code` | (parsed from `op.permanentStay`) | WARNING | `vendor_type === 'PHYSICAL_PERSON'` |

### 7.4 Rules Implementation

```typescript
const VALIDATION_RULES: ValidationRule[] = [
  // Vehicle vs ORV
  {
    field: 'vin',
    manualPath: 'vehicle.vin',
    ocrPath: 'orv.vin',
    severity: 'CRITICAL',
    normalizer: 'vin'
  },
  {
    field: 'spz',
    manualPath: 'vehicle.spz',
    ocrPath: 'orv.registrationPlateNumber',
    severity: 'CRITICAL',
    normalizer: 'spz'
  },
  {
    field: 'majitel',
    manualPath: 'vehicle.majitel',
    ocrPath: 'orv.keeperName',
    severity: 'CRITICAL',
    normalizer: 'name'
  },
  {
    field: 'znacka',
    manualPath: 'vehicle.znacka',
    ocrPath: 'orv.make',
    severity: 'WARNING',
    normalizer: 'name'
  },
  {
    field: 'model',
    manualPath: 'vehicle.model',
    ocrPath: 'orv.model',
    severity: 'WARNING',
    normalizer: 'name'
  },

  // Vendor (FO) vs OP
  {
    field: 'name',
    manualPath: 'vendor.name',
    ocrPath: 'op.fullName',
    severity: 'CRITICAL',
    normalizer: 'name',
    condition: (data) => data.vendor.vendor_type === 'PHYSICAL_PERSON'
  },
  {
    field: 'personal_id',
    manualPath: 'vendor.personal_id',
    ocrPath: 'op.personalNumber',
    severity: 'CRITICAL',
    normalizer: 'personalId',
    condition: (data) => data.vendor.vendor_type === 'PHYSICAL_PERSON'
  },
];
```

---

## 8. Comparison Engine

```typescript
function compareFields(manual: ManualData, ocr: OcrData): FieldValidation[] {
  return VALIDATION_RULES
    .filter(rule => !rule.condition || rule.condition(manual))
    .map(rule => {
      const manualValue = getNestedValue(manual, rule.manualPath);
      const ocrValue = getNestedValue(ocr, rule.ocrPath);

      const normalizedManual = normalizers[rule.normalizer](manualValue);
      const normalizedOcr = normalizers[rule.normalizer](ocrValue);

      let result: 'MATCH' | 'MISMATCH' | 'MISSING';

      if (normalizedOcr === null || normalizedOcr === undefined || normalizedOcr === '') {
        result = 'MISSING';
      } else if (normalizedManual === normalizedOcr) {
        result = 'MATCH';
      } else {
        result = 'MISMATCH';
      }

      return {
        field: rule.field,
        manual_value: manualValue,
        ocr_value: ocrValue,
        normalized_manual: normalizedManual,
        normalized_ocr: normalizedOcr,
        result,
        severity: rule.severity,
        status: determineFieldStatus(result, rule.severity)
      };
    });
}

function determineFieldStatus(result: string, severity: string): 'GREEN' | 'ORANGE' | 'RED' {
  if (result === 'MATCH') return 'GREEN';
  if (result === 'MISSING') {
    return severity === 'CRITICAL' ? 'ORANGE' : 'GREEN';
  }
  // MISMATCH
  return severity === 'CRITICAL' ? 'RED' : 'ORANGE';
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

---

## 9. Cross-Validation: Owner = Vendor

Special validation rule: The person on ORV (vehicle owner) must match the vendor.

```typescript
function crossValidateOwnership(manual: ManualData, ocr: OcrData): FieldValidation {
  const orvOwner = normalizers.name(ocr.orv.keeperName);
  const vendorName = normalizers.name(manual.vendor.name);

  return {
    field: 'owner_vendor_match',
    manual_value: manual.vendor.name,
    ocr_value: ocr.orv.keeperName,
    normalized_manual: vendorName,
    normalized_ocr: orvOwner,
    result: orvOwner === vendorName ? 'MATCH' : 'MISMATCH',
    severity: 'CRITICAL',
    status: orvOwner === vendorName ? 'GREEN' : 'RED',
    message: 'Vehicle owner on ORV must match the vendor'
  };
}
```

---

## 10. Validation Rules Summary Tables

### 10.1 Vehicle (Manual vs OCR_ORV)

| Field | Severity | MATCH | MISMATCH | MISSING |
|-------|----------|-------|----------|---------|
| `vin` | CRITICAL | 🟢 GREEN | 🔴 RED | 🟠 ORANGE |
| `spz` | CRITICAL | 🟢 GREEN | 🔴 RED | 🟠 ORANGE |
| `majitel` | CRITICAL | 🟢 GREEN | 🔴 RED | 🟠 ORANGE |
| `znacka` | WARNING | 🟢 GREEN | 🟠 ORANGE | 🟢 GREEN |
| `model` | WARNING | 🟢 GREEN | 🟠 ORANGE | 🟢 GREEN |
| `datum_1_registrace` | WARNING | 🟢 GREEN | 🟠 ORANGE | 🟢 GREEN |

### 10.2 Vendor FO (Manual vs OCR_OP)

| Field | Severity | MATCH | MISMATCH | MISSING |
|-------|----------|-------|----------|---------|
| `name` | CRITICAL | 🟢 GREEN | 🔴 RED | 🟠 ORANGE |
| `personal_id` (RČ) | CRITICAL | 🟢 GREEN | 🔴 RED | 🟠 ORANGE |
| `address_city` | WARNING | 🟢 GREEN | 🟠 ORANGE | 🟢 GREEN |
| `address_postal_code` | WARNING | 🟢 GREEN | 🟠 ORANGE | 🟢 GREEN |

---

## 11. Example Output

```json
{
  "buying_opportunity_id": "uuid-123",
  "overall_status": "RED",
  "field_validations": [
    {
      "field": "vin",
      "manual_value": "YV1PZA3TCL1103985",
      "ocr_value": "YV1PZA3TCL1103985",
      "normalized_manual": "YV1PZA3TCL1103985",
      "normalized_ocr": "YV1PZA3TCL1103985",
      "result": "MATCH",
      "severity": "CRITICAL",
      "status": "GREEN"
    },
    {
      "field": "majitel",
      "manual_value": "Jan Novák",
      "ocr_value": "OSIT S.R.O.",
      "normalized_manual": "JAN NOVÁK",
      "normalized_ocr": "OSIT S.R.O.",
      "result": "MISMATCH",
      "severity": "CRITICAL",
      "status": "RED"
    },
    {
      "field": "model",
      "manual_value": "V90",
      "ocr_value": null,
      "normalized_manual": "V90",
      "normalized_ocr": null,
      "result": "MISSING",
      "severity": "WARNING",
      "status": "GREEN"
    }
  ],
  "issues": [
    {
      "field": "majitel",
      "severity": "CRITICAL",
      "message": "Vehicle owner on ORV does not match the vendor"
    }
  ]
}
```

---

## 12. Supabase Edge Functions Structure

```
supabase/
└── functions/
    ├── validation-run/
    │   ├── index.ts           # Main handler
    │   ├── rules.ts           # VALIDATION_RULES definition
    │   ├── normalizers.ts     # Normalization functions
    │   ├── comparator.ts      # compareFields, evaluateStatus
    │   └── types.ts           # TypeScript interfaces
    │
    ├── ocr-extract/           # Calls Mistral API
    │   ├── index.ts
    │   └── mistral-client.ts
    │
    ├── ares-lookup/           # Calls ARES API (instant lookup)
    │   ├── index.ts
    │   └── ares-client.ts
    │
    └── ares-validate/         # ARES/ADIS validation for companies
        ├── index.ts
        ├── ares-client.ts
        └── adis-client.ts
```

---

## 13. Database Schema Reference

See `IMPLEMENTATION_PLAN.md` Section 4 for complete SQL schema including:
- `buying_opportunities` - Main entity
- `vehicles` - Vehicle data (manual input)
- `vendors` - Vendor data (manual input)
- `ocr_extractions` - OCR extraction results
- `validation_results` - Validation results with JSONB field_validations
- `ares_validations` - ARES/ADIS validation for companies

---

## 14. Related Documents

- `IMPLEMENTATION_PLAN.md` - Full MVP implementation plan
- `ARES_VALIDATION_SCOPE.md` - ARES/ADIS validation specification
- `VALIDATION_SCHEMA.ts` - TypeScript schema definitions

---

**Document Author**: Claude AI
**Approved by**: Jakub Strouhal
