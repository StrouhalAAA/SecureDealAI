# Vendor Data Model - MVP Scope

> **Purpose**: Define the complete vendor/seller data structure with OCR field mappings
> **Document**: OP (Občanský průkaz - Personal ID Card)
> **Last Update**: 2025-12-30 - ARES Validation added to MVP

---

## 1. Vendor Entity Definition

### 1.1 Database Table: `vendors`

```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id),

  -- Vendor Type (CRITICAL)
  vendor_type VARCHAR(20) NOT NULL CHECK (vendor_type IN ('PHYSICAL_PERSON', 'COMPANY')),

  -- Name (CRITICAL)
  name VARCHAR(200) NOT NULL,

  -- Physical Person (FO) specific
  personal_id VARCHAR(15),           -- Rodné číslo (######/####)
  date_of_birth DATE,                -- Datum narození
  place_of_birth VARCHAR(100),       -- Místo narození

  -- Company (PO) specific - ROZŠÍŘENO
  company_id VARCHAR(15),            -- IČO (8 digits)
  vat_id VARCHAR(15),                -- DIČ (CZxxxxxxxx) ← NOVÉ

  -- Address
  address_street VARCHAR(200),       -- Ulice a číslo
  address_city VARCHAR(100),         -- Město
  address_postal_code VARCHAR(10),   -- PSČ
  country_code VARCHAR(2) DEFAULT 'CZ',

  -- Contact
  phone VARCHAR(20),
  email VARCHAR(100),
  bank_account VARCHAR(50),

  -- Document Info (from OP)
  document_number VARCHAR(20),       -- Číslo OP
  document_issue_date DATE,          -- Datum vydání
  document_expiry_date DATE,         -- Platnost do
  issuing_authority VARCHAR(100),    -- Vydávající úřad

  -- Metadata
  data_source VARCHAR(20) DEFAULT 'MANUAL',
  validation_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(buying_opportunity_id)
);
```

### 1.2 Field Details by Vendor Type

#### Physical Person (Fyzická osoba - FO)

| Field | Type | Required | Description | Source |
|-------|------|----------|-------------|--------|
| `vendor_type` | enum | Yes | = 'PHYSICAL_PERSON' | Manual |
| `name` | string | Yes | Jméno + Příjmení | Manual + OCR |
| `personal_id` | string | Yes | Rodné číslo | Manual + OCR |
| `date_of_birth` | date | No | Datum narození | OCR |
| `place_of_birth` | string | No | Místo narození | OCR |
| `address_street` | string | No | Ulice + číslo | Manual + OCR |
| `address_city` | string | No | Město | Manual + OCR |
| `address_postal_code` | string | No | PSČ | Manual + OCR |
| `phone` | string | No | Telefon | Manual |
| `email` | string | No | Email | Manual |
| `bank_account` | string | No | Bankovní účet | Manual |

#### Company (Právnická osoba - PO)

| Field | Type | Required | Description | Source |
|-------|------|----------|-------------|--------|
| `vendor_type` | enum | Yes | = 'COMPANY' | Manual |
| `name` | string | Yes | Název firmy | Manual |
| `company_id` | string | Yes | IČO (8 digits) | Manual |
| `vat_id` | string | No | **DIČ (CZxxxxxxxx)** | Manual | ← **NOVÉ**
| `address_street` | string | No | Ulice + číslo | Manual |
| `address_city` | string | No | Město | Manual |
| `address_postal_code` | string | No | PSČ | Manual |
| `phone` | string | No | Telefon | Manual |
| `email` | string | No | Email | Manual |
| `bank_account` | string | No | Bankovní účet | Manual |

> **Note**: For Companies (PO), OCR extraction is NOT available.
> **ARES/ADIS validace** je součástí MVP - viz `ARES_VALIDATION_SCOPE.md`.
> **DIČ validation**: Format CZxxxxxxxx where xxxxxxxx matches IČO for standard CZ companies.

---

## 2. OCR Field Mapping (OP Document)

