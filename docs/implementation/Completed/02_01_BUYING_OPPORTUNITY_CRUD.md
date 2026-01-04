# Task 2.1: Buying Opportunity CRUD API

> **Phase**: 2 - Backend API
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 1.1 Database Schema
> **Estimated Effort**: Medium

---

## Objective

Create a Supabase Edge Function for CRUD operations on the `buying_opportunities` table.

---

## Prerequisites

- [ ] Task 1.0 completed (test infrastructure setup)
- [ ] Task 1.1 completed (database schema applied)
- [ ] Task 1.4 completed (environment configured)

---

## Test-First Development

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/supabase/functions/tests/buying-opportunity.test.ts`

```typescript
import { assertEquals, assertExists } from "@std/assert";
import { getTestClient, cleanupTestData, generateTestSpz } from "./test-utils.ts";

const BASE_URL = "http://localhost:54321/functions/v1/buying-opportunity";

Deno.test("POST creates opportunity with valid SPZ", async () => {
  const spz = generateTestSpz();
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spz, status: "DRAFT" })
  });

  assertEquals(res.status, 201);
  const json = await res.json();
  assertExists(json.id);
  assertEquals(json.spz, spz);

  await cleanupTestData(spz);
});

Deno.test("POST rejects duplicate SPZ", async () => {
  const spz = generateTestSpz();
  // Create first
  await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spz, status: "DRAFT" })
  });

  // Try duplicate
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spz, status: "DRAFT" })
  });

  assertEquals(res.status, 409);
  await cleanupTestData(spz);
});

Deno.test("GET returns 404 for non-existent ID", async () => {
  const res = await fetch(`${BASE_URL}?id=00000000-0000-0000-0000-000000000000`);
  assertEquals(res.status, 404);
});

Deno.test("PUT updates status field", async () => {
  const spz = generateTestSpz();
  const createRes = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spz })
  });
  const { id } = await createRes.json();

  const updateRes = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "PENDING" })
  });

  assertEquals(updateRes.status, 200);
  const updated = await updateRes.json();
  assertEquals(updated.status, "PENDING");

  await cleanupTestData(spz);
});

Deno.test("DELETE removes opportunity", async () => {
  const spz = generateTestSpz();
  const createRes = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spz })
  });
  const { id } = await createRes.json();

  const deleteRes = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  assertEquals(deleteRes.status, 200);

  const getRes = await fetch(`${BASE_URL}?id=${id}`);
  assertEquals(getRes.status, 404);
});
```

### Test-First Workflow

1. **RED**: Write tests above, run them - they should FAIL
2. **GREEN**: Implement the function until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

```bash
# Run tests (should fail before implementation)
cd MVPScope/supabase && deno task test -- --filter="buying-opportunity"
```

---

## API Specification

### Base Path
```
POST/GET/PUT/DELETE /functions/v1/buying-opportunity
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/buying-opportunity` | Create new buying opportunity |
| GET | `/buying-opportunity?id={id}` | Get by ID |
| GET | `/buying-opportunity?spz={spz}` | Get by SPZ |
| GET | `/buying-opportunity/list` | List all (paginated) |
| PUT | `/buying-opportunity/{id}` | Update status |
| DELETE | `/buying-opportunity/{id}` | Delete (soft or hard) |

---

## Data Models

### Create Request
```typescript
interface CreateBuyingOpportunityRequest {
  spz: string;  // Required, unique
}
```

### Response
```typescript
interface BuyingOpportunityResponse {
  id: string;           // UUID
  spz: string;
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED';
  created_at: string;   // ISO 8601
  updated_at: string;
}
```

### List Response
```typescript
interface ListResponse {
  data: BuyingOpportunityResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/buying-opportunity
```

### Step 2: Implement index.ts

```typescript
// MVPScope/supabase/functions/buying-opportunity/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
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
    const method = req.method;

    // Route handling
    if (method === "POST") {
      return await handleCreate(req, supabase);
    } else if (method === "GET") {
      return await handleGet(url, supabase);
    } else if (method === "PUT") {
      return await handleUpdate(req, url, supabase);
    } else if (method === "DELETE") {
      return await handleDelete(url, supabase);
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Implement handleCreate, handleGet, handleUpdate, handleDelete
// ... (see full implementation below)
```

### Step 3: Implement Handler Functions

```typescript
async function handleCreate(req: Request, supabase: SupabaseClient) {
  const { spz } = await req.json();

  if (!spz) {
    return new Response(JSON.stringify({ error: "SPZ is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("buying_opportunities")
    .insert({ spz, status: "DRAFT" })
    .select()
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500; // Duplicate key
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Step 4: Deploy Function

```bash
supabase functions deploy buying-opportunity
```

---

## Validation Criteria

- [ ] POST creates new buying opportunity with SPZ
- [ ] GET retrieves by ID or SPZ
- [ ] PUT updates status field
- [ ] DELETE removes record
- [ ] Duplicate SPZ returns 409 Conflict
- [ ] Invalid requests return 400
- [ ] Authentication required (401 if missing)

---

## Test Cases

```bash
# Create
curl -X POST https://[project].supabase.co/functions/v1/buying-opportunity \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"spz": "5L94454"}'

# Get by SPZ
curl "https://[project].supabase.co/functions/v1/buying-opportunity?spz=5L94454" \
  -H "Authorization: Bearer $ANON_KEY"

# Update status
curl -X PUT "https://[project].supabase.co/functions/v1/buying-opportunity/{id}" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "PENDING"}'
```

---

## Completion Checklist

- [ ] Function created and deployed
- [ ] All CRUD operations working
- [ ] Error handling implemented
- [ ] Tests pass
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
