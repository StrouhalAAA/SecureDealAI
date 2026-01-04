# Bug: Invalid Supabase API Key Causing 406 Errors

## Bug Description
The opportunity detail page (`/opportunity/{id}`) fails to load any data. Multiple REST API calls to Supabase return **406 Not Acceptable** errors, and document uploads via the `ocr-extract` Edge Function return **500 Internal Server Error**.

**Symptoms:**
- All Supabase REST API calls fail with 406 status code
- `ocr-extract` Edge Function calls fail with 500 status code
- Unable to upload documents (ORV, VTP, OP)
- Data tables (vehicles, vendors, validation_results) cannot be queried

**Expected behavior:** REST API calls should succeed with 200 status, Edge Functions should process documents correctly.

## Problem Statement
The frontend application is configured with an **invalid Supabase API key** that does not conform to the JWT format required by Supabase. This causes all authenticated requests to fail with a 406 error.

## Solution Statement
Replace the invalid placeholder API key with the correct JWT-formatted anon key from the Supabase project dashboard. This requires:
1. Getting the correct anon key from Supabase dashboard
2. Updating the frontend `.env` file with the valid key
3. Verifying Edge Function secrets are correctly configured

## Steps to Reproduce
1. Navigate to `http://localhost:5173/opportunity/c52b6dce-14b4-4338-8cb8-2ba865348242`
2. Open browser DevTools → Network tab
3. Observe all requests to `bdmygmbxtdgujkytpxha.supabase.co/rest/v1/*` fail with 406
4. Try uploading a document (e.g., ORV PDF)
5. Observe the `ocr-extract` request fails with 500

## Root Cause Analysis

### Primary Root Cause: Invalid API Key Format
The `.env` file contains:
```
VITE_SUPABASE_ANON_KEY=sb_publishable_2pMpwsgh80OklYx8zWH1Tg_TirUDW3t
```

