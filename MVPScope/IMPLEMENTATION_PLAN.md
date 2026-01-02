# SecureDealAI MVP - Implementation Plan

> **Version**: 2.3
> **Last Updated**: 2026-01-02 - Added VendorType & BuyingType rule filtering
> **Status**: ✅ APPROVED - ACBS-Aligned Architecture with ARES + Instant Validation

---

## 1. Executive Summary

Tento dokument definuje implementacni plan pro MVP SecureDealAI - standalone webovou aplikaci pro automatizaci validace vozidel a dodavatelu v nakupnim procesu.

### Klicove cile MVP:
1. **Manualni zadani dat** - 2-krokovy formular (vozidlo + dodavatel)
2. **OCR extrakce** - z ORV (maly technicky prukaz) a OP (obcansky prukaz)
3. **Automaticka validace** - porovnani manualnich vs OCR dat
4. **ARES/ADIS validace** - ověření firem (IČO, DIČ, nespolehlivý plátce DPH) + **okamžitý auto-fill z ARES při zadání IČO**
5. **Vizualizace vysledku** - GREEN/ORANGE/RED status

### Co NENi soucasti MVP:
- Name Intelligence agent
- Document Authenticity agent
- Integrace s externimi systemy (Cebia, Business Central)
- Velky technicky prukaz (TP) - pouze ORV

### 1.1 Rule Applicability Filters (VendorType & BuyingType)

Validation rules are filtered by two primary variables:

| Variable | Values | Description |
|----------|--------|-------------|
| **VendorType** | `PHYSICAL_PERSON` (FO), `COMPANY` (PO) | Type of vendor/seller |
| **BuyingType** | `BRANCH` (MVP), `MOBILE_BUYING` (Phase 2) | Purchase channel |

**Usage in Rules:**
- Rules define `metadata.applicableTo[]` for VendorType filtering
- Rules define `metadata.applicableToBuyingType[]` for BuyingType filtering
- Rules without these filters apply universally
- MVP defaults to `BRANCH` buying type

**Examples:**
- `VND-001` (Name Match): applies only to `PHYSICAL_PERSON`
- `ARES-001` (Company Existence): applies only to `COMPANY`
- All MVP rules: apply to `BRANCH` buying type

See `DB_SCHEMA_DYNAMIC_RULES.sql` for the `get_active_validation_rules_filtered()` function.

---

## 2. Scope Definition - Part 1: Car/Vehicle Data

### 2.1 Datova struktura vozidla (Vehicle)

Na zaklade analyzy PDF dokumentu (VTP, ORV) a OCR field mappings definujeme nasledujici strukturu:

| Pole | Typ | Zdroj | OCR Template | Validace |
|------|-----|-------|--------------|----------|
| `spz` | string | Manual + ORV | `registrationPlateNumber` | EXACT |
| `vin` | string (17 znaku) | Manual + ORV | `vin` | EXACT |
| `znacka` | string | Manual + ORV | `make` | FUZZY 80% |
| `model` | string | Manual + ORV | `model` | FUZZY 70% |
| `rok_vyroby` | integer | Manual | - | INFO |
| `datum_1_registrace` | date | Manual + ORV | `firstRegistrationDate` | EXACT |
| `majitel` | string | Manual + ORV | `keeperName` / `ownerName` | EXACT |
| `motor` | string | Manual | - | INFO |
| `vykon_kw` | decimal | Manual | `maxPower` | WARNING |

### 2.2 Mapovani OCR poli z ORV (VEHICLE_REGISTRATION_CERTIFICATE_PART_I)

```
Predni strana ORV:
- registrationPlateNumber → spz (bez mezer)
- firstRegistrationDate → datum_1_registrace (YYYY-MM-DD)
- keeperName → majitel (provozovatel)
- keeperAddress → adresa_majitele

Zadni strana ORV:
- vin → vin (15-19 znaku, bez mezer)
- make → znacka
- model → model
- makeTypeVariantVersion → typ_varianta_verze
- fuelType → palivo
- engineCcm → objem_motoru
- maxPower → vykon_kw
- seats → pocet_mist
```

