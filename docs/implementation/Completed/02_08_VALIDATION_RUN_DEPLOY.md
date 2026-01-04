# Task 2.8: Validation Run (Deploy)

> **Phase**: 2 - Backend API
> **Status**: Pending
> **Priority**: High
> **Depends On**: 1.1 Database Schema, 1.2 Seed Validation Rules
> **Estimated Effort**: Low

---

## What Agent Needs To Do

**Code already exists locally - DO NOT rewrite it.** Your task is to:

1. **Write tests** in `MVPScope/supabase/functions/tests/validation-run.test.ts`
2. **Start local Supabase** and serve the function
3. **Run tests** to verify the implementation works
4. **Deploy** to production Supabase
5. **Verify** production deployment works

The code is pre-written (2,326 lines). You are deploying and testing, not implementing.

---

## Objective

Deploy the existing validation-run Edge Function to Supabase and verify it works with the production database.

---

## Pre-Written Code (DO NOT MODIFY unless tests fail)

The validation engine is **already implemented** in:
```
MVPScope/supabase/functions/validation-run/
├── index.ts          # HTTP handler (416 lines)
├── engine.ts         # Core validation engine (467 lines)
├── types.ts          # TypeScript definitions (347 lines)
├── transforms.ts     # 14 data normalization functions (404 lines)
├── comparators.ts    # 9 comparison algorithms (367 lines)
├── rules-loader.ts   # DB rule loading with caching (325 lines)
└── README.md
```

**Total**: 2,326 lines of production-ready TypeScript code.

---

## Prerequisites

- [ ] Task 1.0 completed (test infrastructure setup)
- [ ] Task 1.1 completed (database schema applied)
- [ ] Task 1.2 completed (validation rules seeded)
- [ ] Task 1.4 completed (environment configured)

---

## Test-First Development

### Required Tests (Write Before Deployment)

Create test file: `MVPScope/supabase/functions/tests/validation-run.test.ts`

```typescript
import { assertEquals, assertExists } from "@std/assert";
import { getTestClient, generateTestSpz, cleanupTestData } from "./test-utils.ts";

const BASE_URL = "http://localhost:54321/functions/v1/validation-run";
const BO_URL = "http://localhost:54321/functions/v1/buying-opportunity";

async function createTestScenario(scenarioType: 'green' | 'orange' | 'red') {
  const spz = generateTestSpz();
  const client = getTestClient();

  // Create buying opportunity
  const { data: bo } = await client
    .from("buying_opportunities")
    .insert({ spz, status: "DRAFT" })
    .select()
    .single();

  // Create vehicle with data based on scenario
  const vehicleData = {
    buying_opportunity_id: bo?.id,
    spz,
    vin: "YV1PZA3TCL1103985",
    znacka: "VOLVO",
    model: scenarioType === 'orange' ? "V90" : "V90 CROSS COUNTRY"
  };
  await client.from("vehicles").insert(vehicleData);

  // Create OCR extraction with matching/mismatching data
  const ocrData = {
    spz,
    document_type: "ORV",
    ocr_status: "COMPLETED",
    extracted_data: {
      vin: scenarioType === 'red' ? "DIFFERENTVIN123456" : "YV1PZA3TCL1103985",
      model: "V90 CROSS COUNTRY"
    }
  };
  await client.from("ocr_extractions").insert(ocrData);

  return { id: bo?.id, spz };
}

Deno.test("POST returns GREEN for matching data", async () => {
  const { id, spz } = await createTestScenario('green');

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buying_opportunity_id: id })
  });

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.overall_status, "GREEN");
  assertExists(json.field_validations);

  await cleanupTestData(spz);
});

Deno.test("POST returns ORANGE for warning-level mismatch", async () => {
  const { id, spz } = await createTestScenario('orange');

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buying_opportunity_id: id })
  });

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.overall_status, "ORANGE");

  await cleanupTestData(spz);
});

Deno.test("POST returns RED for critical mismatch", async () => {
  const { id, spz } = await createTestScenario('red');

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buying_opportunity_id: id })
  });

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.overall_status, "RED");
  // Should have issues
  assertExists(json.issues);
  assertEquals(json.issues.length > 0, true);

  await cleanupTestData(spz);
});

Deno.test("POST loads rules from database", async () => {
  const client = getTestClient();

  // Verify rules exist
  const { data: rules, error } = await client
    .from("validation_rules")
    .select("id")
    .eq("enabled", true);

  assertEquals(error, null);
  assertEquals((rules?.length ?? 0) > 0, true);
});

Deno.test("POST returns 400 for missing identifier", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  assertEquals(res.status, 400);
});
```

