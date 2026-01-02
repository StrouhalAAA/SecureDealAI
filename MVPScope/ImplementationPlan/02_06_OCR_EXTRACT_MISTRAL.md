# Task 2.6: OCR Extract (Mistral API)

> **Phase**: 2 - Backend API
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 2.5 Document Upload, INT_01 Mistral OCR API Spec
> **Estimated Effort**: High
> **Last Updated**: 2026-01-02

---

## Objective

Create a Supabase Edge Function that processes uploaded documents through Mistral OCR API and extracts structured data based on document type:
- **ORV** - Vehicle Registration Certificate Part I
- **OP** - Personal ID Card
- **VTP** - Technical Certificate Part II (**CRITICAL** - contains owner IČO for ARES validation)

---

## Prerequisites

- [ ] Task 2.5 completed (document upload working)
- [ ] INT_01 completed (Mistral API specification documented)
- [ ] Mistral API key obtained

---

## API Specification

### Endpoint
```
POST /functions/v1/ocr-extract
```

### Request
```typescript
interface OcrExtractRequest {
  ocr_extraction_id: string;  // ID from document-upload response
}
```

### Response
```typescript
interface OcrExtractResponse {
  id: string;
  spz: string;
  document_type: 'ORV' | 'OP' | 'VTP';
  ocr_status: 'COMPLETED' | 'FAILED';
  extracted_data: ORVData | OPData | VTPData;
  extraction_confidence: number;  // 0-100
  completed_at: string;
}
```

---

## Extracted Data Schemas

### ORV (Vehicle Registration Certificate Part I)
```typescript
interface ORVData {
  registrationPlateNumber: string;
  vin: string;
  firstRegistrationDate: string;  // YYYY-MM-DD
  keeperName: string;
  keeperAddress: string;
  make: string;
  model: string;
  makeTypeVariantVersion?: string;
  fuelType?: string;
  engineCcm?: number;
  maxPower?: string;
  seats?: number;
}
```

### OP (Personal ID Card)
```typescript
interface OPData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;           // YYYY-MM-DD
  placeOfBirth: string;
  nationality: string;
  sex: 'M' | 'F';
  personalNumber: string;        // Rodné číslo
  permanentStay: string;
  documentNumber: string;
  dateOfIssue: string;           // YYYY-MM-DD
  dateOfExpiry: string;          // YYYY-MM-DD
  issuingAuthority: string;
}
```

### VTP (Technical Certificate Part II) - **CRITICAL for ARES**
```typescript
interface VTPData {
  // Basic Registration
  registrationPlateNumber: string;
  firstRegistrationDate: string;      // YYYY-MM-DD
  firstRegistrationDateCZ?: string;   // YYYY-MM-DD
  vtpDocumentNumber?: string;

  // Owner Info - CRITICAL for ARES validation
  ownerName: string;                  // C.2.1./C.2.2. Vlastník
  ownerIco?: string;                  // IČO for company verification
  ownerAddress: string;

  // Vehicle Identity
  vin: string;
  make: string;
  type?: string;
  variant?: string;
  version?: string;
  commercialName: string;
  manufacturer?: string;

  // Technical Specs
  vehicleCategory?: string;           // e.g., "M1"
  bodyType?: string;                  // e.g., "AC KOMBI"
  vehicleType?: string;               // e.g., "OSOBNÍ AUTOMOBIL"
  engineType?: string;
  color?: string;
  fuelType?: string;
  engineCcm?: number;
  maxPowerKw?: number;
  maxPowerRpm?: number;

  // Dimensions (mm)
  length?: number;
  width?: number;
  height?: number;
  wheelbase?: number;

  // Weights (kg)
  operatingWeight?: number;
  maxPermittedWeight?: number;
  trailerWeightBraked?: number;
  trailerWeightUnbraked?: number;
  combinedWeight?: number;

  // Performance
  maxSpeed?: number;
  seats?: number;
  standingPlaces?: number;

  // Environmental
  co2Emissions?: string;
  fuelConsumption?: string;
  emissionStandard?: string;

  // Technical Inspection
  lastInspectionDate?: string;        // YYYY-MM-DD
  nextInspectionDue?: string;         // YYYY-MM-DD
}
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/ocr-extract
```

### Step 2: Create Mistral Client

