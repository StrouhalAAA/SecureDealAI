# Bug: get-document-url Returns "User not authenticated" Error

## Bug Description

When accessing the production URL at `https://secure-deal-ai-web.vercel.app/opportunity/505d8171-ebb1-4034-b3dd-89bda16d3bc2`, the `get-document-url` Edge Function returns an unauthorized error:

```json
{"error":"User not authenticated","code":"UNAUTHORIZED"}
```

The curl command shows the frontend is sending the Supabase **anon key** as the Authorization Bearer token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbXlnbWJ4dGRndWpreXRweGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTE2OTUsImV4cCI6MjA4MjUyNzY5NX0...
```

This JWT has `"role":"anon"` and is NOT a user session token, so `userClient.auth.getUser()` fails.

**Expected Behavior**: Document preview should work for users who have access to the buying opportunity.

**Actual Behavior**: All requests fail with "User not authenticated" because there's no user authentication system implemented yet.

## Problem Statement

The `get-document-url` Edge Function was designed with user authentication in mind (Phase 5), but the authentication system is only partially implemented:

1. **config.toml has `verify_jwt = false`**: Allows requests through Supabase Gateway
2. **Function code calls `auth.getUser()`**: Expects a valid user session JWT
3. **Frontend has no auth flow**: Only sends the anon key, not a user token
4. **Phase 5 is incomplete**: Tasks 5.2-5.7 (JWT verification, auth store, access code page, route guards) are pending

This creates a broken state where requests pass the gateway but fail at the function level.

## Solution Statement

**Short-term fix (recommended)**: Remove the user authentication requirement from `get-document-url` to match the current MVP state where `verify_jwt = false`. Use RLS policies on `buying_opportunities` table with the service client as a fallback authorization check.

This maintains the same security model as other Edge Functions (`document-upload`, `ocr-extract`, etc.) that also have `verify_jwt = false` and work in production.

**Alternative (not recommended now)**: Complete Phase 5 implementation first. This would require implementing all pending tasks (5.2-5.7) before the document preview works.

## Steps to Reproduce

1. Open production URL: `https://secure-deal-ai-web.vercel.app/opportunity/505d8171-ebb1-4034-b3dd-89bda16d3bc2`
2. Navigate to document preview section
3. Observe network request to `/functions/v1/get-document-url` fails
4. Check response: `{"error":"User not authenticated","code":"UNAUTHORIZED"}`

Or via curl:
```bash
curl -X POST 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/get-document-url' \
  -H 'Content-Type: application/json' \
  -H 'apikey: <ANON_KEY>' \
  -H 'authorization: Bearer <ANON_KEY>' \
  --data-raw '{"spz":"3828KASA","document_type":"ORV"}'
```

## Root Cause Analysis

The root cause is a **design mismatch** between the Edge Function implementation and the current system state:

### Timeline of Events:
1. `get-document-url` was created with `verifyUserAccess()` function that calls `userClient.auth.getUser()`
2. This design assumed Phase 5 would be implemented where users authenticate via access code
3. Phase 5 was started but only Task 5.1 (verify-access-code function) is complete
4. Tasks 5.2-5.7 (JWT verification, frontend auth, etc.) are pending
5. The function was deployed in a half-implemented auth state

### Why the Error Occurs:
```typescript
// get-document-url/index.ts line 139-145
const { data: { user }, error: authError } = await userClient.auth.getUser();

if (authError || !user) {
  return { authorized: false, error: "User not authenticated" };  // <-- This triggers
}
```

The `supabase.auth.getUser()` call attempts to decode the Authorization header as a user JWT. Since the frontend sends the anon key (not a user session JWT), decoding fails.

## Issues Identified

### Issue 1: Function Auth Check Incompatible with Current MVP State
- **Error Pattern**: `{"error":"User not authenticated","code":"UNAUTHORIZED"}`
- **Category**: Backend / Edge Function
- **Affected Files**: `supabase/functions/get-document-url/index.ts`
- **Root Cause**: Function expects user JWT but system has no user authentication
- **Fix Approach**: Remove user auth check, rely on SPZ-based access (matching MVP pattern)

## Relevant Files

### Files to Modify
- `supabase/functions/get-document-url/index.ts`
  - Remove `createSupabaseUserClient()` function
  - Simplify `verifyUserAccess()` to use service client for SPZ lookup
  - Remove `auth.getUser()` call

### Reference Files (for pattern consistency)
- `supabase/functions/document-upload/index.ts` - Works without user auth
- `supabase/functions/ocr-extract/index.ts` - Works without user auth
- `supabase/config.toml` - Already has `verify_jwt = false` for this function

### New Files
None required.

## Step by Step Tasks

### Step 1: Read Current Implementation
- Read `supabase/functions/get-document-url/index.ts` to understand current auth flow
- Identify the `verifyUserAccess()` function and `createSupabaseUserClient()` function
- Note lines 87-104 (userClient), 133-173 (verifyUserAccess)