### Test-First Workflow

1. **RED**: Write tests above, run them - they should FAIL initially
2. **GREEN**: Verify the existing implementation passes all tests
3. **REFACTOR**: Fix any issues discovered during testing

```bash
# Run tests
cd MVPScope/supabase && deno task test -- --filter="validation-run"
```

---

## Deployment Steps

### Step 1: Verify Local Function Works

```bash
cd MVPScope

# Start local Supabase
supabase start

# Serve function locally
supabase functions serve validation-run --env-file .env.local
```

### Step 2: Test Locally

```bash
curl -X POST http://localhost:54321/functions/v1/validation-run \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"spz": "5L94454"}'
```

### Step 3: Deploy to Production

```bash
# Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
supabase functions deploy validation-run

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Step 4: Verify Production Deployment

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validation-run \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"buying_opportunity_id": "uuid-123"}'
```

---

## API Specification

### Endpoint
```
POST /functions/v1/validation-run
```

### Request Options
```typescript
// Option 1: By buying_opportunity_id
{ "buying_opportunity_id": "uuid" }

// Option 2: By SPZ
{ "spz": "5L94454" }

// Option 3: By VIN
{ "vin": "YV1PZA3TCL1103985" }
```

### Response
```typescript
interface ValidationRunResponse {
  buying_opportunity_id: string;
  overall_status: 'GREEN' | 'ORANGE' | 'RED';
  field_validations: FieldValidation[];
  issues: Issue[];
  attempt_number: number;
  started_at: string;
  completed_at: string;
  duration_ms: number;
}
```

---

## Features (Already Implemented)

### Data Transforms (14)
- UPPERCASE, LOWERCASE, TRIM
- REMOVE_SPACES, REMOVE_DIACRITICS
- NORMALIZE_DATE, EXTRACT_NUMBER
- FORMAT_RC, FORMAT_ICO, FORMAT_DIC
- ADDRESS_NORMALIZE, NAME_NORMALIZE
- VIN_NORMALIZE, SPZ_NORMALIZE

### Comparators (9)
- EXACT, FUZZY (Levenshtein)
- CONTAINS, REGEX
- NUMERIC_TOLERANCE, DATE_TOLERANCE
- EXISTS, NOT_EXISTS, IN_LIST

### Status Logic
```
IF any CRITICAL rule fails with MISMATCH → RED
ELSE IF any WARNING rule fails OR CRITICAL has MISSING → ORANGE
ELSE → GREEN
```

---

## Validation Criteria

- [ ] Function deploys without errors
- [ ] Health check passes
- [ ] Request by buying_opportunity_id works
- [ ] Request by SPZ works
- [ ] Request by VIN works
- [ ] Rules loaded from database
- [ ] Results stored in validation_results table
- [ ] Audit log entries created
- [ ] GREEN/ORANGE/RED status correctly calculated

---

## Test Scenarios

### Scenario 1: All Data Matches (GREEN)
```json
{
  "spz": "5L94454",
  "expected_status": "GREEN"
}
```

### Scenario 2: Minor Mismatch (ORANGE)
```json
{
  "spz": "5L94454",
  "vehicle": { "model": "V90" },
  "ocr": { "model": "V90 CROSS COUNTRY" },
  "expected_status": "ORANGE"
}
```

### Scenario 3: Critical Mismatch (RED)
```json
{
  "spz": "5L94454",
  "vehicle": { "vin": "YV1PZA3TCL1103985" },
  "ocr": { "vin": "DIFFERENTVIN123456" },
  "expected_status": "RED"
}
```

---

## Monitoring

After deployment, monitor via Supabase Dashboard:
- Functions → validation-run → Logs
- Check for errors, timeouts
- Monitor execution duration

---

## Rollback Plan

If issues occur:
```bash
# Redeploy previous version
git checkout HEAD~1 -- MVPScope/supabase/functions/validation-run
supabase functions deploy validation-run
```

---

## Related Documents

- `MVPScope/supabase/functions/validation-run/README.md` - Function documentation
- `MVPScope/VALIDATION_RULES_SEED.json` - 30 validation rules
- `MVPScope/VALIDATION_RULES_SCHEMA.json` - Rule schema definition

---

## Completion Checklist

- [ ] Local testing successful
- [ ] Deployed to production
- [ ] Production secrets set
- [ ] Production testing successful
- [ ] Logs show no errors
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