### 2.3 Priklad extrakce z realneho ORV

Na zaklade vzoroveho dokumentu `5L94454_ORV.pdf`:

```json
{
  "registrationPlateNumber": "5L94454",
  "firstRegistrationDate": "2019-08-15",
  "keeperName": "OSIT S.R.O.",
  "keeperAddress": "MRŠTÍKOVA 399/2A, LIBEREC III-JEŘÁB, 460 07",
  "vin": "YV1PZA3TCL1103985",
  "make": "VOLVO",
  "model": "V90 CROSS COUNTRY",
  "makeTypeVariantVersion": "P, PZA3, PZA3TC0",
  "fuelType": "BA",
  "engineCcm": 1969,
  "maxPower": "228/5700",
  "seats": 5
}
```

---

## 3. Scope Definition - Part 2: Vendor Data

### 3.1 Datova struktura dodavatele (Vendor)

Na zaklade BC metadata a OCR field mappings:

| Pole | Typ | FO | PO | OCR (OP) | Validace |
|------|-----|----|----|----------|----------|
| `vendor_type` | enum | ✓ | ✓ | - | REQUIRED |
| `name` | string | ✓ | ✓ | `firstName` + `lastName` | EXACT |
| `personal_id` | string | ✓ | - | `personalNumber` | EXACT |
| `company_id` | string | - | ✓ | - | **ARES validace (MVP)** |
| `vat_id` | string | - | ✓ | - | **ARES/ADIS validace (MVP)** |
| `address_street` | string | ✓ | ✓ | `permanentStay` (part) | FUZZY 60% |
| `address_city` | string | ✓ | ✓ | `permanentStay` (part) | FUZZY 80% |
| `address_postal_code` | string | ✓ | ✓ | `permanentStay` (part) | EXACT |
| `country_code` | string | ✓ | ✓ | `nationality` | INFO |
| `phone` | string | ✓ | ✓ | - | INFO |
| `email` | string | ✓ | ✓ | - | INFO |
| `bank_account` | string | ✓ | ✓ | - | INFO |

### 3.2 Mapovani OCR poli z OP (PERSONAL_ID)

```
Predni strana OP:
- firstName → jmeno (UPPERCASE)
- lastName → prijmeni (UPPERCASE)
- dateOfBirth → datum_narozeni (YYYY-MM-DD)
- placeOfBirth → misto_narozeni
- nationality → statni_obcanstvi
- sex → pohlavi (M/F)
- documentNumber → cislo_dokladu
- dateOfIssue → datum_vydani
- dateOfExpiry → platnost_do

Zadni strana OP:
- personalNumber → rodne_cislo (######/####)
- permanentStay → trvaly_pobyt
- issuingAuthority → vydavajici_urad
```

### 3.3 Priklad extrakce z realneho OP

Na zaklade vzoroveho dokumentu `5L94454_OP_Kusko.pdf`:

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

---

## 4. Database Schema Design

### 4.1 Entity Relationship Diagram

