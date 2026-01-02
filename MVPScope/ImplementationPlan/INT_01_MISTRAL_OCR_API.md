# Integration Document: Mistral OCR API

> **Status**: ✅ API SPECIFICATION COMPLETE
> **Required For**: Task 2.6 (OCR Extract)
> **Last Updated**: 2026-01-02

---

## Overview

This document contains the integration specification for Mistral's OCR API used to extract text from:
- **ORV** - Vehicle Registration Certificate Part I (Osvědčení o registraci vozidla - Část I)
- **OP** - Personal ID Card (Občanský průkaz)
- **VTP** - Technical Certificate Part II (Technický průkaz - Část II) - **CRITICAL for IČO extraction**

### Sample Documents Analyzed
Field definitions verified against actual documents:
- `MVPScope/Mistral/5L94454_ORV.pdf`
- `MVPScope/Mistral/5L94454_OP_Kusko.pdf`
- `MVPScope/Mistral/5L94454_VTP.pdf`

---

## API Specification

### API Access

| Item | Value |
|------|-------|
| API Base URL | `https://api.mistral.ai/v1/ocr` |
| Model | `mistral-ocr-latest` |
| Authentication | Bearer Token |
| API Key Location | `.env` → `MISTRAL_API_KEY` |

### Endpoint

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://api.mistral.ai/v1/ocr` | POST | Extract text/structured data from document |

### Request Headers

```
Authorization: Bearer {MISTRAL_API_KEY}
Content-Type: application/json
```

### Request Format

```json
{
  "model": "mistral-ocr-latest",
  "document": {
    "type": "document_url",
    "document_url": "https://public-url-to-document.pdf"
  },
  "include_image_base64": false,
  "document_annotation_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "ORV_EXTRACTION",
      "schema": {
        "type": "object",
        "properties": {
          "registrationPlateNumber": { "type": "string" },
          "vin": { "type": "string" },
          "firstRegistrationDate": { "type": "string" },
          "keeperName": { "type": "string" },
          "keeperAddress": { "type": "string" },
          "make": { "type": "string" },
          "model": { "type": "string" }
        }
      }
    }
  }
}
```

### Response Format

```json
{
  "model": "mistral-ocr-latest",
  "pages": [
    {
      "index": 0,
      "markdown": "# Document Content\n...",
      "images": [],
      "dimensions": { "dpi": 300, "height": 842, "width": 595 },
      "tables": [],
      "hyperlinks": [],
      "header": null,
      "footer": null
    }
  ],
  "document_annotation": {
    "registrationPlateNumber": "5L94454",
    "vin": "YV1PZA3TCL1103985",
    "firstRegistrationDate": "15.08.2019",
    "keeperName": "OSIT S.R.O.",
    "keeperAddress": "MRŠTÍKOVA 399/2A, LIBEREC",
    "make": "VOLVO",
    "model": "V90 CROSS COUNTRY"
  },
  "usage_info": {
    "pages_processed": 2,
    "doc_size_bytes": 245632
  }
}
```

### Document Submission Options

| Method | Use Case |
|--------|----------|
| `document_url` | Public URL (Supabase Storage signed URL) |
| `image_url` | Single image URL |
| Base64 | Inline encoded document/image |

### Key Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | `mistral-ocr-latest` |
| `document.type` | string | `document_url`, `image_url`, or `file_chunk` |
| `document.document_url` | string | Public URL to PDF |
| `pages` | array | Specific pages to process (optional) |
| `include_image_base64` | boolean | Include base64 images in response |
| `document_annotation_format` | object | JSON Schema for structured extraction |

---

## Template Definitions

### ORV Template: `VEHICLE_REGISTRATION_CERTIFICATE_PART_I`

**Expected Fields:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| registrationPlateNumber | string | Yes | "5L94454" | A. REGISTRAČNÍ ZNAČKA |
| vin | string | Yes | "YV1PZA3TCL1103985" | E. IDENTIFIKAČNÍ ČÍSLO (VIN) |
| firstRegistrationDate | string | Yes | "2019-08-15" | B. DATUM PRVNÍ REGISTRACE |
| keeperName | string | Yes | "OSIT S.R.O." | C.1.1./C.1.2. PROVOZOVATEL |
| keeperAddress | string | Yes | "MRŠTÍKOVA 399/2A, LIBEREC, LIBEREC III-JEŘÁB, 460 07" | C.1.3. ADRESA POBYTU/SÍDLO |
| make | string | Yes | "VOLVO" | D.1. TOVÁRNÍ ZNAČKA |
| model | string | Yes | "V90 CROSS COUNTRY" | D.3. OBCHODNÍ OZNAČENÍ |
| makeTypeVariantVersion | string | No | "VOLVO, P, PZA3, PZA3TC0" | D.1. + D.2. TYP, VARIANTA, VERZE |
| fuelType | string | No | "BA" | P.3. PALIVO |
| engineCcm | number | No | 1969 | P.1. ZDVIHOVÝ OBJEM [cm³] |
| maxPower | string | No | "228/5700" | P.2. MAX. VÝKON [kW] / OT. |
| seats | number | No | 5 | S.1. POČET MÍST K SEZENÍ |
| color | string | No | "MODRÁ" | R. BARVA |
| vehicleType | string | No | "OSOBNÍ AUTOMOBIL" | J. DRUH VOZIDLA |
| maxSpeed | number | No | 230 | T. NEJVYŠŠÍ RYCHLOST [km/h] |
| orvDocumentNumber | string | No | "UAY 257818" | Document serial number |

