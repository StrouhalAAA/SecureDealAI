# Bug: Edge Functions Not Deployed (CORS/406 Errors)

## Bug Description
Multiple Supabase Edge Functions (`ares-lookup`, `document-upload`) are returning 406 and CORS errors when called from the frontend at `http://localhost:5173`. The browser console shows:
- `Failed to load resource: the server responded with a status of 406 ()`
- `Access to fetch blocked by CORS policy: Response to preflight request doesn't pass access control check`
- `net::ERR_FAILED`

**Expected behavior**: Edge Functions should respond with proper CORS headers and execute the function logic.

**Actual behavior**: Supabase returns `{"code":"NOT_FOUND","message":"Requested function was not found"}` with a 404 status, which the browser interprets as a CORS failure.

## Problem Statement
The Edge Functions exist in the codebase (`supabase/functions/`) but have not been deployed to the remote Supabase project (`bdmygmbxtdgujkytpxha`). The Supabase Edge Runtime returns 404 for non-existent functions, and since there's no function handler to respond to CORS preflight (OPTIONS) requests, the browser blocks the request as a CORS violation.

## Solution Statement
Deploy all Edge Functions to the remote Supabase project using `supabase functions deploy`. Ensure the required secrets (SUPABASE_SERVICE_ROLE_KEY, MISTRAL_API_KEY) are set on the remote project.

## Steps to Reproduce
1. Start the frontend dev server: `npm run dev`
2. Navigate to a Vendor form and enter a valid IČO (e.g., `87531470`)
3. Observe the ARES lookup attempt fails with CORS/406 error
4. Alternatively, run:
   ```bash
   curl "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/ares-lookup/87531470"
   ```
   Response: `{"code":"NOT_FOUND","message":"Requested function was not found"}`

## Root Cause Analysis
The Edge Functions are present locally in the `supabase/functions/` directory but have never been deployed to the remote Supabase project. When the frontend makes a request to these function endpoints:

1. Browser sends an OPTIONS preflight request (CORS)
2. Supabase Edge Runtime returns 404 "function not found"
3. The 404 response doesn't include proper CORS headers
4. Browser blocks the actual request as a CORS policy violation
5. The original 406 error may have been from an earlier deployment state or intermediary caching

The key insight is that the **functions simply don't exist on the remote server**.

## Relevant Files
Use these files to fix the bug:

- `supabase/functions/ares-lookup/index.ts` - ARES lookup function that needs deployment
- `supabase/functions/document-upload/index.ts` - Document upload function that needs deployment
- `supabase/functions/validation-run/index.ts` - Validation engine that needs deployment
- `supabase/functions/ocr-extract/index.ts` - OCR extraction function that needs deployment
- `supabase/functions/ares-validate/index.ts` - ARES validation function that needs deployment
- `supabase/functions/validation-preview/index.ts` - Validation preview that needs deployment
- `supabase/functions/buying-opportunity/index.ts` - CRUD function that needs deployment
- `supabase/functions/vehicle/index.ts` - Vehicle CRUD function that needs deployment
- `supabase/functions/vendor/index.ts` - Vendor CRUD function that needs deployment
- `supabase/.env.local` - Contains required secrets that must be set on remote project

### New Files
No new files need to be created.

## Step by Step Tasks

### Step 1: Verify Supabase CLI is linked to the project
- Run `supabase link --project-ref bdmygmbxtdgujkytpxha` to link to the remote project
- If prompted, enter the database password or use `--password` flag

### Step 2: Set required secrets on remote project
- Run:
  ```bash
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
  supabase secrets set MISTRAL_API_KEY="<your-mistral-api-key>"
  ```
- Get the actual values from your Supabase dashboard and Mistral console

### Step 3: Deploy all Edge Functions
- Deploy each function individually:
  ```bash
  supabase functions deploy ares-lookup
  supabase functions deploy document-upload
  supabase functions deploy validation-run
  supabase functions deploy ocr-extract
  supabase functions deploy ares-validate
  supabase functions deploy validation-preview
  supabase functions deploy buying-opportunity
  supabase functions deploy vehicle
  supabase functions deploy vendor
  ```
- Or deploy all at once:
  ```bash
  supabase functions deploy
  ```

### Step 4: Verify deployment
- Test the ARES lookup endpoint directly:
  ```bash
  curl "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/ares-lookup/87531470" \
    -H "Authorization: Bearer sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t"
  ```
- Expected: JSON response with company data or "not found" message (not 404)

### Step 5: Test CORS preflight
- Verify OPTIONS requests work:
  ```bash
  curl -X OPTIONS "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/ares-lookup/87531470" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization, content-type" -v
  ```
- Expected: 204 response with `Access-Control-Allow-Origin: *`

### Step 6: Test frontend functionality
- Start the frontend dev server: `npm run dev`
- Navigate to the Vendor form
- Enter a valid IČO and verify ARES lookup works
- Upload a document and verify document-upload works

### Step 7: Run validation commands

## Database Changes
No database changes are required. The functions interact with existing tables.

## Testing Strategy

### Regression Tests
- All Edge Function endpoints should return appropriate status codes (not 404)
- CORS preflight (OPTIONS) requests should return 204 with proper headers
- Frontend ARES lookup should auto-fill vendor form fields
- Document upload should create ocr_extractions records
- Validation run should execute and store results

### Edge Cases
- Invalid IČO format should return 400 (not 404)
- Non-existent company should return 404 from function (not Supabase gateway)
- Missing authorization header should return 401/403
- Large file uploads should be handled correctly

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `supabase functions list` - Verify all functions are deployed
- `curl "https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/ares-lookup/87531470" -H "Authorization: Bearer sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t"` - Test ARES lookup
- `npm run test:db` - Test Supabase connection
- `cd apps/web && npm run build` - Build frontend

## Notes
- The 406 status code mentioned in the original error may have been from browser caching or an intermediate state. The underlying issue is 404 "function not found".
- After deployment, the functions may take a few seconds to become available due to cold start.
- Consider adding a CI/CD step to automatically deploy Edge Functions on merge to main.
- The secrets contain sensitive keys - ensure they are properly secured and not committed to version control.