```
┌─────────────────────────┐
│  buying_opportunities   │
│─────────────────────────│
│  id (PK)                │
│  spz (UK)               │
│  status                 │
│  created_at             │
│  updated_at             │
└───────────┬─────────────┘
            │
            │ 1:1
            ▼
┌─────────────────────────┐
│       vehicles          │
│─────────────────────────│
│  id (PK)                │
│  buying_opportunity_id  │──── FK
│  spz                    │
│  vin                    │
│  znacka                 │
│  model                  │
│  rok_vyroby             │
│  datum_1_registrace     │
│  majitel                │
│  motor                  │
│  vykon_kw               │
│  data_source            │
│  validation_status      │
│  created_at             │
└─────────────────────────┘

┌─────────────────────────┐
│       vendors           │
│─────────────────────────│
│  id (PK)                │
│  buying_opportunity_id  │──── FK
│  vendor_type            │
│  name                   │
│  personal_id            │
│  company_id             │
│  address_street         │
│  address_city           │
│  address_postal_code    │
│  country_code           │
│  phone                  │
│  email                  │
│  bank_account           │
│  data_source            │
│  validation_status      │
│  created_at             │
└─────────────────────────┘

┌─────────────────────────┐
│    ocr_extractions      │
│─────────────────────────│
│  id (PK)                │
│  buying_opportunity_id  │──── FK
│  document_type          │  (ORV, OP)
│  document_file_url      │
│  ocr_status             │
│  ocr_provider           │
│  extracted_data (JSONB) │
│  extraction_confidence  │
│  errors (JSONB)         │
│  created_at             │
│  completed_at           │
└─────────────────────────┘

┌─────────────────────────┐
│   validation_results    │
│─────────────────────────│
│  id (PK)                │
│  buying_opportunity_id  │──── FK
│  overall_status         │  (GREEN/ORANGE/RED)
│  field_validations      │  (JSONB)
│  created_at             │
└─────────────────────────┘

┌─────────────────────────┐
│   ares_validations      │  ← NOVÉ (MVP)
│─────────────────────────│
│  id (PK)                │
│  buying_opportunity_id  │──── FK
│  ico                    │
│  dic                    │
│  bank_account           │
│  ares_data (JSONB)      │
│  dph_status (JSONB)     │
│  validation_results     │  (JSONB)
│  overall_status         │  (GREEN/ORANGE/RED)
│  created_at             │
└─────────────────────────┘
```

### 4.2 SQL Schema (Supabase PostgreSQL)

```sql
-- 1. Buying Opportunities
CREATE TABLE buying_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spz VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'VALIDATED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

  -- Zakladni data
  spz VARCHAR(20) NOT NULL,
  vin VARCHAR(17),
  znacka VARCHAR(100),
  model VARCHAR(100),
  rok_vyroby INTEGER,
  datum_1_registrace DATE,
  majitel VARCHAR(200),
  motor VARCHAR(50),
  vykon_kw DECIMAL(10,2),

  -- Metadata
  data_source VARCHAR(20) DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'OCR', 'BC_IMPORT')),
  validation_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(buying_opportunity_id)
);

-- 3. Vendors (UPDATED: added vat_id for Czech companies)
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

  -- Typ
  vendor_type VARCHAR(20) NOT NULL CHECK (vendor_type IN ('PHYSICAL_PERSON', 'COMPANY')),
  name VARCHAR(200) NOT NULL,

  -- FO specificky (Fyzická osoba)
  personal_id VARCHAR(15),           -- Rodné číslo (######/####)
  date_of_birth DATE,
  place_of_birth VARCHAR(100),

  -- PO specificky (Právnická osoba) - ROZŠÍŘENO
  company_id VARCHAR(15),            -- IČO (8 digits)
  vat_id VARCHAR(15),                -- DIČ (CZxxxxxxxx) ← NOVÉ

  -- Adresa
  address_street VARCHAR(200),
  address_city VARCHAR(100),
  address_postal_code VARCHAR(10),
  country_code VARCHAR(2) DEFAULT 'CZ',

  -- Kontakt
  phone VARCHAR(20),
  email VARCHAR(100),
  bank_account VARCHAR(50),

  -- OP Document info (for FO)
  document_number VARCHAR(20),
  document_issue_date DATE,
  document_expiry_date DATE,
  issuing_authority VARCHAR(100),

  -- Metadata
  data_source VARCHAR(20) DEFAULT 'MANUAL',
  validation_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(buying_opportunity_id),

  -- Constraint: IČO nebo RČ podle typu
  CONSTRAINT vendor_id_check CHECK (
    (vendor_type = 'PHYSICAL_PERSON' AND personal_id IS NOT NULL) OR
    (vendor_type = 'COMPANY' AND company_id IS NOT NULL)
  )
);

-- 4. OCR Extractions (UPDATED: SPZ-based linking - ACBS pattern)
CREATE TABLE ocr_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SPZ propojení (ACBS pattern) místo FK
  spz VARCHAR(20) NOT NULL,

  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('ORV', 'OP', 'VTP')),
  document_file_url TEXT,

  ocr_status VARCHAR(20) DEFAULT 'PENDING' CHECK (ocr_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  ocr_provider VARCHAR(50) DEFAULT 'MISTRAL',

  extracted_data JSONB,
  extraction_confidence DECIMAL(5,2),
  errors JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index pro SPZ lookup (ACBS pattern)
CREATE INDEX idx_ocr_spz ON ocr_extractions(spz);
CREATE INDEX idx_ocr_spz_type ON ocr_extractions(spz, document_type);

-- 5. Validation Results (UPDATED: with attempt tracking for history)
CREATE TABLE validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

  -- Attempt tracking (historie všech pokusů)
  attempt_number INTEGER NOT NULL DEFAULT 1,

  overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('GREEN', 'ORANGE', 'RED')),
  field_validations JSONB NOT NULL,
  /*
  [
    { "field": "vin", "source": "vehicle_vs_orv", "manual": "...", "ocr": "...",
      "match_type": "EXACT", "result": "MATCH", "status": "GREEN" },
    ...
  ]
  */

  issues JSONB,
  /*
  [
    { "field": "address_street", "severity": "WARNING", "message": "..." }
  ]
  */

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Note: No UNIQUE constraint - allows multiple validation attempts
);

-- Index pro historii pokusů (všechny pokusy, seřazené)
CREATE INDEX idx_validation_history ON validation_results(buying_opportunity_id, attempt_number DESC);

-- 6. ARES Validations (NOVÉ - MVP)
CREATE TABLE ares_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

  -- Vstupní data
  ico VARCHAR(15) NOT NULL,
  dic VARCHAR(15),
  bank_account VARCHAR(50),

  -- ARES response cache
  ares_data JSONB,
  ares_fetched_at TIMESTAMPTZ,

  -- DPH Registry response cache
  dph_status JSONB,
  dph_bank_accounts JSONB,
  dph_fetched_at TIMESTAMPTZ,

  -- Validační výsledky
  validation_results JSONB NOT NULL,
  overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('GREEN', 'ORANGE', 'RED')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ares_buying_opp ON ares_validations(buying_opportunity_id);
CREATE INDEX idx_ares_ico ON ares_validations(ico);

-- Additional Indexes
CREATE INDEX idx_vehicles_buying_opp ON vehicles(buying_opportunity_id);
CREATE INDEX idx_vendors_buying_opp ON vendors(buying_opportunity_id);
-- Note: idx_ocr_spz and idx_validation_history created above
```