### 2.1 Mapping Table: Manual → OCR (Physical Person only)

| Manual Field | OCR Field | Transform | Match Type |
|--------------|-----------|-----------|------------|
| `name` | `firstName` + `lastName` | CONCAT, UPPERCASE | EXACT |
| `personal_id` | `personalNumber` | FORMAT_RC | EXACT |
| `date_of_birth` | `dateOfBirth` | DATE_NORMALIZE | INFO |
| `place_of_birth` | `placeOfBirth` | UPPERCASE | INFO |
| `address_*` | `permanentStay` | ADDRESS_PARSE | FUZZY |
| `document_number` | `documentNumber` | - | INFO |
| `document_issue_date` | `dateOfIssue` | DATE_NORMALIZE | INFO |
| `document_expiry_date` | `dateOfExpiry` | DATE_NORMALIZE | INFO |
| `issuing_authority` | `issuingAuthority` | UPPERCASE | INFO |

### 2.2 OCR Template: PERSONAL_ID

```json
{
  "template_code": "PERSONAL_ID",
  "document_type": "OP",
  "version": "1.0",
  "country_codes": ["CZ"],
  "fields": {
    "firstName": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"],
      "description": "Given names"
    },
    "lastName": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"],
      "description": "Surname"
    },
    "dateOfBirth": {
      "type": "date",
      "format": "YYYY-MM-DD"
    },
    "placeOfBirth": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    },
    "nationality": {
      "type": "string",
      "normalize": ["UPPERCASE"],
      "default": "ČESKÁ REPUBLIKA"
    },
    "sex": {
      "type": "string",
      "enum": ["M", "F"]
    },
    "personalNumber": {
      "type": "string",
      "description": "Rodné číslo",
      "validation": {
        "pattern": "^\\d{6}/\\d{3,4}$"
      }
    },
    "permanentStay": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"],
      "description": "Full address as single string"
    },
    "documentNumber": {
      "type": "string",
      "description": "ID card number"
    },
    "dateOfIssue": {
      "type": "date",
      "format": "YYYY-MM-DD"
    },
    "dateOfExpiry": {
      "type": "date",
      "format": "YYYY-MM-DD"
    },
    "issuingAuthority": {
      "type": "string",
      "normalize": ["UPPERCASE", "TRIM"]
    }
  }
}
```

---

## 3. Sample Data

### 3.1 Manual Input Example (Physical Person)

```json
{
  "vendor_type": "PHYSICAL_PERSON",
  "name": "Petr Kusko",
  "personal_id": "800415/2585",
  "address_street": "Za Humny 420",
  "address_city": "Mníšek",
  "address_postal_code": "46341",
  "country_code": "CZ",
  "phone": "777123456",
  "email": "petr.kusko@email.cz",
  "bank_account": "123456789/0800"
}
```

### 3.2 OCR Extraction Result (from OP)

```json
{
  "firstName": "PETR",
  "lastName": "KUSKO",
  "dateOfBirth": "1980-04-15",
  "placeOfBirth": "LIBEREC, OKR. LIBEREC",
  "nationality": "ČESKÁ REPUBLIKA",
  "sex": "M",
  "personalNumber": "800415/2585",
  "permanentStay": "MNÍŠEK, MNÍŠEK ZA HUMNY Č.P. 420, OKR. LIBEREC",
  "documentNumber": "217215163",
  "dateOfIssue": "2024-05-22",
  "dateOfExpiry": "2034-05-22",
  "issuingAuthority": "MAGISTRÁT MĚSTA LIBEREC"
}
```

### 3.3 Validation Result

