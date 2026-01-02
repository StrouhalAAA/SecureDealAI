# Vehicle Data Model - MVP Scope

> **Purpose**: Define the complete vehicle data structure with OCR field mappings
> **Document**: ORV (Osvědčení o registraci vozidla - Malý technický průkaz)

---

## 1. Vehicle Entity Definition

### 1.1 Database Table: `vehicles`

```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id),

  -- Primary Identifiers (CRITICAL - must match)
  spz VARCHAR(20) NOT NULL,                -- Registrační značka
  vin VARCHAR(17),                          -- Vehicle Identification Number

  -- Basic Vehicle Info
  znacka VARCHAR(100),                      -- Značka (Brand)
  model VARCHAR(100),                       -- Model
  rok_vyroby INTEGER,                       -- Rok výroby
  datum_1_registrace DATE,                  -- Datum první registrace

  -- Ownership
  majitel VARCHAR(200),                     -- Vlastník/Provozovatel

  -- Technical Specs
  motor VARCHAR(50),                        -- Motor type
  vykon_kw DECIMAL(10,2),                   -- Výkon v kW
  palivo VARCHAR(20),                       -- Typ paliva
  objem_motoru INTEGER,                     -- Objem motoru cm³
  pocet_mist INTEGER,                       -- Počet míst k sezení

  -- Metadata
  data_source VARCHAR(20) DEFAULT 'MANUAL',
  validation_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(buying_opportunity_id)
);
```

### 1.2 Field Details

| Field | Type | Required | Description | Source |
|-------|------|----------|-------------|--------|
| `id` | UUID | Yes | Primary key | Auto-generated |
| `buying_opportunity_id` | UUID | Yes | Foreign key | System |
| `spz` | string(20) | Yes | Registrační značka (licence plate) | Manual + OCR |
| `vin` | string(17) | No | VIN code | Manual + OCR |
| `znacka` | string(100) | No | Brand (VOLVO, BMW, etc.) | Manual + OCR |
| `model` | string(100) | No | Model name | Manual + OCR |
| `rok_vyroby` | integer | No | Manufacturing year | Manual only |
| `datum_1_registrace` | date | No | First registration date | Manual + OCR |
| `majitel` | string(200) | No | Owner/Operator name | Manual + OCR |
| `motor` | string(50) | No | Engine type | Manual only |
| `vykon_kw` | decimal | No | Power in kW | Manual + OCR |
| `palivo` | string(20) | No | Fuel type | OCR only |
| `objem_motoru` | integer | No | Engine displacement cm³ | OCR only |
| `pocet_mist` | integer | No | Seating capacity | OCR only |

---

## 2. OCR Field Mapping (ORV Document)

### 2.1 Mapping Table: Manual → OCR

| Manual Field | OCR Field | Transform | Match Type |
|--------------|-----------|-----------|------------|
| `spz` | `registrationPlateNumber` | REMOVE_SPACES | EXACT |
| `vin` | `vin` | REMOVE_SPACES, UPPERCASE | EXACT |
| `znacka` | `make` | UPPERCASE | FUZZY 80% |
| `model` | `model` | UPPERCASE | FUZZY 70% |
| `datum_1_registrace` | `firstRegistrationDate` | DATE_NORMALIZE | EXACT |
| `majitel` | `keeperName` OR `ownerName` | UPPERCASE | EXACT |
| `vykon_kw` | `maxPower` | EXTRACT_NUMBER | WARNING |
| `palivo` | `fuelType` | FUEL_CODE_MAP | INFO |
| `objem_motoru` | `engineCcm` | INTEGER | INFO |
| `pocet_mist` | `seats` | INTEGER | INFO |

### 2.2 OCR Template: VEHICLE_REGISTRATION_CERTIFICATE_PART_I

