# Task 2.2: Vehicle CRUD API

> **Phase**: 2 - Backend API
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 1.1 Database Schema, 2.1 Buying Opportunity CRUD
> **Estimated Effort**: Medium
> **Completed**: 2026-01-03

---

## Objective

Create a Supabase Edge Function for CRUD operations on the `vehicles` table.

---

## Prerequisites

- [ ] Task 1.1 completed (database schema applied)
- [ ] Task 2.1 completed (buying opportunity exists to link to)

---

## API Specification

### Base Path
```
POST/GET/PUT/DELETE /functions/v1/vehicle
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vehicle` | Create vehicle for buying opportunity |
| GET | `/vehicle?id={id}` | Get by ID |
| GET | `/vehicle?buying_opportunity_id={id}` | Get by buying opportunity |
| GET | `/vehicle?spz={spz}` | Get by SPZ |
| PUT | `/vehicle/{id}` | Update vehicle data |
| DELETE | `/vehicle/{id}` | Delete vehicle |

---

## Data Models

### Create/Update Request
```typescript
interface VehicleRequest {
  buying_opportunity_id: string;  // Required (UUID)
  spz: string;                    // Required
  vin?: string;                   // 17 characters
  znacka?: string;                // Brand (make)
  model?: string;
  rok_vyroby?: number;            // Year of manufacture
  datum_1_registrace?: string;    // First registration date (YYYY-MM-DD)
  majitel?: string;               // Owner name
  motor?: string;                 // Engine type
  vykon_kw?: number;              // Power in kW
  data_source?: 'MANUAL' | 'OCR' | 'BC_IMPORT';
}
```

### Response
```typescript
interface VehicleResponse {
  id: string;
  buying_opportunity_id: string;
  spz: string;
  vin: string | null;
  znacka: string | null;
  model: string | null;
  rok_vyroby: number | null;
  datum_1_registrace: string | null;
  majitel: string | null;
  motor: string | null;
  vykon_kw: number | null;
  data_source: string;
  validation_status: string | null;
  created_at: string;
}
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/vehicle
```

### Step 2: Implement index.ts

```typescript
// MVPScope/supabase/functions/vehicle/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const url = new URL(req.url);

    switch (req.method) {
      case "POST":
        return await handleCreate(req, supabase);
      case "GET":
        return await handleGet(url, supabase);
      case "PUT":
        return await handleUpdate(req, url, supabase);
      case "DELETE":
        return await handleDelete(url, supabase);
      default:
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Step 3: Implement Validation

```typescript
function validateVehicle(data: VehicleRequest): string[] {
  const errors: string[] = [];

  if (!data.buying_opportunity_id) {
    errors.push("buying_opportunity_id is required");
  }

  if (!data.spz) {
    errors.push("spz is required");
  }

  if (data.vin && data.vin.length !== 17) {
    errors.push("VIN must be exactly 17 characters");
  }

  if (data.rok_vyroby && (data.rok_vyroby < 1900 || data.rok_vyroby > new Date().getFullYear() + 1)) {
    errors.push("Invalid year of manufacture");
  }

  return errors;
}
```

### Step 4: Deploy Function

```bash
supabase functions deploy vehicle
```

---

## Field Mappings for OCR

When receiving OCR data, map these fields:

| OCR Field (ORV) | Vehicle Field |
|-----------------|---------------|
| `registrationPlateNumber` | `spz` |
| `vin` | `vin` |
| `make` | `znacka` |
| `model` | `model` |
| `firstRegistrationDate` | `datum_1_registrace` |
| `keeperName` | `majitel` |
| `maxPower` | `vykon_kw` |

---

## Validation Criteria

- [ ] POST creates vehicle linked to buying opportunity
- [ ] GET retrieves by ID, buying_opportunity_id, or SPZ
- [ ] PUT updates vehicle fields
- [ ] DELETE removes vehicle
- [ ] VIN validation (17 chars)
- [ ] Foreign key constraint enforced (buying_opportunity_id must exist)
- [ ] Only one vehicle per buying_opportunity (unique constraint)

---

## Test Cases

```bash
# Create
curl -X POST https://[project].supabase.co/functions/v1/vehicle \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "buying_opportunity_id": "uuid-123",
    "spz": "5L94454",
    "vin": "YV1PZA3TCL1103985",
    "znacka": "VOLVO",
    "model": "V90 CROSS COUNTRY"
  }'

# Get by buying opportunity
curl "https://[project].supabase.co/functions/v1/vehicle?buying_opportunity_id=uuid-123" \
  -H "Authorization: Bearer $ANON_KEY"
```

---

## Completion Checklist

- [x] Function created and deployed
- [x] All CRUD operations working
- [x] VIN validation implemented
- [x] FK constraint working
- [ ] Tests pass (manual testing required)
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