```typescript
// MVPScope/supabase/functions/ocr-extract/mistral-client.ts

interface MistralOcrRequest {
  model: string;
  document_url: string;
  template: string;
}

interface MistralOcrResponse {
  id: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  confidence: number;
  error?: string;
}

export async function extractWithMistral(
  documentUrl: string,
  documentType: 'ORV' | 'OP' | 'VTP'
): Promise<MistralOcrResponse> {
  const MISTRAL_API_URL = Deno.env.get("MISTRAL_API_URL");
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");

  if (!MISTRAL_API_URL || !MISTRAL_API_KEY) {
    throw new Error("Mistral API not configured");
  }

  const templateMap: Record<string, string> = {
    'ORV': 'VEHICLE_REGISTRATION_CERTIFICATE_PART_I',
    'OP': 'PERSONAL_ID',
    'VTP': 'VEHICLE_TECHNICAL_CERTIFICATE_PART_II',
  };
  const template = templateMap[documentType];

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-ocr-v1',  // TBD: actual model name
      document_url: documentUrl,
      template: template,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  return await response.json();
}
```

### Step 3: Create Data Transformer

```typescript
// MVPScope/supabase/functions/ocr-extract/transformer.ts

export function transformORVData(raw: Record<string, unknown>): ORVData {
  return {
    registrationPlateNumber: normalizeSpz(String(raw.registrationPlateNumber || '')),
    vin: normalizeVin(String(raw.vin || '')),
    firstRegistrationDate: normalizeDate(String(raw.firstRegistrationDate || '')),
    keeperName: String(raw.keeperName || '').toUpperCase().trim(),
    keeperAddress: String(raw.keeperAddress || '').toUpperCase().trim(),
    make: String(raw.make || '').trim(),
    model: String(raw.model || '').trim(),
    makeTypeVariantVersion: raw.makeTypeVariantVersion ? String(raw.makeTypeVariantVersion) : undefined,
    fuelType: raw.fuelType ? String(raw.fuelType) : undefined,
    engineCcm: raw.engineCcm ? Number(raw.engineCcm) : undefined,
    maxPower: raw.maxPower ? String(raw.maxPower) : undefined,
    seats: raw.seats ? Number(raw.seats) : undefined,
  };
}

export function transformOPData(raw: Record<string, unknown>): OPData {
  return {
    firstName: String(raw.firstName || '').toUpperCase().trim(),
    lastName: String(raw.lastName || '').toUpperCase().trim(),
    dateOfBirth: normalizeDate(String(raw.dateOfBirth || '')),
    placeOfBirth: String(raw.placeOfBirth || '').toUpperCase().trim(),
    nationality: String(raw.nationality || '').toUpperCase().trim(),
    sex: String(raw.sex || '').toUpperCase() as 'M' | 'F',
    personalNumber: normalizeRodneCislo(String(raw.personalNumber || '')),
    permanentStay: String(raw.permanentStay || '').toUpperCase().trim(),
    documentNumber: String(raw.documentNumber || '').trim(),
    dateOfIssue: normalizeDate(String(raw.dateOfIssue || '')),
    dateOfExpiry: normalizeDate(String(raw.dateOfExpiry || '')),
    issuingAuthority: String(raw.issuingAuthority || '').toUpperCase().trim(),
  };
}

function normalizeSpz(spz: string): string {
  return spz.replace(/\s+/g, '').toUpperCase();
}

function normalizeVin(vin: string): string {
  return vin.replace(/\s+/g, '').toUpperCase();
}

function normalizeRodneCislo(rc: string): string {
  // Ensure format ######/####
  const digits = rc.replace(/\D/g, '');
  if (digits.length >= 9) {
    return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  }
  return rc;
}

function normalizeDate(date: string): string {
  // Handle various formats: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
  // Return YYYY-MM-DD
  const patterns = [
    /^(\d{2})\.(\d{2})\.(\d{4})$/,  // DD.MM.YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,    // YYYY-MM-DD
  ];

  for (const pattern of patterns) {
    const match = date.match(pattern);
    if (match) {
      if (pattern.source.startsWith('^(\\d{4})')) {
        return date; // Already YYYY-MM-DD
      }
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }

  return date;
}

function normalizeIco(ico: string): string {
  // IČO should be 8 digits, pad with leading zeros if needed
  const digits = ico.replace(/\D/g, '');
  return digits.padStart(8, '0');
}

export function transformVTPData(raw: Record<string, unknown>): VTPData {
  return {
    // Basic Registration
    registrationPlateNumber: normalizeSpz(String(raw.registrationPlateNumber || '')),
    firstRegistrationDate: normalizeDate(String(raw.firstRegistrationDate || '')),
    firstRegistrationDateCZ: raw.firstRegistrationDateCZ
      ? normalizeDate(String(raw.firstRegistrationDateCZ))
      : undefined,
    vtpDocumentNumber: raw.vtpDocumentNumber ? String(raw.vtpDocumentNumber).trim() : undefined,

    // Owner Info - CRITICAL for ARES
    ownerName: String(raw.ownerName || '').toUpperCase().trim(),
    ownerIco: raw.ownerIco ? normalizeIco(String(raw.ownerIco)) : undefined,
    ownerAddress: String(raw.ownerAddress || '').toUpperCase().trim(),

    // Vehicle Identity
    vin: normalizeVin(String(raw.vin || '')),
    make: String(raw.make || '').trim(),
    type: raw.type ? String(raw.type).trim() : undefined,
    variant: raw.variant ? String(raw.variant).trim() : undefined,
    version: raw.version ? String(raw.version).trim() : undefined,
    commercialName: String(raw.commercialName || '').trim(),
    manufacturer: raw.manufacturer ? String(raw.manufacturer).trim() : undefined,

    // Technical Specs
    vehicleCategory: raw.vehicleCategory ? String(raw.vehicleCategory).trim() : undefined,
    bodyType: raw.bodyType ? String(raw.bodyType).trim() : undefined,
    vehicleType: raw.vehicleType ? String(raw.vehicleType).toUpperCase().trim() : undefined,
    engineType: raw.engineType ? String(raw.engineType).trim() : undefined,
    color: raw.color ? String(raw.color).toUpperCase().trim() : undefined,
    fuelType: raw.fuelType ? String(raw.fuelType).trim() : undefined,
    engineCcm: raw.engineCcm ? Number(raw.engineCcm) : undefined,
    maxPowerKw: raw.maxPowerKw ? Number(raw.maxPowerKw) : undefined,
    maxPowerRpm: raw.maxPowerRpm ? Number(raw.maxPowerRpm) : undefined,

    // Dimensions
    length: raw.length ? Number(raw.length) : undefined,
    width: raw.width ? Number(raw.width) : undefined,
    height: raw.height ? Number(raw.height) : undefined,
    wheelbase: raw.wheelbase ? Number(raw.wheelbase) : undefined,

    // Weights
    operatingWeight: raw.operatingWeight ? Number(raw.operatingWeight) : undefined,
    maxPermittedWeight: raw.maxPermittedWeight ? Number(raw.maxPermittedWeight) : undefined,
    trailerWeightBraked: raw.trailerWeightBraked ? Number(raw.trailerWeightBraked) : undefined,
    trailerWeightUnbraked: raw.trailerWeightUnbraked ? Number(raw.trailerWeightUnbraked) : undefined,
    combinedWeight: raw.combinedWeight ? Number(raw.combinedWeight) : undefined,

    // Performance
    maxSpeed: raw.maxSpeed ? Number(raw.maxSpeed) : undefined,
    seats: raw.seats ? Number(raw.seats) : undefined,
    standingPlaces: raw.standingPlaces ? Number(raw.standingPlaces) : undefined,

    // Environmental
    co2Emissions: raw.co2Emissions ? String(raw.co2Emissions) : undefined,
    fuelConsumption: raw.fuelConsumption ? String(raw.fuelConsumption) : undefined,
    emissionStandard: raw.emissionStandard ? String(raw.emissionStandard) : undefined,

    // Technical Inspection
    lastInspectionDate: raw.lastInspectionDate
      ? normalizeDate(String(raw.lastInspectionDate))
      : undefined,
    nextInspectionDue: raw.nextInspectionDue
      ? normalizeDate(String(raw.nextInspectionDue))
      : undefined,
  };
}
```

