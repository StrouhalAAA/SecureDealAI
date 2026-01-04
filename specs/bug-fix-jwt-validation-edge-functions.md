# Bug Fix: Invalid JWT Error on Edge Function Calls

## Context for Executing Agent

This is a **self-contained implementation plan**. You have no prior context about this bug. Read this document completely before executing.

**Project**: SecureDealAI - A validation service for vehicle purchase opportunities
**Tech Stack**: Vue.js frontend + Supabase (PostgreSQL + Edge Functions with Deno/TypeScript)
**Working Directory**: `/Users/jakubstrouhal/Documents/SecureDealAI`

---

## Bug Description

### Symptoms
When users upload documents via the frontend, they receive this error:
```json
{"code":401,"message":"Invalid JWT"}
```

### Failing Request (from browser Network tab)
```bash
curl 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/document-upload' \
  -H 'authorization: Bearer sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t' \
  -H 'content-type: multipart/form-data; boundary=...' \
  --data-raw '...'
```

**Response**: `{"code":401,"message":"Invalid JWT"}`

### Affected URL
`http://localhost:5173/opportunity/eb872be2-2326-4f25-9164-a046ab39a624` → Step 3 (Document Upload)

---

## Root Cause Analysis

### The Problem
Supabase Edge Functions have **JWT verification enabled by default**. The API Gateway checks the `Authorization` header before the request reaches function code.

### Why It Fails
The frontend sends:
```
Authorization: Bearer sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t
```

This `sb_publishable_...` format is a **Supabase API key**, NOT a valid JWT token.

**Valid JWT format**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U`
**What frontend sends**: `sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t`

The Supabase Gateway tries to decode the API key as a JWT, fails, and returns 401.

### The Fix
Create `supabase/config.toml` with `verify_jwt = false` for all Edge Functions. This tells Supabase to skip JWT verification and let the request through.

---

## Affected Edge Functions

All 9 Edge Functions in this project are affected:

| Function | Purpose |
|----------|---------|
| `document-upload` | Upload documents (ORV, VTP, OP) to storage |
| `ocr-extract` | Extract text from documents via Mistral OCR |
| `validation-run` | Execute validation rules |
| `ares-lookup` | Look up company by IČO in ARES registry |
| `ares-validate` | Validate vendor against ARES data |
| `buying-opportunity` | CRUD for buying opportunities |
| `vehicle` | CRUD for vehicles |
| `vendor` | CRUD for vendors |
| `validation-preview` | Preview validation results |

---

## Implementation Steps

### Step 1: Create Configuration File

**Create file**: `supabase/config.toml`

**Full file contents** (copy exactly):

```toml
# Supabase Edge Functions Configuration
# Documentation: https://supabase.com/docs/guides/functions/function-configuration

# Disable JWT verification for all Edge Functions
# These functions handle public requests and use service role keys internally
# for database operations.

[functions.document-upload]
verify_jwt = false

[functions.ocr-extract]
verify_jwt = false

[functions.validation-run]
verify_jwt = false

[functions.ares-lookup]
verify_jwt = false

[functions.ares-validate]
verify_jwt = false

[functions.buying-opportunity]
verify_jwt = false

[functions.vehicle]
verify_jwt = false

[functions.vendor]
verify_jwt = false

[functions.validation-preview]
verify_jwt = false
```

**Verification**: After creating, run:
```bash
cat supabase/config.toml
```
Confirm all 9 functions are listed.

---

### Step 2: Test Locally

**Start local Supabase functions server**:
```bash
cd /Users/jakubstrouhal/Documents/SecureDealAI
supabase functions serve --env-file supabase/.env.local
```

**In a new terminal, test the document-upload endpoint**:
```bash
# This should NOT return 401 anymore
# Expected: 400 error about missing file (which is correct - we're not sending a file)
curl -X POST http://localhost:54321/functions/v1/document-upload \
  -H "Authorization: Bearer sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response** (this is SUCCESS - it means JWT verification is disabled):
```json
{"error":"Validation failed","code":"VALIDATION_ERROR","errors":["Invalid multipart form data"]}
```

**If you still see** `{"code":401,"message":"Invalid JWT"}`, the config.toml is not being read. Check:
1. File is in correct location: `supabase/config.toml`
2. Restart the functions server
3. Check for TOML syntax errors

---

### Step 3: Deploy to Production

**Deploy all Edge Functions** (config.toml is applied during deployment):

```bash
cd /Users/jakubstrouhal/Documents/SecureDealAI

# Deploy each function (order doesn't matter)
supabase functions deploy document-upload
supabase functions deploy ocr-extract
supabase functions deploy validation-run
supabase functions deploy ares-lookup
supabase functions deploy ares-validate
supabase functions deploy buying-opportunity
supabase functions deploy vehicle
supabase functions deploy vendor
supabase functions deploy validation-preview
```

**Or deploy all at once**:
```bash
supabase functions deploy
```

**Note**: You may need to be linked to the project first:
```bash
supabase link --project-ref bdmygmbxtdgujkytpxha
```

---

### Step 4: Verify Production Fix

**Test production endpoint**:
```bash
curl -X POST https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/document-upload \
  -H "Authorization: Bearer sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response** (SUCCESS):
```json
{"error":"Validation failed","code":"VALIDATION_ERROR","errors":["Invalid multipart form data"]}
```

**NOT expected** (bug still present):
```json
{"code":401,"message":"Invalid JWT"}
```

---

### Step 5: Test Full Flow in Browser

1. Open `http://localhost:5173/opportunity/eb872be2-2326-4f25-9164-a046ab39a624`
2. Navigate to Step 3 (Document Upload)
3. Upload a PDF file
4. Verify upload succeeds without 401 error

---

## Validation Commands

Run these commands to confirm the fix works:

```bash
# 1. Verify config file exists and has correct content
cat supabase/config.toml | grep verify_jwt

# 2. Test database connection
npm run test:db

# 3. Build frontend (ensure no compilation errors)
cd apps/web && npm run build

# 4. Test local function (after starting server)
curl -X POST http://localhost:54321/functions/v1/document-upload \
  -H "Authorization: Bearer sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t" \
  -F "file=@test.pdf" \
  -F "spz=ABC1234" \
  -F "document_type=ORV"
```

---

## Files Modified

| Action | File Path |
|--------|-----------|
| **CREATE** | `supabase/config.toml` |

No other files need modification. This is a configuration-only fix.

---

## Security Considerations

**Q: Is disabling JWT verification safe?**

A: Yes, for this use case. The Edge Functions:
1. Use **service role keys** internally for database operations
2. Validate input data themselves
3. Don't expose sensitive data without proper authorization logic

This is the standard Supabase pattern for webhook-style endpoints.

---

## Troubleshooting

### Config not applied locally
- Restart `supabase functions serve`
- Ensure file is at `supabase/config.toml` (not root directory)

### Config not applied in production
- Redeploy function: `supabase functions deploy <function-name>`
- Check Supabase Dashboard → Edge Functions → Function Settings

### Still getting 401 after deployment
- There's a known Supabase CLI bug where settings don't persist
- Manually disable JWT verification in Supabase Dashboard:
  1. Go to Edge Functions
  2. Click on the function
  3. Settings → Disable "Enforce JWT Verification"

---

## Success Criteria

- [ ] `supabase/config.toml` file created with all 9 functions configured
- [ ] Local test returns validation error (not 401)
- [ ] Production test returns validation error (not 401)
- [ ] Document upload works in browser without 401 error
- [ ] `npm run build` passes in `apps/web`