```json
{
  "template_code": "VEHICLE_REGISTRATION_CERTIFICATE_PART_I",
  "document_type": "ORV",
  "version": "1.0",
  "country_codes": ["CZ", "SK"],
  "fields": {
    "registrationPlateNumber": {
      "type": "string",
      "normalize": ["REMOVE_SPACES", "UPPERCASE"],
      "validation": {
        "pattern": "^[A-Z0-9]+$",
        "min_length": 5,
        "max_length": 10
      }
    },
    "vin": {
      "type": "string",
      "normalize": ["REMOVE_SPACES", "UPPERCASE"],
      "validation": {
        "pattern": "^[A-HJ-NPR-Z0-9]{15,19}$",
        "min_length": 15,
        "max_length": 19
      }
    },
    "firstRegistrationDate": {
      "type": "date",
      "format": "YYYY-MM-DD",
      "normalize": ["DATE_NORMALIZE"]
    },
    "keeperName": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    },
    "keeperAddress": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    },
    "ownerName": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    },
    "ownerAddress": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    },
    "make": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    },
    "model": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    },
    "makeTypeVariantVersion": {
      "type": "string",
      "description": "Combined D.1, D.2, variant, version"
    },
    "fuelType": {
      "type": "string",
      "enum": ["BA", "NM", "E", "LPG", "CNG", "H", "EL", "HYBRID", "BA/LPG", "BA/CNG", "EL/BA", "EL/NM"]
    },
    "engineCcm": {
      "type": "integer",
      "description": "Engine displacement in cm³"
    },
    "maxPower": {
      "type": "string",
      "description": "Format: kW/rpm (e.g., 228/5700)"
    },
    "seats": {
      "type": "integer"
    },
    "maxSpeed": {
      "type": "integer",
      "description": "Maximum speed in km/h"
    }
  }
}
```

---

## 3. Sample Data

### 3.1 Manual Input Example

```json
{
  "spz": "5L94454",
  "vin": "YV1PZA3TCL1103985",
  "znacka": "Volvo",
  "model": "V90 Cross Country",
  "rok_vyroby": 2019,
  "datum_1_registrace": "2019-08-15",
  "majitel": "OSIT s.r.o.",
  "motor": "B4204T29",
  "vykon_kw": 228.0
}
```

### 3.2 OCR Extraction Result (from ORV)

```json
{
  "registrationPlateNumber": "5L94454",
  "vin": "YV1PZA3TCL1103985",
  "firstRegistrationDate": "2019-08-15",
  "keeperName": "OSIT S.R.O.",
  "keeperAddress": "MRŠTÍKOVA 399/2A, LIBEREC III-JEŘÁB, 460 07",
  "ownerName": null,
  "ownerAddress": null,
  "make": "VOLVO",
  "model": "V90 CROSS COUNTRY",
  "makeTypeVariantVersion": "P, PZA3, PZA3TC0",
  "fuelType": "BA",
  "engineCcm": 1969,
  "maxPower": "228/5700",
  "seats": 5,
  "maxSpeed": 230
}
```

### 3.3 Validation Result

```json
{
  "field_validations": [
    {
      "field": "spz",
      "manual": "5L94454",
      "ocr": "5L94454",
      "match_type": "EXACT",
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "vin",
      "manual": "YV1PZA3TCL1103985",
      "ocr": "YV1PZA3TCL1103985",
      "match_type": "EXACT",
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "znacka",
      "manual": "Volvo",
      "manual_normalized": "VOLVO",
      "ocr": "VOLVO",
      "match_type": "FUZZY",
      "similarity": 1.0,
      "threshold": 0.8,
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "model",
      "manual": "V90 Cross Country",
      "manual_normalized": "V90 CROSS COUNTRY",
      "ocr": "V90 CROSS COUNTRY",
      "match_type": "FUZZY",
      "similarity": 1.0,
      "threshold": 0.7,
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "majitel",
      "manual": "OSIT s.r.o.",
      "manual_normalized": "OSIT S.R.O.",
      "ocr": "OSIT S.R.O.",
      "match_type": "EXACT",
      "result": "MATCH",
      "status": "GREEN"
    }
  ],
  "overall_status": "GREEN"
}
```

---

## 4. Transformation Rules

### 4.1 REMOVE_SPACES
```typescript
function removeSpaces(value: string): string {
  return value.replace(/\s+/g, '');
}
// "5L9 4454" → "5L94454"
```

### 4.2 DATE_NORMALIZE
```typescript
function normalizeDate(value: string): string {
  // Accepts: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
  // Returns: YYYY-MM-DD
  const patterns = [
    /^(\d{2})\.(\d{2})\.(\d{4})$/,  // DD.MM.YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/     // YYYY-MM-DD
  ];
  // ... normalize to YYYY-MM-DD
}
```

### 4.3 EXTRACT_NUMBER
```typescript
function extractNumber(value: string): number | null {
  // "228/5700" → 228
  // "228 kW" → 228
  const match = value.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}
```

