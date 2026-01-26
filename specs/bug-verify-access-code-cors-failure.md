# Bug: verify-access-code CORS/WORKER_ERROR preventing login

## Bug Description
The `verify-access-code` Edge Function is returning HTTP 500 with `{"code":"WORKER_ERROR","message":"Function exited due to an error (please check logs)"}` for ALL requests, including CORS preflight OPTIONS requests. This causes browsers to interpret it as a CORS policy violation since the preflight fails with 500 instead of returning proper CORS headers.

**Expected behavior**: The function should accept POST requests with access codes and return JWT tokens for valid codes.

**Actual behavior**:
- Browser shows: "Access to fetch at '...verify-access-code' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status."
- Direct curl requests return: HTTP 500 WORKER_ERROR
- Frontend displays: "Network error. Please check your connection."

## Problem Statement
The Supabase Edge Function `verify-access-code` crashes during initialization or request handling, returning HTTP 500 for all requests. Since the OPTIONS preflight request also fails with 500, browsers block the subsequent POST request as a CORS failure. This completely blocks user authentication at `https://secure-deal-ai-web.vercel.app/access-code`.

## Solution Statement
The issue is most likely caused by missing environment secrets (`ACCESS_CODE_HASH` and `JWT_SECRET`) on the production Edge Function deployment. The fix involves:
1. Verifying and setting the required Supabase secrets
2. Re-deploying the Edge Function to ensure fresh worker state

## Steps to Reproduce
1. Navigate to `https://secure-deal-ai-web.vercel.app/access-code`
2. Enter any access code and click "Access Application"
3. Observe the browser console error: "CORS policy: Response to preflight request doesn't pass access control check"
4. Observe the network tab shows OPTIONS request to `verify-access-code` returning HTTP 500

Direct verification via curl:
```bash
# This should return 200 with "ok" but returns 500 WORKER_ERROR
curl -X OPTIONS "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code" \
  -H "Origin: https://secure-deal-ai-web.vercel.app" \
  -H "Access-Control-Request-Method: POST"

# This should return 401/200 but returns 500 WORKER_ERROR
curl -X POST "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code" \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'
```

## Root Cause Analysis
**Primary hypothesis: Missing environment secrets**

The `verify-access-code` Edge Function requires two critical environment secrets that may not be set in production:
- `ACCESS_CODE_HASH` - SHA-256 hash of valid access code(s)
- `JWT_SECRET` - Secret key for signing JWT tokens (must match Supabase project JWT secret)

When these are missing, the function attempts to read them via `Deno.env.get()` and returns `undefined`. This causes either:
1. A crash during initialization if the code accesses these early
2. A 500 error when the validation logic checks for missing configuration

**Evidence supporting this hypothesis:**
1. The function code at lines 232-248 explicitly checks for these variables and logs errors when missing
2. The local `.env.local` file does NOT contain `ACCESS_CODE_HASH` or `JWT_SECRET`
3. This is a recurring issue ("has been occurring in the past three sessions") which suggests persistent misconfiguration rather than transient failure
4. A similar WORKER_ERROR bug with the `rules` function (see `specs/bug-rules-api-worker-error.md`) was resolved by re-deployment

**Secondary hypothesis: Stale/corrupted deployment**

As seen with the previous `rules` function bug, Supabase Edge Functions can sometimes have stale or corrupted worker state. Re-deployment refreshes the worker and resolves the issue.

## Issues Identified

### Issue 1: Missing Production Environment Secrets
- **Error Pattern**: HTTP 500 WORKER_ERROR on all requests (OPTIONS, POST)
- **Category**: Backend / Configuration
- **Affected Files**:
  - `supabase/functions/verify-access-code/index.ts` (lines 232-248)
  - Production Supabase secrets configuration
- **Root Cause**: Required environment secrets `ACCESS_CODE_HASH` and `JWT_SECRET` are not set in Supabase production secrets
- **Fix Approach**:
  1. Generate SHA-256 hash of the desired access code
  2. Set both secrets using `supabase secrets set`
  3. Re-deploy the function

### Issue 2: Misleading Error Message in Frontend
- **Error Pattern**: Browser shows "CORS policy" error when actual issue is server crash
- **Category**: Frontend / UX
- **Affected Files**: `apps/web/src/composables/useAuth.ts` (lines 54-60)
- **Root Cause**: The frontend catch block shows "Network error. Please check your connection." which doesn't indicate the actual server-side issue
- **Fix Approach**: (Optional enhancement) Add more specific error handling to distinguish between network errors and server errors

## Relevant Files
Use these files to fix the bug:

- `supabase/functions/verify-access-code/index.ts` - The Edge Function that's crashing; check environment variable handling at lines 229-249
- `supabase/.env.local` - Local environment file (reference only); note it's missing `ACCESS_CODE_HASH` and `JWT_SECRET`
- `supabase/config.toml` - Confirms `verify_jwt = false` is correctly set for this function
- `docs/implementation/05_01_VERIFY_ACCESS_CODE.md` - Documentation with setup instructions for secrets (Step 5)
- `apps/web/src/composables/useAuth.ts` - Frontend code calling the endpoint; error handling could be improved

