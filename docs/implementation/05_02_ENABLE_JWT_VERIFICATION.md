# Task 5.2: Enable JWT Verification for Edge Functions

> **Phase**: 5 - Access Code Authentication
> **Status**: [ ] Pending
> **Priority**: Critical
> **Depends On**: 5.1 (Verify Access Code Function)
> **Estimated Effort**: 1 hour

---

## Objective

Enable JWT verification for all existing Edge Functions by updating `supabase/config.toml`. After this change, all API calls (except `verify-access-code`) will require a valid JWT token.

---

## Prerequisites

- [ ] Task 5.1 completed (verify-access-code function deployed)
- [ ] Valid JWT can be obtained for testing

---

## Architecture Reference

See: [05_00_ACCESS_CODE_ARCHITECTURE.md](./05_00_ACCESS_CODE_ARCHITECTURE.md)

---

## Current State

File: `supabase/config.toml`

All functions currently have `verify_jwt = false`:

```toml
[functions.buying-opportunity]
verify_jwt = false

[functions.vehicle]
verify_jwt = false

[functions.vendor]
verify_jwt = false

# ... etc
```

---

## Implementation Steps

### Step 1: Update config.toml

Modify `supabase/config.toml` to enable JWT verification:

```toml
# =============================================================================
# Edge Functions Configuration
# =============================================================================

# Authentication endpoint - MUST remain open (no JWT required)
[functions.verify-access-code]
verify_jwt = false

# All other endpoints require valid JWT
[functions.buying-opportunity]
verify_jwt = true

[functions.vehicle]
verify_jwt = true

[functions.vendor]
verify_jwt = true

[functions.document-upload]
verify_jwt = true

[functions.get-document-url]
verify_jwt = true

[functions.ocr-extract]
verify_jwt = true

[functions.validation-run]
verify_jwt = true

[functions.ares-lookup]
verify_jwt = true

[functions.ares-validate]
verify_jwt = true

[functions.validation-preview]
verify_jwt = true
```

### Step 2: Configure Supabase JWT Secret

**CRITICAL**: The JWT tokens created by `verify-access-code` must be verifiable by Supabase. There are two approaches:

#### Option A: Use Supabase's JWT Secret (Recommended)

Get your project's JWT secret from Supabase Dashboard:
1. Go to Project Settings → API
2. Find "JWT Secret" under "JWT Settings"
3. Use this same secret in `verify-access-code` function

```bash
# The JWT_SECRET for verify-access-code should match Supabase's JWT secret
supabase secrets set JWT_SECRET="your-supabase-jwt-secret"
```

#### Option B: Custom JWT with Service Role Fallback

If using a custom JWT secret, the Edge Functions need to manually verify tokens. This requires modifying each function - **not recommended**.

### Step 3: Test JWT Verification

Before deploying, test locally:

```bash
# Start local Supabase
supabase start

# Get a valid token (replace with your test code)
TOKEN=$(curl -s -X POST "http://localhost:54321/functions/v1/verify-access-code" \
  -H "Content-Type: application/json" \
  -d '{"code": "your-test-code"}' | jq -r '.token')

echo "Token: $TOKEN"

# Test an endpoint WITHOUT token (should fail)
curl -s "http://localhost:54321/functions/v1/buying-opportunity" \
  -H "Content-Type: application/json"
# Expected: 401 Unauthorized

# Test an endpoint WITH token (should work)
curl -s "http://localhost:54321/functions/v1/buying-opportunity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
# Expected: 200 with data (or appropriate response)
```

### Step 4: Deploy Configuration

```bash
# Push updated config
supabase db push

# Redeploy all functions to pick up config changes
supabase functions deploy buying-opportunity
supabase functions deploy vehicle
supabase functions deploy vendor
supabase functions deploy document-upload
supabase functions deploy get-document-url
supabase functions deploy ocr-extract
supabase functions deploy validation-run
supabase functions deploy ares-lookup
supabase functions deploy ares-validate
supabase functions deploy validation-preview

# Or deploy all at once
supabase functions deploy
```

---

## Test Cases

### Verify All Endpoints Require Auth

```bash
# Get a valid token first
TOKEN=$(curl -s -X POST "https://[project].supabase.co/functions/v1/verify-access-code" \
  -H "Content-Type: application/json" \
  -d '{"code": "your-code"}' | jq -r '.token')

# Test each endpoint WITHOUT token
endpoints=(
  "buying-opportunity"
  "vehicle"
  "vendor"
  "document-upload"
  "get-document-url"
  "ocr-extract"
  "validation-run"
  "ares-lookup"
  "ares-validate"
  "validation-preview"
)

echo "Testing WITHOUT auth token (all should return 401):"
for endpoint in "${endpoints[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://[project].supabase.co/functions/v1/$endpoint")
  echo "$endpoint: $status"
done

echo ""
echo "Testing WITH auth token (all should NOT return 401):"
for endpoint in "${endpoints[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "https://[project].supabase.co/functions/v1/$endpoint")
  echo "$endpoint: $status"
done
```

Expected output:
```
Testing WITHOUT auth token (all should return 401):
buying-opportunity: 401
vehicle: 401
vendor: 401
document-upload: 401
get-document-url: 401
ocr-extract: 401
validation-run: 401
ares-lookup: 401
ares-validate: 401
validation-preview: 401

Testing WITH auth token (all should NOT return 401):
buying-opportunity: 200 (or 400 for missing params)
vehicle: 200 (or 400)
...
```

---

## Error Handling

When JWT verification fails, Supabase returns:

```json
{
  "message": "Invalid JWT"
}
```

or

```json
{
  "message": "JWT expired"
}
```

The frontend should handle these as 401 responses and redirect to the access code page.

---

## Validation Criteria

- [ ] `config.toml` updated with `verify_jwt = true` for all functions except `verify-access-code`
- [ ] All endpoints return 401 without Authorization header
- [ ] All endpoints accept requests with valid JWT
- [ ] `verify-access-code` remains accessible without token
- [ ] JWT tokens from `verify-access-code` are accepted by other endpoints

---

## Completion Checklist

- [ ] config.toml updated
- [ ] JWT_SECRET matches Supabase project secret
- [ ] All functions redeployed
- [ ] All endpoints tested without auth (401)
- [ ] All endpoints tested with auth (not 401)
- [ ] verify-access-code still works without auth
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`

---

## Rollback

If issues arise:

```toml
# Revert config.toml to:
[functions.buying-opportunity]
verify_jwt = false

# ... etc for all functions
```

Then redeploy:

```bash
supabase functions deploy
```

---

## Troubleshooting

### "Invalid JWT" error even with valid token

1. Verify JWT_SECRET in verify-access-code matches Supabase's JWT secret
2. Check token has `role: "authenticated"` claim
3. Check token has `aud: "authenticated"` claim
4. Ensure token hasn't expired

### Functions still accessible without auth

1. Verify config.toml changes are saved
2. Redeploy functions: `supabase functions deploy`
3. Check Supabase Dashboard → Edge Functions for current config

### Cannot get token for testing

1. Verify verify-access-code is deployed
2. Check ACCESS_CODE_HASH is set correctly
3. Check the hash matches your test code