### 4.4 FUEL_CODE_MAP
```typescript
const FUEL_CODE_MAP = {
  'BA': 'Benzin',
  'NM': 'Nafta',
  'EL': 'Elektro',
  'LPG': 'LPG',
  'CNG': 'CNG',
  'HYBRID': 'Hybrid',
  'H': 'Vodík'
};
```

---

## 5. Validation Rules for Vehicle

### 5.1 CRITICAL (Blocks on mismatch → RED)

| Field | Rule | Description |
|-------|------|-------------|
| `vin` | EXACT after REMOVE_SPACES, UPPERCASE | VIN must match exactly |
| `spz` | EXACT after REMOVE_SPACES | Registration plate must match |
| `majitel` | EXACT after UPPERCASE, TRIM | Owner name must match |

### 5.2 WARNING (Manual review → ORANGE)

| Field | Rule | Threshold | Description |
|-------|------|-----------|-------------|
| `znacka` | FUZZY Levenshtein | 80% | Brand should match closely |
| `model` | FUZZY Levenshtein | 70% | Model should match closely |
| `datum_1_registrace` | EXACT | 100% | Date should match |
| `vykon_kw` | TOLERANCE | ±5% | Power should be close |

### 5.3 INFO (No validation impact → logged only)

| Field | Description |
|-------|-------------|
| `palivo` | Fuel type from OCR only |
| `objem_motoru` | Engine capacity from OCR only |
| `pocet_mist` | Seat count from OCR only |
| `rok_vyroby` | Manufacturing year (manual only) |

---

## 6. ORV Document Structure Reference

### Front Side (Přední strana)
```
┌─────────────────────────────────────────────────────┐
│  EVROPSKÉ SPOLEČENSTVÍ                               │
│  OSVĚDČENÍ O REGISTRACI VOZIDLA. ČÁST I.            │
│                                                      │
│  A. REGISTRAČNÍ ZNAČKA VOZIDLA                      │
│     [5L94454]                                        │
│                                                      │
│  B. DATUM PRVNÍ REGISTRACE VOZIDLA                  │
│     [15.08.2019]                                     │
│                                                      │
│  C.1.1. a C.1.2. PROVOZOVATEL                       │
│     [OSIT S.R.O.]                                   │
│                                                      │
│  C.1.3. ADRESA POBYTU / SÍDLO                       │
│     [MRŠTÍKOVA 399/2A]                              │
│     [LIBEREC, LIBEREC III-JEŘÁB, 460 07]            │
│                                                      │
│  Č. OSVĚDČENÍ: [UAY 257818]                         │
└─────────────────────────────────────────────────────┘
```

### Back Side (Zadní strana)
```
┌─────────────────────────────────────────────────────┐
│  D.1. TOVÁRNÍ ZNAČKA, D.2. TYP, VARIANTA, VERZE    │
│     [VOLVO, P, PZA3, PZA3TC0]                       │
│                                                      │
│  D.3. OBCHODNÍ OZNAČENÍ                             │
│     [V90 CROSS COUNTRY]                             │
│                                                      │
│  E. IDENTIFIKAČNÍ ČÍSLO VOZIDLA (VIN)              │
│     [YV1PZA3TCL1103985]                             │
│                                                      │
│  1. DRUH VOZIDLA                                    │
│     [OSOBNÍ AUTOMOBIL]                              │
│                                                      │
│  P.1. ZDVIHOVÝ OBJEM [cm³]: [1 969.0]              │
│  P.3. PALIVO: [BA]                                  │
│  P.2. MAX. VÝKON [kW] / OT. [min⁻¹]: [228/5 700]   │
│  S.1. POČET MÍST K SEZENÍ: [5]                     │
│  T. NEJVYŠŠÍ RYCHLOST [km.h⁻¹]: [230]              │
│  R. BARVA: [MODRÁ]                                  │
└─────────────────────────────────────────────────────┘
```

---

## Appendix: VIN Validation

```typescript
function validateVIN(vin: string): boolean {
  // Remove spaces and uppercase
  const normalizedVIN = vin.replace(/\s+/g, '').toUpperCase();

  // Check length (15-19 chars for ORV, exactly 17 for full validation)
  if (normalizedVIN.length < 15 || normalizedVIN.length > 19) {
    return false;
  }

  // Check for invalid characters (I, O, Q not allowed)
  if (/[IOQ]/.test(normalizedVIN)) {
    return false;
  }

  // Check alphanumeric only
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(normalizedVIN)) {
    return false;
  }

  return true;
}
```
