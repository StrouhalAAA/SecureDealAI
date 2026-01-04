# Task 2.8: Validation Run (Deploy)

> **Phase**: 2 - Backend API
> **Status**: [x] Implemented (code exists, needs deployment)
> **Priority**: High
> **Depends On**: 1.1 Database Schema, 1.2 Seed Validation Rules
> **Estimated Effort**: Low

---

## Objective

Deploy the existing validation-run Edge Function to Supabase and verify it works with the production database.

---

## Current Implementation Status

The validation engine is **fully implemented** in:
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

- [ ] Task 1.1 completed (database schema applied)
- [ ] Task 1.2 completed (validation rules seeded)
- [ ] Task 1.4 completed (environment configured)

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