### Step 2: Simplify Authorization Logic
- Remove the `createSupabaseUserClient()` function entirely
- Modify `verifyUserAccess()` to use the service client instead
- Remove the `auth.getUser()` call
- Keep the SPZ existence check against `buying_opportunities` table using service client

The simplified flow should be:
1. Validate request body (SPZ, document_type)
2. Check if buying opportunity with this SPZ exists (using service client)
3. Get document path from `ocr_extractions`
4. Generate signed URL

### Step 3: Update handleGetDocumentUrl Function
- Remove `userClient` variable and usage
- Pass only `serviceClient` to `verifyUserAccess()`
- Simplify the authorization check to just verify SPZ exists

### Step 4: Deploy Updated Function
```bash
cd /Users/jakubstrouhal/Documents/SecureDealAI
supabase functions deploy get-document-url
```

### Step 5: Test Production Endpoint
```bash
# Test with anon key - should now work
curl -X POST 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/get-document-url' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbXlnbWJ4dGRndWpreXRweGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTE2OTUsImV4cCI6MjA4MjUyNzY5NX0.cXRvo0nZIC1RH3KrrGCSfu7ytEBGapb8n46bnmu0otQ' \
  -d '{"spz":"3828KASA","document_type":"ORV"}'
```

Expected responses:
- **If document exists**: `{"url":"https://...signed-url...","expires_in":900}`
- **If SPZ not found**: `{"error":"Buying opportunity not found","code":"NOT_FOUND"}`
- **If document not uploaded**: `{"error":"Document not found","code":"NOT_FOUND"}`

### Step 6: Test Frontend
1. Open `https://secure-deal-ai-web.vercel.app/opportunity/505d8171-ebb1-4034-b3dd-89bda16d3bc2`
2. Navigate to document preview
3. Verify documents load without UNAUTHORIZED error

### Step 7: Run Validation Commands

## Database Changes

None required. The function already queries:
- `buying_opportunities` table to verify SPZ exists
- `ocr_extractions` table to get document path

These tables already exist with appropriate indexes.

## Testing Strategy

### Regression Tests
1. Valid SPZ with existing document returns signed URL
2. Valid SPZ without document returns 404 "Document not found"
3. Invalid SPZ returns 404 "Buying opportunity not found"
4. Invalid document_type returns 400 validation error
5. OPTIONS preflight returns 204 with CORS headers

### Edge Cases
1. SPZ with different case (should normalize to uppercase)
2. SPZ with spaces (should be stripped)
3. Multiple documents for same SPZ/type (should return latest)
4. Expired document path in database (storage will return error)

## Validation Commands

Execute every command to validate the bug is fixed with zero regressions.

```bash
# 1. Test Supabase connection
npm run test:db

# 2. Deploy the function
supabase functions deploy get-document-url

# 3. Verify function is deployed
supabase functions list

# 4. Test OPTIONS preflight
curl -X OPTIONS 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/get-document-url' \
  -H 'Origin: https://secure-deal-ai-web.vercel.app' \
  -H 'Access-Control-Request-Method: POST' \
  -w "\nHTTP Status: %{http_code}"
# Expected: HTTP 204

# 5. Test POST with valid SPZ (replace with known SPZ)
curl -X POST 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/get-document-url' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbXlnbWJ4dGRndWpreXRweGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTE2OTUsImV4cCI6MjA4MjUyNzY5NX0.cXRvo0nZIC1RH3KrrGCSfu7ytEBGapb8n46bnmu0otQ' \
  -d '{"spz":"3828KASA","document_type":"ORV"}'
# Expected: URL or 404 (NOT 403 UNAUTHORIZED)

# 6. Build frontend
cd apps/web && npm run build
```

## Notes

### Security Considerations

**Q: Is removing user auth a security risk?**

A: No, for the MVP. The current security model is:
1. `verify_jwt = false` for all Edge Functions (already the case)
2. Service role key used internally for database operations
3. SPZ-based access - if you know the SPZ, you can access documents

This matches other functions like `document-upload`, `ocr-extract`, `validation-run` which all work without user authentication.

**Future Improvement**: When Phase 5 is complete, the auth flow will be:
1. User enters access code → gets JWT
2. JWT sent with all API requests
3. `verify_jwt = true` enforced at gateway level
4. RLS policies check JWT claims

### Relationship to Phase 5

This fix is a **temporary workaround** until Phase 5 is complete. The proper solution is:
1. Complete Phase 5 tasks (5.2-5.7)
2. Re-enable user auth check in `get-document-url` using the new JWT system
3. Set `verify_jwt = true` in config.toml for protected functions

### Why Not Just Complete Phase 5 Now?

Phase 5 requires ~8+ hours of implementation across 6 tasks. This bug fix is ~30 minutes and unblocks production immediately. Phase 5 can be completed as a separate initiative.