```json
{
  "field_validations": [
    {
      "field": "name",
      "manual": "Petr Kusko",
      "manual_normalized": "PETR KUSKO",
      "ocr_combined": "PETR KUSKO",
      "match_type": "EXACT",
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "personal_id",
      "manual": "800415/2585",
      "ocr": "800415/2585",
      "match_type": "EXACT",
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "address_street",
      "manual": "Za Humny 420",
      "manual_normalized": "ZA HUMNY 420",
      "ocr_parsed": "MNÍŠEK ZA HUMNY Č.P. 420",
      "match_type": "FUZZY",
      "similarity": 0.58,
      "threshold": 0.60,
      "result": "MISMATCH",
      "status": "ORANGE"
    },
    {
      "field": "address_city",
      "manual": "Mníšek",
      "manual_normalized": "MNÍŠEK",
      "ocr_parsed": "MNÍŠEK",
      "match_type": "FUZZY",
      "similarity": 1.0,
      "threshold": 0.80,
      "result": "MATCH",
      "status": "GREEN"
    }
  ],
  "overall_status": "ORANGE",
  "issues": [
    {
      "field": "address_street",
      "severity": "WARNING",
      "message": "Adresa ulice se neshoduje (58% vs 60% prah)"
    }
  ]
}
```

### 3.4 Manual Input Example (Company)

```json
{
  "vendor_type": "COMPANY",
  "name": "OSIT s.r.o.",
  "company_id": "25026534",
  "vat_id": "CZ25026534",            // ← NOVÉ: DIČ
  "address_street": "Mrštíkova 399/2A",
  "address_city": "Liberec",
  "address_postal_code": "46007",
  "country_code": "CZ",
  "phone": "485123456",
  "email": "info@osit.cz",
  "bank_account": "987654321/0100"
}
```

> **Note**: Company validation is manual-only in MVP. No OCR extraction for companies.
> **DIČ format**: For Czech companies, DIČ = "CZ" + IČO (e.g., IČO 25026534 → DIČ CZ25026534)

---

## 4. Transformation Rules

### 4.1 NAME_CONCAT
```typescript
function concatName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.toUpperCase();
}
// "PETR", "KUSKO" → "PETR KUSKO"
```

### 4.2 FORMAT_RC (Rodné číslo)
```typescript
function formatRC(value: string): string {
  // Normalize to ######/#### format
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9) {
    return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  } else if (digits.length === 10) {
    return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  }
  return value; // Return as-is if invalid
}
// "8004152585" → "800415/2585"
// "800415/2585" → "800415/2585"
```

### 4.3 ADDRESS_PARSE
```typescript
interface ParsedAddress {
  street: string | null;
  city: string | null;
  postalCode: string | null;
  district: string | null;
}

function parseAddressFromOP(permanentStay: string): ParsedAddress {
  // Input: "MNÍŠEK, MNÍŠEK ZA HUMNY Č.P. 420, OKR. LIBEREC"
  //
  // Typical patterns:
  // - CITY, STREET Č.P. NUMBER, OKR. DISTRICT
  // - STREET NUMBER, CITY PSČ

  const parts = permanentStay.split(',').map(p => p.trim());

  // Try to extract postal code (5 digits)
  const pscMatch = permanentStay.match(/\d{3}\s?\d{2}/);
  const postalCode = pscMatch ? pscMatch[0].replace(/\s/g, '') : null;

  // Extract street with number
  const streetMatch = permanentStay.match(/([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]+)\s*(?:Č\.?P\.?|Č\.)\s*(\d+)/i);
  const street = streetMatch ? `${streetMatch[1].trim()} ${streetMatch[2]}` : null;

  // First part is usually city
  const city = parts[0] || null;

  return { street, city, postalCode, district: null };
}
```

### 4.4 VALIDATE_RC (Rodné číslo validation)
```typescript
function validateRC(rc: string): boolean {
  const digits = rc.replace(/\D/g, '');

  // Must be 9 or 10 digits
  if (digits.length !== 9 && digits.length !== 10) {
    return false;
  }

  // Check date part (first 6 digits = YYMMDD)
  const year = parseInt(digits.slice(0, 2));
  let month = parseInt(digits.slice(2, 4));
  const day = parseInt(digits.slice(4, 6));

  // Women have month + 50
  if (month > 50) month -= 50;
  // After 2004, can add 20 to month if numbers exhausted
  if (month > 20) month -= 20;

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // For 10-digit RC (after 1954), check modulo 11
  if (digits.length === 10) {
    const num = parseInt(digits);
    if (num % 11 !== 0) return false;
  }

  return true;
}
```

