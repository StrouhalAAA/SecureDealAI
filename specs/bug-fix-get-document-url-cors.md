# Bug: get-document-url Edge Function CORS/404 Error

## Bug Description
When the frontend calls the `get-document-url` Edge Function to retrieve signed URLs for document preview, the request fails with a CORS error. The browser reports that the preflight OPTIONS request does not receive HTTP OK status. Additionally, a 406 (Not Acceptable) error appears in the console.

**Expected Behavior**: The Edge Function should respond to OPTIONS preflight with 204 and proper CORS headers, then process POST requests to return signed document URLs.

**Actual Behavior**: The request fails because the Edge Function is not deployed to Supabase. The Supabase gateway returns 404 NOT_FOUND without CORS headers, causing the browser to interpret this as a CORS policy violation.

## Problem Statement
The `get-document-url` Edge Function exists locally in the codebase but has never been deployed to the Supabase project. This causes all requests to fail with a 404, which manifests as a CORS error in the browser.

## Solution Statement
Deploy the `get-document-url` Edge Function to Supabase using `supabase functions deploy`. The function code already has correct CORS handling - it just needs to be deployed.

## Steps to Reproduce
1. Start the local development server: `npm run dev`
2. Navigate to a buying opportunity with uploaded documents
3. Attempt to preview a document (ORV, VTP, or OP)
4. Observe the CORS error in browser console

## Root Cause Analysis
The root cause is that the `get-document-url` Edge Function was created locally but never deployed to Supabase. Evidence:

1. **Git status shows untracked files**: The function directory `supabase/functions/get-document-url/` is untracked in git, indicating it was never committed or deployed
2. **Direct curl test returns 404**: Testing the endpoint directly returns `{"code":"NOT_FOUND","message":"Requested function was not found"}`
3. **Browser CORS error is secondary**: Browsers interpret a 404 without CORS headers as a CORS policy violation during preflight

The function code itself is correct - it has proper CORS headers and OPTIONS handling matching other working Edge Functions in the project.

## Issues Identified

### Issue 1: Edge Function Not Deployed
- **Error Pattern**: `404 NOT_FOUND` from Supabase, interpreted as CORS failure by browser
- **Category**: Backend / Deployment
- **Affected Files**: `supabase/functions/get-document-url/index.ts`
- **Root Cause**: Function exists locally but was never deployed to Supabase Edge Functions
- **Fix Approach**: Deploy using `supabase functions deploy get-document-url`

### Issue 2: Missing Environment Variable (Potential)
- **Error Pattern**: May occur after deployment if `SUPABASE_ANON_KEY` is not set
- **Category**: Backend / Configuration
- **Affected Files**: `supabase/functions/get-document-url/index.ts` (lines 89-90)
- **Root Cause**: Function uses `SUPABASE_ANON_KEY` which may not be set as a secret
- **Fix Approach**: Verify and set required secrets after deployment

## Relevant Files
Use these files to fix the bug:

### Existing Files
- `supabase/functions/get-document-url/index.ts` - The Edge Function that needs deployment. Contains complete implementation with CORS handling, authorization, and signed URL generation.
- `supabase/functions/validation-run/index.ts` - Reference for correct CORS pattern and deployment verification (this function works correctly).

### New Files
None required - the function is already implemented.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Verify Function Code
- Read and verify `supabase/functions/get-document-url/index.ts` is complete
- Confirm CORS headers match the working `validation-run` function pattern
- Check that all environment variables are properly handled

### Step 2: Set Required Supabase Secrets
- Run `supabase secrets list` to check existing secrets
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (required for storage signed URLs)
- Ensure `SUPABASE_ANON_KEY` is set (used for user authentication verification)

### Step 3: Deploy the Edge Function
- Deploy using: `supabase functions deploy get-document-url`
- Wait for deployment confirmation
- Verify function appears in Supabase dashboard

### Step 4: Test the Deployment
- Test OPTIONS preflight:
  ```bash
  curl -X OPTIONS 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/get-document-url' \
    -H 'Origin: http://localhost:5173' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: authorization, content-type, apikey' \
    -w "\nHTTP Status: %{http_code}"
  ```
- Verify response is 204 with proper CORS headers

### Step 5: Test POST Request
- Test with valid authentication (will fail auth without real token, but should not be 404):
  ```bash
  curl -X POST 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/get-document-url' \
    -H 'Content-Type: application/json' \
    -H 'apikey: <ANON_KEY>' \
    --data '{"spz":"5LAD0A0","document_type":"ORV"}' \
    -w "\nHTTP Status: %{http_code}"
  ```
- Verify response is NOT 404 (expect 403 Unauthorized without valid token)

### Step 6: Test Frontend Integration
- Start frontend: `npm run dev`
- Navigate to a buying opportunity with documents
- Attempt to preview a document
- Verify CORS error is resolved

### Step 7: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes
None required. The function queries existing tables (`buying_opportunities`, `ocr_extractions`) using RLS policies.

## Testing Strategy

### Regression Tests
1. Test OPTIONS preflight returns 204 with CORS headers
2. Test POST without auth returns 403 (not 404)
3. Test POST with valid auth returns document URL or appropriate error
4. Test frontend document preview works end-to-end

### Edge Cases
1. Invalid SPZ format - should return 400
2. Non-existent document - should return 404 (document not found, not function not found)
3. Unauthorized user - should return 403
4. Missing document_type - should return 400

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions list` - Verify get-document-url appears in deployed functions
- `cd apps/web && npm run build` - Build frontend
- `curl -X OPTIONS 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/get-document-url' -H 'Origin: http://localhost:5173' -w "\nStatus: %{http_code}"` - Verify CORS preflight works

## Notes
- The CORS error in the browser console is misleading - the actual issue is the function not being deployed (404)
- Browsers interpret any non-success response to preflight OPTIONS without CORS headers as a CORS policy violation
- The 406 error mentioned in the bug report may be from a different request (REST API call) visible in the network tab
- After deployment, ensure the function has access to required environment variables/secrets