### New Files
None required.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Verify Current Supabase Secrets
- Run `supabase secrets list` to check which secrets are currently set
- Look for `ACCESS_CODE_HASH` and `JWT_SECRET` in the output
- If missing, proceed to step 2

### 2. Generate Access Code Hash
- Choose a secure access code (e.g., "MySecureCode2025")
- Generate SHA-256 hash: `echo -n "MySecureCode2025" | shasum -a 256`
- Save the hash output for the next step

### 3. Get Supabase JWT Secret
- Go to Supabase Dashboard: https://supabase.com/dashboard/project/bdmygmbxtdgujkytpxha/settings/api
- Under "Project API keys", find "JWT Secret"
- Copy this value (it must be the SAME secret Supabase uses to verify JWTs)

### 4. Set Production Secrets
- Set both required secrets:
  ```bash
  supabase secrets set ACCESS_CODE_HASH="<sha256_hash_from_step_2>"
  supabase secrets set JWT_SECRET="<jwt_secret_from_step_3>"
  ```
- Verify secrets are set: `supabase secrets list`

### 5. Re-deploy the Edge Function
- Deploy the function to refresh the worker:
  ```bash
  supabase functions deploy verify-access-code
  ```
- Wait for deployment to complete

### 6. Verify the Fix - Direct API Test
- Test OPTIONS preflight:
  ```bash
  curl -s -X OPTIONS "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code" \
    -H "Origin: https://secure-deal-ai-web.vercel.app" \
    -H "Access-Control-Request-Method: POST" \
    -w "\nHTTP Status: %{http_code}\n"
  ```
  Expected: HTTP 200 with "ok" body

- Test POST with invalid code:
  ```bash
  curl -s -X POST "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code" \
    -H "Content-Type: application/json" \
    -d '{"code":"wrongcode"}' \
    -w "\nHTTP Status: %{http_code}\n"
  ```
  Expected: HTTP 401 with `{"success":false,"error":"INVALID_CODE",...}`

- Test POST with valid code:
  ```bash
  curl -s -X POST "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code" \
    -H "Content-Type: application/json" \
    -d '{"code":"MySecureCode2025"}' \
    -w "\nHTTP Status: %{http_code}\n"
  ```
  Expected: HTTP 200 with `{"success":true,"token":"...","expires_at":"..."}`

### 7. Verify the Fix - Frontend Test
- Open `https://secure-deal-ai-web.vercel.app/access-code` in browser
- Enter the valid access code
- Verify successful login and redirect to dashboard
- Check browser console for any errors

### 8. Run Validation Commands
Execute the validation commands listed below.

## Database Changes
None required. The `access_code_attempts` table (migration 012) should already exist from previous deployment.

## Testing Strategy

### Regression Tests
1. Test login flow with valid access code - should succeed and redirect
2. Test login flow with invalid access code - should show error with remaining attempts
3. Test rate limiting - after 5 failed attempts, should show lockout message
4. Test token expiry - JWT should expire after 24 hours
5. Test protected endpoints - other Edge Functions should accept the issued JWT

### Edge Cases
1. Empty code submission - should return 400 INVALID_REQUEST
2. Whitespace-only code - should return 400 INVALID_REQUEST
3. Very long code (>1000 chars) - should handle gracefully
4. Multiple rapid requests - rate limiting should engage after 5 failures
5. Token reuse - same token should work for multiple API calls within expiry window

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Test CORS preflight
curl -s -X OPTIONS "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code" \
  -H "Origin: https://secure-deal-ai-web.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -w "\nHTTP Status: %{http_code}\n"
# Expected: HTTP 200

# Test POST endpoint responds (not WORKER_ERROR)
curl -s -X POST "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code" \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}' \
  -w "\nHTTP Status: %{http_code}\n"
# Expected: HTTP 401 (not 500)

# Build frontend (ensure no compilation errors)
cd apps/web && npm run build
```

## Notes
- **Recurring issue**: This is the third session with this bug, indicating persistent misconfiguration rather than transient failure
- **Similar past bug**: The `rules` Edge Function had a similar WORKER_ERROR issue (see `specs/bug-rules-api-worker-error.md`) that was resolved by re-deployment
- **Security note**: The `ACCESS_CODE_HASH` must be the SHA-256 hash of the actual access code, NOT the plaintext code
- **JWT compatibility**: The `JWT_SECRET` MUST be Supabase's project JWT secret (found in Dashboard > Settings > API) for tokens to work with other protected endpoints
- **Local development**: Add `ACCESS_CODE_HASH` and `JWT_SECRET` to `supabase/.env.local` for local testing with `supabase functions serve`