---

## 5. Validation Rules for Vendor

### 5.1 CRITICAL (Blocks on mismatch → RED)

| Field | Vendor Type | Rule | Description |
|-------|-------------|------|-------------|
| `name` | FO | EXACT after NAME_CONCAT, UPPERCASE | Full name must match |
| `personal_id` | FO | EXACT after FORMAT_RC | Rodné číslo must match |
| `name` | PO | - | Manual only (no OCR) |
| `company_id` | PO | - | Manual only (ARES Phase 2) |

### 5.2 WARNING (Manual review → ORANGE)

| Field | Vendor Type | Rule | Threshold | Description |
|-------|-------------|------|-----------|-------------|
| `address_street` | FO | FUZZY Levenshtein | 60% | Street address should match |
| `address_city` | FO | FUZZY Levenshtein | 80% | City should match |
| `address_postal_code` | FO | EXACT | 100% | Postal code should match |

### 5.3 INFO (No validation impact → logged only)

| Field | Description |
|-------|-------------|
| `date_of_birth` | Birth date from OP |
| `place_of_birth` | Birth place from OP |
| `document_number` | OP document number |
| `document_issue_date` | OP issue date |
| `document_expiry_date` | OP expiry date |
| `issuing_authority` | OP issuing authority |
| `phone`, `email`, `bank_account` | Contact info (manual only) |

---

## 6. Cross-Validation: Vehicle ↔ Vendor

### Rule XV-001: Owner = Vendor

```typescript
function validateOwnerIsVendor(
  vehicleOwner: string,
  vendorName: string
): ValidationResult {
  const normalizedOwner = vehicleOwner.toUpperCase().trim();
  const normalizedVendor = vendorName.toUpperCase().trim();

  // Exact match check
  if (normalizedOwner === normalizedVendor) {
    return { status: 'GREEN', match: true };
  }

  // Fuzzy match (for minor differences)
  const similarity = levenshteinSimilarity(normalizedOwner, normalizedVendor);
  if (similarity >= 0.95) {
    return { status: 'GREEN', match: true, similarity };
  }

  // Mismatch - CRITICAL
  return {
    status: 'RED',
    match: false,
    similarity,
    message: `Majitel vozidla (${vehicleOwner}) se neshoduje s dodavatelem (${vendorName})`
  };
}
```

---

## 7. OP Document Structure Reference

### Front Side (Přední strana)
```
┌─────────────────────────────────────────────────────┐
│  OBČANSKÝ PRŮKAZ - ČESKÁ REPUBLIKA                  │
│  IDENTITY CARD - CZECH REPUBLIC                     │
│                                                      │
│  ČÍSLO DOKLADU / DOCUMENT NO.                       │
│  [217215163]                                         │
│                                                      │
│  PŘÍJMENÍ / SURNAME                                 │
│  [KUSKO]                                            │
│                                                      │
│  JMÉNO / GIVEN NAMES                                │
│  [PETR]                                             │
│                                                      │
│  DATUM NAROZENÍ / DATE OF BIRTH                     │
│  [15.04.1980]                                       │
│                                                      │
│  POHLAVÍ / SEX                                      │
│  [M]                                                │
│                                                      │
│  MÍSTO NAROZENÍ / PLACE OF BIRTH                    │
│  [LIBEREC, okr. LIBEREC]                            │
│                                                      │
│  STÁTNÍ OBČANSTVÍ / NATIONALITY                     │
│  [ČESKÁ REPUBLIKA]                                  │
│                                                      │
│  DATUM VYDÁNÍ / DATE OF ISSUE                       │
│  [22.05.2024]                                       │
│                                                      │
│  PLATNOST DO / DATE OF EXPIRY                       │
│  [22.05.2034]                                       │
│                                                      │
│  [PHOTO]                    [SIGNATURE]             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Back Side (Zadní strana)
```
┌─────────────────────────────────────────────────────┐
│  TRVALÝ POBYT / PERMANENT STAY                      │
│  [MNÍŠEK, MNÍŠEK]                                   │
│  [ZA HUMNY Č.P. 420]                                │
│  [okr. LIBEREC]                                     │
│                                                      │
│  RODNÉ ČÍSLO / PERSONAL NO.                         │
│  [800415/2585]                                      │
│                                                      │
│  VYDAL / AUTHORITY                                  │
│  [Magistrát města LIBEREC]                          │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  MRZ Zone:                                          │
│  IDCZE217215163<<<<<<<<<<<<<<<<<                    │
│  8004152M3405226CZE<<<<<<<<<<<<<<2                  │
│  KUSKO<<PETR<<<<<<<<<<<<<<<<<<<<<<<2                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 8. ARES/ADIS Validation for Companies (PO) - SOUČÁST MVP