This is **NOT** a valid Supabase anon key. Valid Supabase anon keys are JWT tokens with the format:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...
```

The `sb_publishable_*` format appears to be a placeholder or incorrectly formatted key. When Supabase receives a request with an invalid API key:
- It cannot decode the JWT to verify authentication
- It returns **406 Not Acceptable** because the `apikey` header value is malformed
- All subsequent database queries fail

### Secondary Root Cause: Edge Function Auth
The Edge Functions receive the invalid key in the `Authorization` header:
```typescript
Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
```

This causes authentication to fail before the function logic executes, resulting in 500 errors.

## Issues Identified

### Issue 1: Invalid Frontend Supabase Anon Key
- **Error Pattern**: `406 Not Acceptable` on `/rest/v1/vehicles`, `/rest/v1/vendors`, `/rest/v1/validation_results`
- **Category**: Frontend / Configuration
- **Affected Files**:
  - `apps/web/.env` - Contains invalid key
  - `apps/web/src/composables/useSupabase.ts` - Uses the key
  - `apps/web/src/composables/useDetailData.ts` - Makes failing queries
- **Root Cause**: `VITE_SUPABASE_ANON_KEY` is not a valid JWT token
- **Fix Approach**: Replace with correct anon key from Supabase dashboard (Project Settings → API → `anon public` key)

### Issue 2: Edge Function Authentication Failure
- **Error Pattern**: `500 Internal Server Error` on `/functions/v1/ocr-extract`
- **Category**: Backend / Edge Functions
- **Affected Files**:
  - `apps/web/src/components/ocr/DocumentUpload.vue` - Sends invalid auth header
  - `supabase/functions/ocr-extract/index.ts` - Receives invalid auth
  - `supabase/functions/document-upload/index.ts` - Receives invalid auth
- **Root Cause**: Authorization header contains invalid Bearer token
- **Fix Approach**: Fix the anon key (Issue 1 fix resolves this)

### Issue 3: Backend Environment Configuration
- **Error Pattern**: Potential 500 errors even after frontend fix
- **Category**: Backend / Configuration
- **Affected Files**:
  - `supabase/.env.local` - Contains same invalid keys
- **Root Cause**: Local and deployed environment may have invalid or missing secrets
- **Fix Approach**: Ensure `SUPABASE_SERVICE_ROLE_KEY` and `MISTRAL_API_KEY` are correctly configured in Supabase dashboard secrets

## Relevant Files
Use these files to fix the bug:

### Configuration Files
- `apps/web/.env` - **PRIMARY FIX** - Frontend environment variables with invalid anon key
- `apps/web/.env.example` - Template showing required variables
- `supabase/.env.local` - Local Edge Function environment (also has invalid keys)

### Frontend Code (Verification)
- `apps/web/src/composables/useSupabase.ts` - Supabase client initialization using env vars
- `apps/web/src/composables/useDetailData.ts` - Data fetching composable making REST calls
- `apps/web/src/components/ocr/DocumentUpload.vue` - Document upload component calling Edge Functions

### Edge Functions (Verification)
- `supabase/functions/ocr-extract/index.ts` - OCR extraction function
- `supabase/functions/document-upload/index.ts` - Document upload function

### New Files
None required - this is a configuration fix.

## Step by Step Tasks

### Step 1: Obtain Correct API Keys from Supabase Dashboard
- Log into Supabase dashboard at https://supabase.com/dashboard
- Navigate to project `bdmygmbxtdgujkytpxha`
- Go to **Project Settings** → **API**
- Copy the following keys:
  - `anon public` key (for frontend)
  - `service_role` key (for Edge Functions - handle securely)

### Step 2: Update Frontend Environment File
- Open `apps/web/.env`
- Replace `VITE_SUPABASE_ANON_KEY` with the correct `anon public` JWT key
- Verify the key starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

### Step 3: Update Local Edge Function Environment
- Open `supabase/.env.local`
- Replace `SUPABASE_ANON_KEY` with correct anon key
- Replace `SUPABASE_SERVICE_ROLE_KEY` with correct service role key
- Verify `MISTRAL_API_KEY` is valid

### Step 4: Deploy Edge Function Secrets (if using remote)
- Run: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
- Run: `supabase secrets set MISTRAL_API_KEY=<your-mistral-key>`
- Verify secrets: `supabase secrets list`

### Step 5: Restart Development Server
- Stop the frontend dev server if running
- Run `npm run dev` to restart with new environment variables
- Vite will reload the new `.env` values

### Step 6: Test REST API Calls
- Navigate to an opportunity page
- Open DevTools → Network tab
- Verify REST API calls now return 200 status
- Verify data loads in the UI

### Step 7: Test Document Upload
- Navigate to Step 3 (Document Upload) in an opportunity
- Upload a test document (e.g., `docs/Files&PDFs/5L94454_ORV.pdf`)
- Verify the upload succeeds without 500 errors
- Verify OCR extraction triggers and completes

### Step 8: Run Validation Commands
- Execute all validation commands listed below

## Database Changes
None required - this is a configuration issue, not a schema issue.

## Testing Strategy

### Regression Tests
1. **REST API connectivity**: All CRUD operations on `buying_opportunities`, `vehicles`, `vendors`, `validation_results` tables work
2. **Edge Function connectivity**: `document-upload` and `ocr-extract` functions respond with 200/201 status
3. **Full workflow test**: Create opportunity → Add vehicle → Add vendor → Upload documents → Run validation

### Edge Cases
1. **Invalid document types**: Upload non-PDF/image file should return proper validation error (not 500)
2. **Large files**: Upload file > 10MB should return size validation error
3. **Concurrent uploads**: Multiple document uploads should not interfere with each other
4. **OCR retry**: Failed OCR should allow retry via UI button

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Test Supabase connection
npm run test:db

# Build frontend (verify no env issues)
cd apps/web && npm run build

# Test Edge Function locally (optional)
supabase functions serve validation-run --env-file supabase/.env.local

# Verify REST API connectivity (quick curl test)
curl -X GET "https://bdmygmbxtdgujkytpxha.supabase.co/rest/v1/buying_opportunities?select=*&limit=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Notes

### Where to Find Correct API Keys
1. Go to: https://supabase.com/dashboard/project/bdmygmbxtdgujkytpxha/settings/api
2. The "anon public" key under "Project API keys" section
3. The key should be a long JWT string (~200+ characters)

### Security Considerations
- Never commit real API keys to version control
- The `.env` file should be in `.gitignore`
- Service role key should ONLY be used in backend/Edge Functions
- Anon key is safe for frontend use (it's designed to be public)

### Supabase Key Format Reference
| Key Type | Format | Safe for Frontend |
|----------|--------|-------------------|
| Anon Key | `eyJhbGciOiJIUzI1NiIs...` (JWT) | Yes |
| Service Role | `eyJhbGciOiJIUzI1NiIs...` (JWT) | **NO** |
| Placeholder | `sb_publishable_*`, `sb_secret_*` | Invalid |

### Common Mistake
The `sb_publishable_*` and `sb_secret_*` formats seen in the `.env` files appear to be a misunderstanding of Supabase key naming. These are NOT valid Supabase API keys - they look like they might be from a different service or are placeholders from documentation examples.
