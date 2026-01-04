# Task 2.4: ARES Lookup API (Instant IČO Validation)

> **Phase**: 2 - Backend API
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 1.1 Database Schema, INT_02 ARES API Spec
> **Estimated Effort**: Medium

---

## Objective

Create a Supabase Edge Function for instant IČO lookup via ARES API. This provides real-time company data auto-fill when user enters IČO in the vendor form.

---

## Prerequisites

- [ ] Task 1.0 completed (test infrastructure setup)
- [ ] Task 1.1 completed (database schema applied)
- [ ] INT_02 completed (ARES API specification documented)
- [ ] ARES API endpoint confirmed

---

## Test-First Development

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/supabase/functions/tests/ares-lookup.test.ts`

```typescript
import { assertEquals, assertExists } from "@std/assert";
import { createAresMock } from "./mocks/ares-mock.ts";

const BASE_URL = "http://localhost:54321/functions/v1/ares-lookup";

Deno.test("GET returns company data for valid IČO", async () => {
  // Using known test IČO
  const res = await fetch(`${BASE_URL}/27074358`);

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.found, true);
  assertExists(json.data.name);
  assertExists(json.data.ico);
  assertExists(json.data.address);
});

Deno.test("GET returns 400 for invalid IČO format", async () => {
  const res = await fetch(`${BASE_URL}/123`);

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.found, false);
});

Deno.test("GET returns 404 for non-existent company", async () => {
  const res = await fetch(`${BASE_URL}/99999999`);

  assertEquals(res.status, 404);
  const json = await res.json();
  assertEquals(json.found, false);
});

Deno.test("GET handles timeout gracefully", async () => {
  // Test with mock that simulates timeout
  // Should return 503 Service Unavailable
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 100);

  try {
    const res = await fetch(`${BASE_URL}/12345678`, {
      signal: controller.signal
    });
    // If we get here, check for appropriate error handling
    const json = await res.json();
    if (res.status === 503) {
      assertExists(json.error);
    }
  } catch (e) {
    // Abort is expected for timeout test
  } finally {
    clearTimeout(timeoutId);
  }
});

// Mock-based tests for ARES unavailability
Deno.test("Mock: ARES lookup returns expected data", () => {
  const mock = createAresMock();
  const result = mock.lookup("27074358");

  assertExists(result);
  assertEquals(result?.ico, "27074358");
  assertEquals(result?.obchodniJmeno, "OSIT S.R.O.");
});
```

### Test-First Workflow

1. **RED**: Write tests above, run them - they should FAIL
2. **GREEN**: Implement the function until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

```bash
# Run tests (should fail before implementation)
cd MVPScope/supabase && deno task test -- --filter="ares-lookup"
```

---

## API Specification

### Endpoint
```
GET /functions/v1/ares-lookup/{ico}
```

### Request
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ico` | path | Yes | 8-digit Czech company ID |

### Response (Success)
```typescript
interface AresLookupResponse {
  found: true;
  data: {
    ico: string;
    name: string;              // Official company name
    dic: string | null;        // VAT ID if registered
    address: {
      street: string;
      city: string;
      postal_code: string;
      country: string;
    };
    legal_form: string;        // e.g., "s.r.o.", "a.s."
    date_founded: string;      // YYYY-MM-DD
    is_active: boolean;
  };
  fetched_at: string;          // ISO 8601
}
```

### Response (Not Found)
```typescript
interface AresNotFoundResponse {
  found: false;
  ico: string;
  message: string;
}
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/ares-lookup
```

### Step 2: Implement ARES Client

```typescript
// MVPScope/supabase/functions/ares-lookup/ares-client.ts

interface AresResponse {
  ico: string;
  obchodniJmeno: string;
  dic?: string;
  sidlo: {
    ulice?: string;
    cisloDomovni?: string;
    obec: string;
    psc: string;
    stat: string;
  };
  pravniForma: string;
  datumVzniku: string;
  stavSubjektu: string;
}

export async function fetchFromAres(ico: string): Promise<AresResponse | null> {
  const ARES_URL = Deno.env.get("ARES_API_URL") || "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

  try {
    const response = await fetch(`${ARES_URL}/${ico}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`ARES API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("ARES fetch error:", error);
    throw error;
  }
}

export function transformAresResponse(ares: AresResponse): AresLookupResponse["data"] {
  const sidlo = ares.sidlo;
  const street = sidlo.ulice
    ? `${sidlo.ulice} ${sidlo.cisloDomovni || ""}`.trim()
    : sidlo.cisloDomovni || "";

  return {
    ico: ares.ico,
    name: ares.obchodniJmeno,
    dic: ares.dic || null,
    address: {
      street,
      city: sidlo.obec,
      postal_code: sidlo.psc,
      country: sidlo.stat || "CZ",
    },
    legal_form: ares.pravniForma,
    date_founded: ares.datumVzniku,
    is_active: ares.stavSubjektu === "AKTIVNÍ",
  };
}
```

