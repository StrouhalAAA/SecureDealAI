# Bug: verify-access-code Edge Function Returns 500 Error

## Bug Description
The production `verify-access-code` Edge Function returns a 500 error with `"Function exited due to an error (please check logs)"`. The frontend catches this error and displays a misleading "Network error. Please check your connection." message to users attempting to log in.

**Expected behavior**: The function should validate the access code and return either a JWT token (success) or an appropriate error response (invalid code, rate limited, etc.).

**Actual behavior**: The function crashes on startup with HTTP 500, preventing all login attempts.

## Problem Statement
The `verify-access-code` Edge Function in production is missing required environment variables (`ACCESS_CODE_HASH` and/or `JWT_SECRET`), causing it to crash immediately. This blocks all authentication flows since this is the only entry point for users.

## Solution Statement
Set the required Supabase secrets in production: `ACCESS_CODE_HASH` (SHA-256 hash of the access code) and `JWT_SECRET` (Supabase's JWT secret from Project Settings > Data API).

## Steps to Reproduce
1. Navigate to the production app: https://secure-deal-ai-web.vercel.app/
2. Enter any access code on the login page
3. Click submit
4. Observe "Network error. Please check your connection." message

Or via curl:
```bash
curl -v https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'
```
Returns: `{"code":"WORKER_ERROR","message":"Function exited due to an error (please check logs)"}`

## Root Cause Analysis
The Edge Function code at `supabase/functions/verify-access-code/index.ts:230-249` checks for required environment variables:

```typescript
const accessCodeHash = Deno.env.get("ACCESS_CODE_HASH");
const jwtSecret = Deno.env.get("JWT_SECRET");

if (!accessCodeHash || !jwtSecret) {
  console.error("Missing auth configuration: ACCESS_CODE_HASH or JWT_SECRET");
  return new Response(
    JSON.stringify({ success: false, error: "SERVER_ERROR", message: "Auth not configured" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

The error response with `WORKER_ERROR` indicates the function is crashing before it can return a proper JSON response. This could mean:
1. The secrets are missing entirely in production
2. The function was never redeployed after local development
3. The secrets were set with incorrect names

The frontend catches the fetch exception (non-JSON or network failure) and shows a generic "Network error" message (`apps/web/src/composables/useAuth.ts:54-59`).

## Issues Identified

### Issue 1: Missing Supabase Secrets
- **Error Pattern**: HTTP 500, `{"code":"WORKER_ERROR","message":"Function exited due to an error (please check logs)"}`
- **Category**: Backend / Configuration
- **Affected Files**:
  - `supabase/functions/verify-access-code/index.ts` (function code - correct)
  - Production Supabase secrets (missing)
- **Root Cause**: Required environment variables `ACCESS_CODE_HASH` and `JWT_SECRET` are not set in production Supabase secrets
- **Fix Approach**: Set the missing secrets using `supabase secrets set`

### Issue 2: Misleading Frontend Error Message (Minor)
- **Error Pattern**: User sees "Network error. Please check your connection."
- **Category**: Frontend / UX
- **Affected Files**: `apps/web/src/composables/useAuth.ts:54-59`
- **Root Cause**: The catch block treats all failures (including 500 errors with non-JSON body) as network errors
- **Fix Approach**: (Optional improvement) Parse HTTP status and show more specific error. However, fixing Issue 1 resolves the immediate problem.

## Relevant Files
Use these files to fix the bug:

- `supabase/functions/verify-access-code/index.ts` - The Edge Function code (correct, no changes needed)
- `supabase/config.toml` - Function configuration showing `verify_jwt = false` (correct)
- `docs/implementation/05_01_VERIFY_ACCESS_CODE.md` - Documentation showing required secrets
- `apps/web/src/composables/useAuth.ts` - Frontend auth logic showing how errors are handled

### New Files
None required.

## Step by Step Tasks

### 1. Verify the Issue in Production
- Run curl command to confirm 500 error:
  ```bash
  curl -v https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code \
    -H "Content-Type: application/json" \
    -d '{"code":"test"}'
  ```
- Confirm response is `{"code":"WORKER_ERROR","message":"Function exited due to an error"}`

### 2. Check Existing Secrets (Manual Step)
- Run `supabase secrets list` to see what secrets are currently set in production
- Verify if `ACCESS_CODE_HASH` and `JWT_SECRET` are present

### 3. Generate ACCESS_CODE_HASH
- Decide on the access code (e.g., `MySecureCode2025`)
- Generate SHA-256 hash:
  ```bash
  echo -n "MySecureCode2025" | shasum -a 256
  ```
- Record the hash (without the trailing ` -`)

### 4. Get JWT_SECRET from Supabase Dashboard
- Go to Supabase Dashboard > Project Settings > Data API
- Copy the "JWT Secret" value
- **IMPORTANT**: This MUST be Supabase's own JWT secret for token verification to work

### 5. Set Production Secrets
- Set the secrets in production:
  ```bash
  supabase secrets set ACCESS_CODE_HASH="<sha256_hash_from_step_3>"
  supabase secrets set JWT_SECRET="<jwt_secret_from_step_4>"
  ```

### 6. Redeploy the Function
- Deploy the function to ensure it picks up the new secrets:
  ```bash
  supabase functions deploy verify-access-code
  ```

### 7. Test Production Endpoint
- Test with curl:
  ```bash
  curl -v https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code \
    -H "Content-Type: application/json" \
    -d '{"code":"MySecureCode2025"}'
  ```
- Verify response is `{"success":true,"token":"...","expires_at":"..."}`

### 8. Test Frontend Login
- Navigate to https://secure-deal-ai-web.vercel.app/
- Enter the access code
- Verify successful login and redirect to dashboard

### 9. Run Validation Commands

## Database Changes
None required - the function and schema are correct. This is purely a configuration issue.

## Testing Strategy

### Regression Tests
- Valid code returns 200 with JWT token
- Invalid code returns 401 with error message
- Missing code returns 400
- OPTIONS request returns 200 (CORS preflight)
- Rate limiting kicks in after 5 failed attempts

### Edge Cases
- Empty string code
- Very long code (should handle gracefully)
- Multiple concurrent requests
- Code with special characters

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Test production endpoint
curl -s https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/verify-access-code \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}' | jq .

# Should no longer return WORKER_ERROR, instead should return proper error response

# Test local build
cd apps/web && npm run build
```

## Notes
- The `config.toml` correctly has `verify_jwt = false` for this function
- The function code itself appears correct - this is a deployment/configuration issue
- The user will need access to the Supabase Dashboard and CLI to set secrets
- For multiple access codes, `ACCESS_CODE_HASH` can be comma-separated hashes
- The JWT_SECRET MUST match Supabase's project JWT secret for PostgREST to validate tokens
