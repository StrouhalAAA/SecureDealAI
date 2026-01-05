# Bug: Rules API Path Mismatch - OpenAPI Spec vs Actual Endpoint

## Bug Description
The Rules API endpoint cannot be reached because there is a mismatch between the OpenAPI specification and the actual Edge Function deployment. The OpenAPI spec defines paths with `/api/v1/` prefix (e.g., `/api/v1/rules`), which when combined with the server base URL `/functions/v1`, results in requests going to `/functions/v1/api/v1/rules`. However, the actual Edge Function is deployed at `/functions/v1/rules` (without the `/api/v1/` prefix).

**Symptoms:**
- API calls from Swagger UI or OpenAPI clients return 404 "Requested function was not found"
- CORS-like error messages due to the failed request
- `Failed to fetch` errors in browser tools

**Expected behavior:**
- `GET /functions/v1/rules?active_only=true&category=vehicle` should work
- Swagger UI should successfully call the Rules API

**Actual behavior:**
- `GET /functions/v1/api/v1/rules?...` returns 404
- Swagger UI fails with CORS/fetch errors

## Problem Statement
The OpenAPI specification (`apps/web/public/openapi.yaml`) has a path prefix mismatch with the deployed Supabase Edge Functions. The Edge Functions are accessed at `/functions/v1/{function-name}` but the OpenAPI spec appends `/api/v1/` to all paths, creating invalid URLs.

## Solution Statement
Fix the OpenAPI specification by removing the `/api/v1/` prefix from all paths. The paths should directly reference the Edge Function names (e.g., `/rules`, `/validate`) since the base server URL already includes `/functions/v1`.

**Two approaches available:**
1. **Fix OpenAPI spec** (recommended) - Remove `/api/v1/` prefix from all paths in `openapi.yaml`
2. **Create API gateway function** - Deploy a new Edge Function that maps `/api/v1/*` routes to existing functions

We recommend approach #1 as it's simpler and aligns documentation with actual implementation.

## Steps to Reproduce
1. Open Swagger UI with the OpenAPI spec (via frontend)
2. Try to execute `GET /api/v1/rules?active_only=true&category=vehicle`
3. Or run the failing curl command:
```bash
curl -X 'GET' \
  'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/api/v1/rules?active_only=true&category=vehicle&include_drafts=false' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <token>'
```
4. Observe 404 error: `{"code":"NOT_FOUND","message":"Requested function was not found"}`

## Root Cause Analysis
The OpenAPI specification was designed with REST-style versioned API paths (`/api/v1/`) but Supabase Edge Functions are inherently identified by their function name directly under `/functions/v1/`.

There is no API gateway or routing mechanism to translate `/api/v1/rules` to `/rules`. The correct working endpoint is:
```
https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/rules
```

Not:
```
https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/api/v1/rules
```

## Issues Identified

### Issue 1: OpenAPI Path Prefix Mismatch
- **Error Pattern**: HTTP 404 "Requested function was not found" on `/functions/v1/api/v1/rules`
- **Category**: Network / Configuration
- **Affected Files**:
  - `apps/web/public/openapi.yaml`
  - `docs/architecture/openapi-validation-rules.yaml`
  - `docs/api/openapi-rules.yaml`
  - `docs/Analysis/ValidationRulesManagement/openapi-validation-rules.yaml`
- **Root Cause**: OpenAPI spec paths include `/api/v1/` prefix which doesn't exist in the Supabase Edge Function routing
- **Fix Approach**: Remove `/api/v1/` prefix from all paths in the OpenAPI spec

## Relevant Files
Use these files to fix the bug:

- `apps/web/public/openapi.yaml` - Main OpenAPI spec used by frontend/Swagger UI - **primary file to fix**
- `supabase/functions/rules/index.ts` - Edge Function implementation (no changes needed, works correctly)
- `supabase/functions/rules/responses.ts` - CORS handling (working correctly)
- `docs/architecture/openapi-validation-rules.yaml` - Architecture documentation version
- `docs/api/openapi-rules.yaml` - API documentation version
- `docs/Analysis/ValidationRulesManagement/openapi-validation-rules.yaml` - Analysis documentation version

### New Files
None required.

## Step by Step Tasks

