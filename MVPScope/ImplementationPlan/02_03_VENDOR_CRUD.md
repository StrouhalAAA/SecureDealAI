# Task 2.3: Vendor CRUD API

> **Phase**: 2 - Backend API
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 1.1 Database Schema, 2.1 Buying Opportunity CRUD
> **Estimated Effort**: Medium

---

## Objective

Create a Supabase Edge Function for CRUD operations on the `vendors` table, supporting both physical persons (FO) and companies (PO).

---

## Prerequisites

- [ ] Task 1.1 completed (database schema applied)
- [ ] Task 2.1 completed (buying opportunity exists to link to)

---

## API Specification

### Base Path
```
POST/GET/PUT/DELETE /functions/v1/vendor
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vendor` | Create vendor for buying opportunity |
| GET | `/vendor?id={id}` | Get by ID |
| GET | `/vendor?buying_opportunity_id={id}` | Get by buying opportunity |
| PUT | `/vendor/{id}` | Update vendor data |
| DELETE | `/vendor/{id}` | Delete vendor |

---

## Data Models

### Create/Update Request - Physical Person (FO)
```typescript
interface VendorFORequest {
  buying_opportunity_id: string;
  vendor_type: 'PHYSICAL_PERSON';
  name: string;                    // Full name
  personal_id: string;             // Rodné číslo (######/####)
  date_of_birth?: string;          // YYYY-MM-DD
  place_of_birth?: string;
  address_street?: string;
  address_city?: string;
  address_postal_code?: string;
  country_code?: string;           // Default 'CZ'
  phone?: string;
  email?: string;
  bank_account?: string;
  document_number?: string;        // OP number
  document_issue_date?: string;
  document_expiry_date?: string;
  issuing_authority?: string;
}
```

### Create/Update Request - Company (PO)
```typescript
interface VendorPORequest {
  buying_opportunity_id: string;
  vendor_type: 'COMPANY';
  name: string;                    // Company name
  company_id: string;              // IČO (8 digits)
  vat_id?: string;                 // DIČ (CZxxxxxxxx)
  address_street?: string;
  address_city?: string;
  address_postal_code?: string;
  country_code?: string;
  phone?: string;
  email?: string;
  bank_account?: string;
}
```

### Response
```typescript
interface VendorResponse {
  id: string;
  buying_opportunity_id: string;
  vendor_type: 'PHYSICAL_PERSON' | 'COMPANY';
  name: string;
  personal_id: string | null;
  company_id: string | null;
  vat_id: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
  country_code: string;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  document_number: string | null;
  document_issue_date: string | null;
  document_expiry_date: string | null;
  issuing_authority: string | null;
  data_source: string;
  validation_status: string | null;
  created_at: string;
}
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/vendor
```

### Step 2: Implement Validation

```typescript
function validateVendor(data: VendorRequest): string[] {
  const errors: string[] = [];

  if (!data.buying_opportunity_id) {
    errors.push("buying_opportunity_id is required");
  }

  if (!data.vendor_type) {
    errors.push("vendor_type is required");
  }

  if (!data.name) {
    errors.push("name is required");
  }

  if (data.vendor_type === 'PHYSICAL_PERSON') {
    if (!data.personal_id) {
      errors.push("personal_id is required for PHYSICAL_PERSON");
    } else if (!isValidRodneCislo(data.personal_id)) {
      errors.push("Invalid personal_id format (expected ######/####)");
    }
  }

  if (data.vendor_type === 'COMPANY') {
    if (!data.company_id) {
      errors.push("company_id is required for COMPANY");
    } else if (!isValidICO(data.company_id)) {
      errors.push("Invalid company_id format (expected 8 digits)");
    }

    if (data.vat_id && !isValidDIC(data.vat_id)) {
      errors.push("Invalid vat_id format (expected CZxxxxxxxx)");
    }
  }

  return errors;
}

function isValidRodneCislo(rc: string): boolean {
  return /^\d{6}\/\d{3,4}$/.test(rc);
}

function isValidICO(ico: string): boolean {
  return /^\d{8}$/.test(ico);
}

function isValidDIC(dic: string): boolean {
  return /^CZ\d{8,10}$/.test(dic);
}
```

### Step 3: Implement index.ts

```typescript
// MVPScope/supabase/functions/vendor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ... standard CORS and client setup ...

async function handleCreate(req: Request, supabase: SupabaseClient) {
  const data = await req.json();

  const errors = validateVendor(data);
  if (errors.length > 0) {
    return new Response(JSON.stringify({ errors }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: vendor, error } = await supabase
    .from("vendors")
    .insert({
      ...data,
      data_source: data.data_source || 'MANUAL'
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.code === "23505" ? 409 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(vendor), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Step 4: Deploy Function

```bash
supabase functions deploy vendor
```

---

## Field Mappings for OCR (OP)

| OCR Field (OP) | Vendor Field |
|----------------|--------------|
| `firstName` + `lastName` | `name` |
| `personalNumber` | `personal_id` |
| `dateOfBirth` | `date_of_birth` |
| `placeOfBirth` | `place_of_birth` |
| `permanentStay` | `address_street`, `address_city`, `address_postal_code` (parsed) |
| `documentNumber` | `document_number` |
| `dateOfIssue` | `document_issue_date` |
| `dateOfExpiry` | `document_expiry_date` |
| `issuingAuthority` | `issuing_authority` |

---

## Validation Criteria

- [ ] POST creates vendor linked to buying opportunity
- [ ] FO requires personal_id (rodné číslo)
- [ ] PO requires company_id (IČO)
- [ ] IČO format validated (8 digits)
- [ ] DIČ format validated (CZxxxxxxxx)
- [ ] Rodné číslo format validated (######/####)
- [ ] GET retrieves by ID or buying_opportunity_id
- [ ] PUT updates vendor fields
- [ ] DELETE removes vendor
- [ ] Only one vendor per buying_opportunity

---

## Test Cases

```bash
# Create Physical Person
curl -X POST https://[project].supabase.co/functions/v1/vendor \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "buying_opportunity_id": "uuid-123",
    "vendor_type": "PHYSICAL_PERSON",
    "name": "PETR KUSKO",
    "personal_id": "800415/2585",
    "address_city": "Liberec"
  }'

# Create Company
curl -X POST https://[project].supabase.co/functions/v1/vendor \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "buying_opportunity_id": "uuid-456",
    "vendor_type": "COMPANY",
    "name": "OSIT S.R.O.",
    "company_id": "12345678",
    "vat_id": "CZ12345678"
  }'
```

---

## Completion Checklist

- [ ] Function created and deployed
- [ ] FO validation working
- [ ] PO validation working
- [ ] IČO/DIČ/RČ format checks
- [ ] Tests pass
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