**Date Format:** Input DD.MM.YYYY → Output YYYY-MM-DD (ISO 8601)

### OP Template: `PERSONAL_ID`

**Expected Fields:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| firstName | string | Yes | "PETR" | JMÉNO / GIVEN NAMES |
| lastName | string | Yes | "KUSKO" | PŘÍJMENÍ / SURNAME |
| dateOfBirth | string | Yes | "1980-04-15" | DATUM NAROZENÍ / DATE OF BIRTH |
| placeOfBirth | string | No | "LIBEREC, okr. LIBEREC" | MÍSTO NAROZENÍ / PLACE OF BIRTH |
| nationality | string | No | "ČESKÁ REPUBLIKA" | STÁTNÍ OBČANSTVÍ / NATIONALITY |
| sex | string | Yes | "M" | POHLAVÍ / SEX |
| personalNumber | string | Yes | "800415/2585" | RODNÉ ČÍSLO / PERSONAL NO. (back) |
| permanentStay | string | Yes | "MNÍŠEK, MNÍŠEK, ZA HUMNY č.p. 420, okr. LIBEREC" | TRVALÝ POBYT / PERMANENT STAY (back) |
| documentNumber | string | Yes | "217215163" | ČÍSLO DOKLADU / DOCUMENT NO. |
| dateOfIssue | string | Yes | "2024-05-22" | DATUM VYDÁNÍ / DATE OF ISSUE |
| dateOfExpiry | string | Yes | "2034-05-22" | PLATNOST DO / DATE OF EXPIRY |
| issuingAuthority | string | No | "Magistrát města LIBEREC" | VYDAL / AUTHORITY (back) |

**Date Format:** Input DD.MM.YYYY → Output YYYY-MM-DD (ISO 8601)

**Note:** OP has two sides - front contains personal info, back contains permanent stay, rodné číslo, and issuing authority.

### VTP Template: `VEHICLE_TECHNICAL_CERTIFICATE_PART_II`

> **CRITICAL:** VTP contains the owner's IČO (company ID) which is essential for ARES company validation. This is different from the ORV keeper information.

**Expected Fields - Basic Registration:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| registrationPlateNumber | string | Yes | "5L94454" | A. Registrační značka vozidla |
| firstRegistrationDate | string | Yes | "2019-08-15" | B. Datum první registrace vozidla |
| firstRegistrationDateCZ | string | No | "2019-08-15" | Datum první registrace v ČR |
| vtpDocumentNumber | string | No | "UJ 41A767" | Document serial number |

**Expected Fields - Owner Info (CRITICAL for ARES):**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| ownerName | string | **Yes** | "OSIT S.R.O." | C.2.1./C.2.2. Vlastník |
| ownerIco | string | **Yes** | "25026534" | RČ/IČ (next to owner) |
| ownerAddress | string | Yes | "MRŠTÍKOVA 399/2A, LIBEREC, LIBEREC III-JEŘÁB, 460 07" | C.2.3. Adresa pobytu/sídlo |

**Expected Fields - Vehicle Identity:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| vin | string | Yes | "YV1PZA3TCL1103985" | E. Identifikační číslo vozidla (VIN) |
| make | string | Yes | "VOLVO" | D.1. Tovární značka |
| type | string | No | "P" | D.2. Typ |
| variant | string | No | "PZA3" | Varianta |
| version | string | No | "PZA3TC0" | Verze |
| commercialName | string | Yes | "V90 CROSS COUNTRY" | D.3. Obchodní označení |
| manufacturer | string | No | "VOLVO CAR CORP., GOTHENBURG, ŠVÉDSKO" | 3. Výrobce vozidla |

**Expected Fields - Technical Specs:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| vehicleCategory | string | No | "M1" | J. Kategorie vozidla |
| bodyType | string | No | "AC KOMBI" | 2. Karoserie |
| vehicleType | string | No | "OSOBNÍ AUTOMOBIL" | J. Druh vozidla |
| engineType | string | No | "B4204T29" | 5. Typ motoru |
| color | string | No | "MODRÁ" | R. Barva |
| fuelType | string | No | "BA" | P.3. Palivo |
| engineCcm | number | No | 1969 | P.1. Zdvih. objem [cm³] |
| maxPowerKw | number | No | 228.0 | P.2. Max. výkon [kW] |
| maxPowerRpm | number | No | 5700 | P.4. ot. [min⁻¹] |