---

## 5. Validation Rules

> **Dynamic Rules System**: All validation rules are stored as JSON in PostgreSQL and loaded dynamically at runtime. See `VALIDATION_RULES_SCHEMA.json` for the JSON Schema and `VALIDATION_RULES_SEED.json` for the 31 initial rules.
>
> Rules are filtered by **VendorType** and **BuyingType** (see Section 1.1).

### 5.1 Vehicle Validation (Manual vs OCR_ORV)

| Pole | Match Type | Threshold | Severity | On Fail |
|------|------------|-----------|----------|---------|
| `vin` | EXACT | 100% | CRITICAL | RED |
| `spz` | EXACT | 100% | CRITICAL | RED |
| `majitel` | EXACT | 100% | CRITICAL | RED |
| `znacka` | FUZZY | 80% | WARNING | ORANGE |
| `model` | FUZZY | 70% | WARNING | ORANGE |
| `datum_1_registrace` | EXACT | 100% | WARNING | ORANGE |

### 5.2 Vendor Validation (Manual vs OCR_OP)

| Pole | Match Type | Threshold | Severity | On Fail |
|------|------------|-----------|----------|---------|
| `name` | EXACT | 100% | CRITICAL | RED |
| `personal_id` | EXACT | 100% | CRITICAL | RED |
| `address_street` | FUZZY | 60% | WARNING | ORANGE |
| `address_city` | FUZZY | 80% | WARNING | ORANGE |
| `address_postal_code` | EXACT | 100% | WARNING | ORANGE |

### 5.3 ARES/ADIS Validation (pro firmy - NOVÉ MVP)

