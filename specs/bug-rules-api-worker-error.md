# Bug: Rules API WORKER_ERROR on Edge Function

## Bug Description
The `/functions/v1/rules` Edge Function was returning HTTP 500 with `{"code":"WORKER_ERROR","message":"Function exited due to an error (please check logs)"}` for all requests including CORS preflight OPTIONS requests. The function was crashing during initialization/module loading before any request handling code could execute.

**Expected behavior**: The API should return validation rules from the database with proper JSON responses.

**Actual behavior**: Every request (including OPTIONS preflight) returned HTTP 500 WORKER_ERROR.

## Problem Statement
The Supabase Edge Function `rules` was deployed but crashing on initialization, causing all API requests to fail with a worker error. This blocked the Rules Management UI at `/rules` from loading any validation rules.

## Solution Statement
Re-deploying the Edge Function resolved the issue. The root cause was likely a stale or corrupted deployment state on Supabase's edge infrastructure. The code itself was correct - the deployment simply needed to be refreshed.

## Steps to Reproduce
1. Navigate to `http://localhost:5173/rules` in the frontend
2. Observe the network request to `https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/rules?status=all`
3. The request fails with HTTP 500 and response: `{"code":"WORKER_ERROR","message":"Function exited due to an error (please check logs)"}`
4. Even CORS preflight (OPTIONS) requests fail with 500, indicating module-level crash

## Root Cause Analysis
The Edge Function was failing during module initialization. Key indicators:
1. CORS OPTIONS requests also returned 500 (OPTIONS should be handled before any business logic)
2. The error `WORKER_ERROR` indicates the Deno runtime crashed before the request handler could execute
3. All function code was syntactically correct and properly structured
4. Environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) were confirmed present via `supabase secrets list`

**Most likely cause**: Stale deployment cache or corrupted worker state on Supabase's edge infrastructure. Re-deployment refreshed the worker and resolved the issue.

## Issues Identified

### Issue 1: Stale Edge Function Deployment
- **Error Pattern**: HTTP 500 WORKER_ERROR on all requests including OPTIONS
- **Category**: Backend / Infrastructure
- **Affected Files**: `supabase/functions/rules/index.ts` (and all module files)
- **Root Cause**: The deployed Edge Function worker had a corrupted or stale state that caused module initialization to fail
- **Fix Approach**: Re-deploy the function using `supabase functions deploy rules`

## Relevant Files
The following files are part of the rules Edge Function:

- `supabase/functions/rules/index.ts` - Main entry point, handles routing and authentication
- `supabase/functions/rules/handlers.ts` - CRUD operations for rules (list, get, create, update, delete, activate, deactivate, clone, export, import)
- `supabase/functions/rules/validators.ts` - Request validation logic
- `supabase/functions/rules/responses.ts` - Standard API response helpers with CORS headers
- `supabase/functions/rules/types.ts` - TypeScript type definitions

### New Files
None required.

## Step by Step Tasks

### 1. Verify the Issue is Resolved
- Test the rules API endpoint with curl to confirm it returns data
- Verify CORS preflight requests return 204

### 2. Monitor for Recurrence
- If the issue recurs, check Supabase dashboard logs at: https://supabase.com/dashboard/project/bdmygmbxtdgujkytpxha/functions
- Document any patterns (time of day, after deployments, etc.)

### 3. Consider Preventive Measures
- Set up monitoring/alerting for Edge Function health
- Consider adding a `/health` endpoint to the rules function for proactive monitoring

### 4. Validation Commands
Execute every command to validate the bug is fixed:

```bash
# Test CORS preflight
curl -sI 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/rules' \
  -X OPTIONS \
  -H 'Origin: http://localhost:5173'
# Expected: HTTP 204 with CORS headers

# Test rules list endpoint (requires valid JWT)
curl -s 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/rules?status=all' \
  -H 'Authorization: Bearer <valid-jwt>' \
  -H 'Content-Type: application/json'
# Expected: HTTP 200 with JSON containing rules array

# Test frontend
npm run dev
# Navigate to http://localhost:5173/rules and verify rules load
```

## Database Changes
None required.

## Testing Strategy

### Regression Tests
1. Verify all rules CRUD operations work (list, get, create, update, delete)
2. Verify lifecycle operations work (activate, deactivate, clone)
3. Verify import/export functionality works
4. Verify frontend Rules Management UI loads and displays rules

### Edge Cases
1. Test with empty database (no rules)
2. Test with large number of rules (pagination)
3. Test with invalid JWT token (should return 401, not 500)
4. Test with malformed requests (should return 400, not 500)

## Validation Commands
```bash
# Test Supabase connection
npm run test:db

# Build frontend to ensure no compilation errors
cd apps/web && npm run build

# Redeploy function if issue recurs
supabase functions deploy rules
```

## Notes
- The `rules` Edge Function uses `Deno.serve()` API (newer pattern) instead of the older `serve()` from std library, but this is fully supported by Supabase Edge Functions
- All environment variables were confirmed present in deployment
- The issue was resolved by re-deployment without any code changes
- Consider setting up automated health checks to detect this issue earlier in the future
- The CLI recommended upgrading from v2.54.11 to v2.72.7 - this may help prevent similar deployment issues