### Step 1: Verify the fix works with correct path
- Test the API with the correct path (without `/api/v1/`):
```bash
curl 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/rules?active_only=true&category=vehicle' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <token>'
```
- Confirm successful 200 response

### Step 2: Update primary OpenAPI spec
- Edit `apps/web/public/openapi.yaml`
- Find all paths starting with `/api/v1/`
- Remove the `/api/v1/` prefix from each path:
  - `/api/v1/validate` → `/validate`
  - `/api/v1/validate/{validationId}` → `/validate/{validationId}`
  - `/api/v1/validate/spz/{spz}` → `/validate/spz/{spz}`
  - `/api/v1/validate/spz/{spz}/history` → `/validate/spz/{spz}/history`
  - `/api/v1/rules` → `/rules`
  - `/api/v1/rules/{ruleId}` → `/rules/{ruleId}`
  - `/api/v1/rules/{ruleId}/activate` → `/rules/{ruleId}/activate`
  - `/api/v1/rules/{ruleId}/deactivate` → `/rules/{ruleId}/deactivate`
  - `/api/v1/rules/{ruleId}/test` → `/rules/{ruleId}/test`
  - `/api/v1/rules/{ruleId}/history` → `/rules/{ruleId}/history`
  - `/api/v1/rules/schema` → `/rules/schema`
  - `/api/v1/rules/import` → `/rules/import`
  - `/api/v1/rules/export` → `/rules/export`

### Step 3: Update documentation OpenAPI specs
- Apply same path changes to:
  - `docs/architecture/openapi-validation-rules.yaml`
  - `docs/api/openapi-rules.yaml`
  - `docs/Analysis/ValidationRulesManagement/openapi-validation-rules.yaml`

### Step 4: Update RULE_MANAGEMENT_API.md documentation
- Update path references in `docs/architecture/RULE_MANAGEMENT_API.md`
- Update path references in other markdown files that reference `/api/v1/`

### Step 5: Rebuild and test frontend
- Run `cd apps/web && npm run build`
- Verify the updated `openapi.yaml` is copied to `dist/`

### Step 6: Run Validation Commands
- Execute all validation commands listed below

## Database Changes
None required. This is purely an API documentation/configuration fix.

## Testing Strategy

### Regression Tests
1. Test all Rules API endpoints with correct paths:
   - `GET /rules` - List rules
   - `GET /rules/{ruleId}` - Get single rule
   - `POST /rules` - Create rule
   - `PUT /rules/{ruleId}` - Update rule
   - `DELETE /rules/{ruleId}` - Delete rule
   - `POST /rules/{ruleId}/activate` - Activate rule
   - `POST /rules/{ruleId}/deactivate` - Deactivate rule
   - `GET /rules/export` - Export rules
   - `POST /rules/import` - Import rules

2. Test validation endpoints:
   - `POST /validate` - Execute validation
   - `GET /validate/{validationId}` - Get validation result

3. Verify Swagger UI works in frontend

### Edge Cases
- Ensure existing frontend API calls (if any) are updated to match
- Verify CORS still works correctly with OPTIONS preflight
- Test with both service_role and authenticated tokens

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Test correct endpoint directly
curl -s 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/rules?active_only=true&category=vehicle' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2JkbXlnbWJ4dGRndWpreXRweGhhLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJpbnRlcm5hbC11c2VyIiwiaWF0IjoxNzY3NTk5NjY4LCJleHAiOjE3Njc2ODYwNjgsImFjY2Vzc190eXBlIjoiaW50ZXJuYWwiLCJjb2RlX2lkIjoiNjdiM2NjODAiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQifQ.Jo21_RCvsJpOYlaf9hf3esvCbYLRYm660XbQLYTOYD4' | jq .

# Test CORS preflight
curl -X OPTIONS 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/rules' \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: GET' \
  -v 2>&1 | grep -i "access-control"

# Build frontend
cd apps/web && npm run build
```

## Notes
- The CORS errors mentioned in the original bug report are a red herring - they occur because the 404 response doesn't come from the Edge Function (which has proper CORS headers) but from Supabase's function router
- The Edge Function code itself is working correctly; this is purely a documentation/specification issue
- The fix is backward compatible as long as no external clients are using the `/api/v1/` paths (Swagger UI is the primary consumer)
- Consider adding versioning through response headers or query params if API versioning is needed in the future