| Rule ID | Kontrola | API | Severity | On Fail |
|---------|----------|-----|----------|---------|
| ARES-001 | Existence firmy | ARES | CRITICAL | RED |
| ARES-002 | Shoda názvu | ARES | WARNING | ORANGE |
| ARES-003 | Shoda DIČ | ARES | CRITICAL | RED |
| ARES-004 | Stáří firmy (< 1 rok) | ARES | WARNING | ORANGE |
| DPH-001 | Je plátce DPH | ADIS | CRITICAL | RED |
| DPH-002 | Nespolehlivý plátce | ADIS | CRITICAL | RED |
| DPH-003 | Bankovní účet registrován | ADIS | WARNING | ORANGE |

**Detailní specifikace**: Viz `MVPScope/ARES_VALIDATION_SCOPE.md`

> **Poznámka: Dvě fáze ARES validace**
>
> ARES validace probíhá ve dvou fázích:
> 1. **Okamžitá validace (STEP 2)** - při zadání IČO ve formuláři
>    - Automatický ARES lookup
>    - Auto-fill: název firmy, adresa, DIČ
>    - Základní kontrola existence firmy
>    - Vizuální feedback: ✅/⚠️/❌
> 2. **Finální validace (STEP 4)** - při spuštění kompletní validace
>    - Porovnání ARES dat s manuálně zadanými/upravenými daty
>    - Kontrola DPH spolehlivosti
>    - Kontrola bankovních účtů

### 5.4 Cross-Validation Rules

| Rule ID | Description | Source 1 | Source 2 | Severity |
|---------|-------------|----------|----------|----------|
| XV-001 | Owner = Vendor | `vehicles.majitel` | `vendors.name` | CRITICAL |

### 5.5 Status Determination Logic

```
IF any CRITICAL field fails EXACT match:
  → RED (blocked)
ELSE IF any WARNING field fails threshold:
  → ORANGE (manual review)
ELSE:
  → GREEN (approved)
```

---

## 6. OCR Template Definitions

### 6.1 Template: ORV (VEHICLE_REGISTRATION_CERTIFICATE_PART_I)

```json
{
  "template_code": "VEHICLE_REGISTRATION_CERTIFICATE_PART_I",
  "document_type": "ORV",
  "country_codes": ["CZ", "SK"],
  "fields": [
    { "name": "registrationPlateNumber", "type": "string", "normalize": "REMOVE_SPACES" },
    { "name": "vin", "type": "string", "normalize": "REMOVE_SPACES", "min_length": 15, "max_length": 19 },
    { "name": "firstRegistrationDate", "type": "date", "format": "YYYY-MM-DD" },
    { "name": "keeperName", "type": "string", "normalize": "UPPERCASE" },
    { "name": "keeperAddress", "type": "string", "normalize": "UPPERCASE" },
    { "name": "make", "type": "string" },
    { "name": "model", "type": "string" },
    { "name": "fuelType", "type": "string", "enum": ["BA", "NM", "EL", "LPG", "CNG", "HYBRID"] },
    { "name": "engineCcm", "type": "number" },
    { "name": "maxPower", "type": "string" },
    { "name": "seats", "type": "integer" }
  ]
}
```

### 6.2 Template: OP (PERSONAL_ID)

```json
{
  "template_code": "PERSONAL_ID",
  "document_type": "OP",
  "country_codes": ["CZ"],
  "fields": [
    { "name": "firstName", "type": "string", "normalize": "UPPERCASE" },
    { "name": "lastName", "type": "string", "normalize": "UPPERCASE" },
    { "name": "dateOfBirth", "type": "date", "format": "YYYY-MM-DD" },
    { "name": "placeOfBirth", "type": "string", "normalize": "UPPERCASE" },
    { "name": "nationality", "type": "string", "normalize": "UPPERCASE" },
    { "name": "sex", "type": "string", "enum": ["M", "F"] },
    { "name": "personalNumber", "type": "string", "pattern": "^\\d{6}/\\d{3,4}$" },
    { "name": "permanentStay", "type": "string", "normalize": "UPPERCASE" },
    { "name": "documentNumber", "type": "string" },
    { "name": "dateOfIssue", "type": "date", "format": "YYYY-MM-DD" },
    { "name": "dateOfExpiry", "type": "date", "format": "YYYY-MM-DD" },
    { "name": "issuingAuthority", "type": "string", "normalize": "UPPERCASE" }
  ]
}
```