Pro firmy (Právnické osoby - PO) se používá validace přes ARES a ADIS registry.

### 8.1 Validační kontroly

| Check ID | Kontrola | API | Severity | Popis |
|----------|----------|-----|----------|-------|
| **ARES-001** | Existence firmy | ARES | RED | IČO musí existovat v registru |
| **ARES-002** | Shoda názvu | ARES | ORANGE | Název firmy by měl odpovídat |
| **ARES-003** | Shoda DIČ | ARES | RED | DIČ musí sedět s registrem |
| **ARES-004** | Stáří firmy | ARES | ORANGE | Firma < 1 rok = warning |
| **DPH-001** | Je plátce DPH | ADIS | RED | Musí být aktivní plátce |
| **DPH-002** | Nespolehlivý plátce | ADIS | **RED** | Musí být "NE" - kritická kontrola |
| **DPH-003** | Bankovní účet | ADIS | ORANGE | Warning pokud účet není registrován |

### 8.2 ARES REST API

```
GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
```

**Response fields používané pro validaci:**
- `ico` - IČO
- `obchodniJmeno` - Název firmy
- `dic` - DIČ
- `datumVzniku` - Datum založení

### 8.3 ADIS DPH Registry (Registr DPH)

**Endpoint pro nespolehlivého plátce:**
```
https://adisspr.mfcr.cz/dpr/DphReg?id=1&pocet=1&dic={DIC}
```

**Kontrolované hodnoty:**
- `statusPlatce` → musí být "AKTIVNI"
- `nespolehlivyPlatce` → musí být "NE" (jinak RED!)
- `SeznamBankovnichUctu` → porovnání s zadaným účtem

### 8.4 Fallback při nedostupnosti

| Situace | Status | Akce |
|---------|--------|------|
| ARES nedostupný | ORANGE | Manuální review požadován |
| ADIS nedostupný | ORANGE | Manuální kontrola nespolehlivosti |
| Rate limit | ORANGE | Retry later |

### 8.5 Příklad validačního výstupu pro firmu

```json
{
  "vendor_type": "COMPANY",
  "ico": "26835746",
  "dic": "CZ26835746",
  "bank_account": "123456789/0800",
  "ares_validations": [
    {
      "check_id": "ARES-001",
      "check_name": "Existence firmy",
      "status": "GREEN",
      "message": "Firma AURES Holdings, a.s. nalezena v ARES"
    },
    {
      "check_id": "DPH-002",
      "check_name": "Nespolehlivý plátce",
      "status": "GREEN",
      "message": "Údaje o nespolehlivém plátci DPH: NE"
    },
    {
      "check_id": "DPH-003",
      "check_name": "Bankovní účet",
      "status": "ORANGE",
      "message": "Účet 123456789/0800 není v seznamu registrovaných účtů"
    }
  ],
  "overall_status": "ORANGE"
}
```

**Detailní specifikace**: Viz `MVPScope/ARES_VALIDATION_SCOPE.md`

---

## Appendix: Levenshtein Similarity

```typescript
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  return 1 - levenshteinDistance(a, b) / maxLength;
}
```