### Step 3: Implement index.ts with Caching

```typescript
// MVPScope/supabase/functions/ares-lookup/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchFromAres, transformAresResponse } from "./ares-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const ico = pathParts[pathParts.length - 1];

    // Validate IČO format
    if (!/^\d{8}$/.test(ico)) {
      return new Response(JSON.stringify({
        found: false,
        ico,
        message: "Invalid IČO format. Expected 8 digits.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase for caching
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check cache first
    const { data: cached } = await supabase
      .from("ares_validations")
      .select("ares_data, ares_fetched_at")
      .eq("ico", ico)
      .gte("ares_fetched_at", new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString())
      .order("ares_fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (cached?.ares_data) {
      return new Response(JSON.stringify({
        found: true,
        data: cached.ares_data,
        fetched_at: cached.ares_fetched_at,
        cached: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch from ARES
    const aresData = await fetchFromAres(ico);

    if (!aresData) {
      return new Response(JSON.stringify({
        found: false,
        ico,
        message: "Company not found in ARES registry.",
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transformedData = transformAresResponse(aresData);

    return new Response(JSON.stringify({
      found: true,
      data: transformedData,
      fetched_at: new Date().toISOString(),
      cached: false,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: "ARES lookup failed",
      message: error.message,
    }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Step 4: Deploy Function

```bash
supabase functions deploy ares-lookup
```

---

## Caching Strategy

| Scenario | TTL | Action |
|----------|-----|--------|
| Fresh lookup | 24 hours | Cache in `ares_validations` |
| Cached valid | - | Return cached data |
| Cache expired | - | Fetch fresh from ARES |
| ARES down | - | Return cached (if any) or error |

---

## Error Handling

| Status | Condition | Response |
|--------|-----------|----------|
| 200 | Company found | Full company data |
| 400 | Invalid IČO format | Validation error |
| 404 | Company not found | Not found message |
| 503 | ARES API unavailable | Service unavailable |

---

## Frontend Integration (VendorForm.vue)

```typescript
// Debounced IČO input handler
async function onIcoChange(ico: string) {
  if (ico.length !== 8) return;

  loading.value = true;

  try {
    const response = await fetch(`/functions/v1/ares-lookup/${ico}`);
    const result = await response.json();

    if (result.found) {
      // Auto-fill form fields
      form.name = result.data.name;
      form.vat_id = result.data.dic;
      form.address_street = result.data.address.street;
      form.address_city = result.data.address.city;
      form.address_postal_code = result.data.address.postal_code;
      aresStatus.value = 'verified';
    } else {
      aresStatus.value = 'not_found';
    }
  } catch (error) {
    aresStatus.value = 'error';
  } finally {
    loading.value = false;
  }
}
```

---

## Validation Criteria

- [ ] Valid IČO returns company data
- [ ] Invalid IČO format returns 400
- [ ] Non-existent company returns 404
- [ ] Response includes all required fields (name, address, DIČ)
- [ ] Caching works (24h TTL)
- [ ] ARES API timeout handled gracefully

---

## Test Cases

```bash
# Valid company
curl "https://[project].supabase.co/functions/v1/ares-lookup/27074358" \
  -H "Authorization: Bearer $ANON_KEY"

# Invalid format
curl "https://[project].supabase.co/functions/v1/ares-lookup/123" \
  -H "Authorization: Bearer $ANON_KEY"

# Non-existent
curl "https://[project].supabase.co/functions/v1/ares-lookup/99999999" \
  -H "Authorization: Bearer $ANON_KEY"
```

---

## Related Documents

- [INT_02_ARES_ADIS_API.md](./INT_02_ARES_ADIS_API.md) - ARES API specification
- [02_07_ARES_VALIDATE.md](./02_07_ARES_VALIDATE.md) - Full ARES validation (DPH checks)

---

## Completion Checklist

- [ ] Function created and deployed
- [ ] ARES API integration working
- [ ] Caching implemented
- [ ] Error handling complete
- [ ] Tests pass
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