---

## 7. User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER FLOW - MVP                              │
└─────────────────────────────────────────────────────────────────────┘

[START]
   │
   ▼
┌─────────────────┐
│   Dashboard     │  Seznam buying_opportunities
│   (index.vue)   │  [+ Nova nakupni prilezitost]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   STEP 1        │  Zadani SPZ → vytvoreni buying_opportunity
│   VehicleForm   │  Vyplneni: VIN, znacka, model, majitel...
│                 │  [Dalsi krok →]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   STEP 2        │  Vyber: Fyzicka osoba / Pravnicka osoba
│   VendorForm    │
│                 │  FIRMA: Zadej IČO → [🔍 ARES Lookup] → Auto-fill
│                 │         (název, adresa, DIČ automaticky)
│                 │  PRIVÁT: Vyplneni: jméno, RČ, adresa...
│                 │  [Dalsi krok →]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   STEP 3        │  Upload ORV (maly technicky prukaz)
│  DocumentUpload │  Upload OP (obcansky prukaz)
│                 │  → Automaticka OCR extrakce
│   OcrStatus     │  [Polling status: PROCESSING... COMPLETED]
│                 │  [Spustit validaci →]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   STEP 4        │  Overall status: GREEN / ORANGE / RED
│ValidationResult │  Detailni porovnani poli
│ FieldComparison │  [Zpet na dashboard]
└────────┬────────┘
         │
         ▼
      [END]