### Step 4: Implement index.ts

```typescript
// MVPScope/supabase/functions/ocr-extract/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractWithMistral } from "./mistral-client.ts";
import { transformORVData, transformOPData, transformVTPData } from "./transformer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { ocr_extraction_id } = await req.json();

    if (!ocr_extraction_id) {
      return new Response(JSON.stringify({ error: "ocr_extraction_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch OCR extraction record
    const { data: ocrRecord, error: fetchError } = await supabase
      .from("ocr_extractions")
      .select("*")
      .eq("id", ocr_extraction_id)
      .single();

    if (fetchError || !ocrRecord) {
      return new Response(JSON.stringify({ error: "OCR extraction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to PROCESSING
    await supabase
      .from("ocr_extractions")
      .update({ ocr_status: "PROCESSING" })
      .eq("id", ocr_extraction_id);

    try {
      // Call Mistral OCR
      const mistralResult = await extractWithMistral(
        ocrRecord.document_file_url,
        ocrRecord.document_type
      );

      // Transform data based on document type
      let extractedData;
      switch (ocrRecord.document_type) {
        case 'ORV':
          extractedData = transformORVData(mistralResult.output);
          break;
        case 'OP':
          extractedData = transformOPData(mistralResult.output);
          break;
        case 'VTP':
          extractedData = transformVTPData(mistralResult.output);
          break;
        default:
          throw new Error(`Unknown document type: ${ocrRecord.document_type}`);
      }

      // Update record with results
      const { data: updatedRecord, error: updateError } = await supabase
        .from("ocr_extractions")
        .update({
          ocr_status: "COMPLETED",
          extracted_data: extractedData,
          extraction_confidence: mistralResult.confidence,
          completed_at: new Date().toISOString(),
        })
        .eq("id", ocr_extraction_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify(updatedRecord), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (ocrError) {
      // Update status to FAILED
      await supabase
        .from("ocr_extractions")
        .update({
          ocr_status: "FAILED",
          errors: { message: ocrError.message },
        })
        .eq("id", ocr_extraction_id);

      throw ocrError;
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Step 5: Deploy Function

```bash
supabase functions deploy ocr-extract
supabase secrets set MISTRAL_API_KEY=your-key
supabase secrets set MISTRAL_API_URL=https://api.mistral.ai/...
```

---

## Processing Flow

```
1. Frontend triggers ocr-extract with ocr_extraction_id
2. Function fetches document URL from database
3. Status updated to PROCESSING
4. Mistral API called with document URL and template
5. Raw output transformed to structured data
6. Status updated to COMPLETED with extracted_data
7. On failure: status = FAILED, error logged
```

---

## Validation Criteria

- [ ] Successfully extracts data from ORV documents
- [ ] Successfully extracts data from OP documents
- [ ] Successfully extracts data from VTP documents
- [ ] VTP owner IČO correctly extracted and normalized
- [ ] All expected fields populated
- [ ] Date normalization works (DD.MM.YYYY → YYYY-MM-DD)
- [ ] SPZ/VIN normalization works
- [ ] IČO normalization works (8-digit padding)
- [ ] Rodné číslo normalization works (######/#### format)
- [ ] Confidence score stored
- [ ] FAILED status on OCR error
- [ ] Timeout handling (30s)

---

## Test Cases

```bash
# Trigger OCR extraction
curl -X POST "https://[project].supabase.co/functions/v1/ocr-extract" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ocr_extraction_id": "uuid-from-upload"}'
```

---

## Related Documents

- [INT_01_MISTRAL_OCR_API.md](./INT_01_MISTRAL_OCR_API.md) - Mistral API specification (TO BE DEFINED)
- [02_05_DOCUMENT_UPLOAD.md](./02_05_DOCUMENT_UPLOAD.md) - Document upload

---

## Notes

> **IMPORTANT**: This document references INT_01_MISTRAL_OCR_API.md which needs to be filled with actual Mistral API documentation, authentication method, endpoint URLs, and request/response formats.

---

## Completion Checklist

- [ ] Mistral API specification documented (INT_01)
- [ ] Function created and deployed
- [ ] ORV extraction working
- [ ] OP extraction working
- [ ] VTP extraction working (with owner IČO)
- [ ] Data transformation correct for all document types
- [ ] Error handling complete
- [ ] Tests pass
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