**Expected Fields - Dimensions (mm):**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| length | number | No | 4939 | 12. Celková délka |
| width | number | No | 1903 | 13. Celková šířka |
| height | number | No | 1506 | 14. Celková výška |
| wheelbase | number | No | 2941 | M. Rozvor |

**Expected Fields - Weights (kg):**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| operatingWeight | number | No | 1842 | G. Provozní hmotnost |
| maxPermittedWeight | number | No | 2420 | F.2. Povolená hmotnost |
| trailerWeightBraked | number | No | 2400 | O.1. Hmotnost přívěsu brzděného |
| trailerWeightUnbraked | number | No | 750 | O.2. Hmotnost přívěsu nebrzděného |
| combinedWeight | number | No | 4820 | F.3. Hmotnost soupravy |

**Expected Fields - Performance:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| maxSpeed | number | No | 230 | T. Nejvyšší rychlost [km/h] |
| seats | number | No | 5 | S.1. Počet míst k sezení |
| standingPlaces | number | No | 0 | S.2. Počet míst k stání |

**Expected Fields - Environmental:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| co2Emissions | string | No | "232/155/183" | V.7 CO₂ [g/km] |
| fuelConsumption | string | No | "10.0/6.7/7.9" | 25. Spotřeba paliva |
| emissionStandard | string | No | "ES 2018/1832DG" | Předpis EHS/ES/EU |

**Expected Fields - Technical Inspection:**

| Field | Type | Required | Example | Source on Document |
|-------|------|----------|---------|-------------------|
| lastInspectionDate | string | No | "2023-08-29" | OSVĚDČENÍ O TECHNICKÉ ZPŮSOBILOSTI |
| nextInspectionDue | string | No | "2025-08-29" | Platí do |

**Date Format:** Input DD.MM.YYYY → Output YYYY-MM-DD (ISO 8601)

**Note:** VTP is a multi-page document. Page 1 contains registration/owner info, Page 3 (TECHNICKÝ POPIS VOZIDLA) contains detailed technical specifications.

---

## Rate Limits

| Limit Type | Value | Notes |
|------------|-------|-------|
| Requests per minute | Check Mistral dashboard | Tier-based |
| Max file size | PDF/images supported | Multi-page PDFs OK |
| Batch processing | Available | For high volume, use Batch Inference |

---

## Error Codes

| Code | Description | Handling |
|------|-------------|----------|
| 400 | Invalid request | Check document URL accessibility |
| 401 | Unauthorized | Verify API key |
| 413 | File too large | Reduce file size |
| 429 | Rate limited | Retry with exponential backoff |
| 500 | Server error | Retry up to 3 times |

---

## Implementation Notes

### Synchronous Processing

The Mistral OCR API is **synchronous** - results are returned in the same request. No polling needed.

### Document URL Requirements

- Document URL must be **publicly accessible** by Mistral's servers
- Use Supabase Storage **signed URLs** with appropriate expiry (e.g., 1 hour)
- Base64 encoding available for private documents

### Structured Extraction Strategy

Use `document_annotation_format` with `json_schema` to get structured output:

```typescript
const jsonSchema = {
  type: "json_schema",
  json_schema: {
    name: documentType === 'ORV' ? 'ORV_EXTRACTION'
        : documentType === 'OP' ? 'OP_EXTRACTION'
        : 'VTP_EXTRACTION',
    schema: getSchemaForDocumentType(documentType)
  }
};
```

### Timeout Handling

- Recommended timeout: 60 seconds (multi-page PDFs)
- Implement retry with exponential backoff (1s, 2s, 4s)
- Log failures for monitoring

### Security

- API key stored in `.env` → `MISTRAL_API_KEY`
- Set in Supabase secrets: `supabase secrets set MISTRAL_API_KEY=...`
- Never expose key in frontend
- Log only sanitized request data (no document content)

---

## Action Items

- [x] Obtain Mistral API access (API key in `.env`)
- [x] Get API documentation
- [x] Document request/response formats
- [x] Define field mappings for ORV, OP, VTP
- [ ] Test with sample documents (MVPScope/Mistral/*.pdf)
- [ ] Verify JSON Schema extraction works as expected
- [ ] Set up API key in Supabase secrets for deployment

---

## References

- [Mistral OCR Documentation](https://docs.mistral.ai/capabilities/document_ai/basic_ocr)
- [OCR API Endpoint](https://docs.mistral.ai/api/endpoint/ocr)
- [Mistral AI Console](https://console.mistral.ai/) - API keys & usage

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-01 | Initial placeholder created |
| 2026-01-02 | Added VTP template with owner IČO fields (critical for ARES validation) |
| 2026-01-02 | Updated ORV template with color, vehicleType, maxSpeed, makeTypeVariantVersion |
| 2026-01-02 | Updated OP template with document source references |
| 2026-01-02 | Verified all fields against sample documents in MVPScope/Mistral/ |
| 2026-01-02 | **API SPEC COMPLETE**: Added endpoint, request/response formats, JSON Schema extraction strategy |