```

---

## 8. Implementation Phases

### Phase 1: Infrastructure Setup (Day 1)

**Tasks:**
- [ ] Create GitHub repository `vpm-supabase`
- [ ] Initialize Supabase project
- [ ] Run database schema migration
- [ ] Create Storage bucket for documents
- [ ] Setup Vue.js 3 + Vite project
- [ ] Configure Vercel deployment

**Deliverables:**
- Running Supabase project with empty schema
- Empty Vue.js app deployed to Vercel

### Phase 2: Backend API (Days 2-4)

**Tasks:**
- [ ] Edge Function: `buying-opportunity` CRUD
- [ ] Edge Function: `vehicle` CRUD
- [ ] Edge Function: `vendor` CRUD
- [ ] **Edge Function: `ares-lookup`** - GET /ares-lookup/{ico} (NOVÉ)
      - Volá ARES REST API pro okamžité ověření IČO
      - Vrací: název firmy, adresa, DIČ, datum založení
      - Cache: 24h TTL v Supabase
      - Error handling: timeout, firma neexistuje, API nedostupné
- [ ] Edge Function: `document-upload` + Storage integration
- [ ] Edge Function: `ocr-extract` + Mistral API integration
- [ ] Edge Function: `validation-run` + validation engine
- [ ] **Edge Function: `ares-validate`** + ARES/ADIS API integration

**Deliverables:**
- All API endpoints functional
- **ARES lookup pro okamžitý auto-fill** (viz níže)
- OCR extraction working with Mistral
- Validation logic implemented
- **ARES/ADIS validace pro firmy** (viz `ARES_VALIDATION_SCOPE.md`)

### Phase 3: Frontend (Days 5-7)

**Tasks:**
- [ ] Component: `VehicleForm.vue`
- [ ] Component: `VendorForm.vue` - **s ARES integací** (NOVÉ):
      - Po zadání IČO (8 číslic) → automatický ARES lookup
      - Loading spinner během volání API
      - Auto-fill: name, address_street, address_city, address_postal_code, vat_id
      - Zobrazení validačního statusu (✅ Ověřeno / ⚠️ Varování / ❌ Nenalezeno)
      - Možnost manuálního přepsání auto-fill dat
      - Debounce na IČO input (500ms)
- [ ] Component: `AresStatus.vue` - zobrazení stavu ARES ověření (NOVÉ)
- [ ] Component: `DocumentUpload.vue`
- [ ] Component: `OcrStatus.vue`
- [ ] Component: `ValidationResult.vue`
- [ ] Component: `FieldComparison.vue`
- [ ] Page: Dashboard (list of opportunities)
- [ ] Page: Detail with multi-step workflow

**Deliverables:**
- Complete user flow working end-to-end
- **ARES auto-fill pro firmy funkční**
- Responsive design

### Phase 4: Testing & Polish (Days 8-9)

**Tasks:**
- [ ] End-to-end testing with real documents
- [ ] Error handling improvements
- [ ] Loading states and UX polish
- [ ] Documentation update

**Deliverables:**
- Production-ready MVP
- User documentation

---

## 9. Technical Stack Summary

| Component | Technology | Notes |
|-----------|------------|-------|
| **Database** | Supabase PostgreSQL | **6 tables** with JSONB flexibility |
| **Backend** | Supabase Edge Functions (Deno/TS) | Serverless, auto-scaling |
| **Frontend** | Vue.js 3 + Vite | SPA with composition API |
| **Hosting** | Vercel | Auto-deploy from GitHub |
| **OCR** | Mistral OCR API | Direct integration |
| **ARES/ADIS** | Czech Government APIs | Company validation (NOVÉ) |
| **Storage** | Supabase Storage | Document files |
| **Auth** | Supabase Auth + AAA | Bearer token |

---

## 10. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| OCR Accuracy | > 90% | Field extraction correctness |
| Validation Time | < 30s | End-to-end processing |
| False Positive Rate | < 5% | Incorrect RED status |
| User Workflow | < 5 min | Complete 4-step flow |

---

## 11. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OCR quality issues | HIGH | MEDIUM | Manual override option |
| Mistral API downtime | MEDIUM | LOW | Retry logic + error handling |
| Address parsing complexity | MEDIUM | HIGH | Fuzzy matching + manual review |
| Document quality variance | HIGH | MEDIUM | Confidence threshold + warnings |

---

## 12. Next Steps (Post-MVP)

1. **Phase 2: AI Agents** - Name Intelligence, Document Authenticity
2. **Phase 2: Mobile Buying** - Add `MOBILE_BUYING` BuyingType with specific rules for field purchases
3. **Phase 3: Full Integration** - Business Central, Cebia, Dolozky.cz
4. **Phase 4: VTP Support** - Full technical passport (currently ORV only)

> **Note**: ARES/ADIS validace byla přesunuta do MVP scope (viz `ARES_VALIDATION_SCOPE.md`)
> **Note**: BuyingType `MOBILE_BUYING` rules will be added in Phase 2 (see `VALIDATION_RULES_SEED.json`)

---

## Appendix A: Sample Validation Output

```json
{
  "buying_opportunity_id": "uuid-123",
  "overall_status": "ORANGE",
  "field_validations": [
    {
      "field": "vin",
      "source": "vehicle_vs_orv",
      "expected": "YV1PZA3TCL1103985",
      "actual": "YV1PZA3TCL1103985",
      "match_type": "EXACT",
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "majitel",
      "source": "vehicle_vs_orv",
      "expected": "OSIT S.R.O.",
      "actual": "OSIT S.R.O.",
      "match_type": "EXACT",
      "result": "MATCH",
      "status": "GREEN"
    },
    {
      "field": "address_street",
      "source": "vendor_vs_op",
      "expected": "Za Humny 420",
      "actual": "MNÍŠEK ZA HUMNY Č.P. 420",
      "match_type": "FUZZY",
      "similarity": 0.58,
      "threshold": 0.60,
      "result": "MISMATCH",
      "status": "ORANGE"
    }
  ],
  "issues": [
    {
      "field": "address_street",
      "severity": "WARNING",
      "message": "Adresa dodavatele se neshoduje s OP (58% vs 60% prah)"
    }
  ]
}
```

---

**Document Author**: Claude AI
**PM Approval**: Pending
**Technical Review**: Pending
