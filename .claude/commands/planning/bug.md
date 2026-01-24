# Bug Planning

Create a new plan to resolve the bug using the exact specified markdown Plan Format.

## Variables

bug_description: $ARGUMENTS

## Instructions

- You're writing a plan to resolve a bug. Be thorough and precise to fix the root cause and prevent regressions.
- Create the plan in the `specs/` directory with filename: `bug-{descriptive-name}.md`
  - Replace `{descriptive-name}` with a short, descriptive name (e.g., "fix-validation-mismatch", "resolve-rls-policy", "patch-ocr-timeout")
- Research the codebase to understand the bug, reproduce it, and create a fix plan.
- Replace every `<placeholder>` in the Plan Format with the requested value.
- Think hard about the bug, its root cause, and the steps to fix it properly.
- Be surgical with your bug fix - solve the bug at hand and don't go off track.
- We want the minimal number of changes that will fix the bug.
- Reference existing patterns:
  - Validation logic in `supabase/functions/validation-run/`
  - Database schema in `docs/architecture/DB_SCHEMA_DYNAMIC_RULES.sql`
  - Validation rules in `docs/architecture/VALIDATION_RULES_SCHEMA.json`
- Start your research by reading `CLAUDE.md`.
- If the input contains raw console errors, parse them using the Error Parsing section below.
- For multiple errors:
  - Determine if errors share a root cause (group them) or are independent
  - Create ONE plan with separate "Issue X" sections for unrelated errors
  - Prioritize: Blocking errors first, then cascading errors
- Use the Common Fixes Reference to accelerate diagnosis.

## Relevant Files

Focus on the following files:
- `CLAUDE.md` - Project instructions and conventions
- `supabase/functions/validation-run/` - Core validation engine
- `apps/web/` - Frontend application
- `docs/architecture/` - Architecture documentation
- `supabase/migrations/` - Database migrations

## Error Parsing

When the bug description contains raw console errors, parse them to extract structured information:

### HTTP Errors
| Pattern | Extract | Example |
|---------|---------|---------|
| `status of 4XX/5XX` | Status code, URL, endpoint | `406 on /rest/v1/vehicles` |
| `net::ERR_FAILED` | Network failure type | Connection blocked |
| `CORS policy` | Origin, target URL | `localhost:5173 → supabase.co` |

### JavaScript Errors
| Pattern | Extract | Example |
|---------|---------|---------|
| `TypeError: *` | Error message | `Failed to fetch` |
| `filename.vue:123` | File path, line number | `VendorForm.vue:625` |
| `at functionName` | Stack trace entry | `at lookupAres` |

### Supabase-Specific Patterns
| Pattern | Indicates |
|---------|-----------|
| `/rest/v1/{table}` | REST API call to specific table |
| `/functions/v1/{name}` | Edge Function invocation |
| `406 Not Acceptable` | Missing/wrong Accept header |
| `preflight request` | CORS OPTIONS not handled |

### Parsing Steps
1. Identify all unique error types in the paste
2. Group related errors (e.g., CORS + Failed to fetch = same root cause)
3. Extract affected files, URLs, and line numbers
4. Categorize: Frontend / Backend / Database / Network

## Common Fixes Reference

Use these hints to accelerate root cause analysis:

### CORS Errors
- **Symptom**: `blocked by CORS policy`, `preflight request`
- **Common Fix**: Edge Function missing OPTIONS handler or wrong headers
- **Check**: `supabase/functions/{name}/index.ts` for CORS handling
```typescript
// Required pattern for Edge Functions
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

### 406 Not Acceptable
- **Symptom**: `status of 406` on Supabase REST API
- **Common Fix**: Missing or incorrect `Accept: application/json` header
- **Check**: Frontend fetch calls for proper headers

### Failed to Fetch
- **Symptom**: `TypeError: Failed to fetch`
- **Common Cause**: CORS blocking the request before it completes
- **Check**: Network tab for red preflight request, Edge Function CORS

### RLS/Permission Errors
- **Symptom**: `403`, empty results when data exists
- **Common Fix**: Row Level Security policy missing or incorrect
- **Check**: `supabase/migrations/` for RLS policies

### Edge Function Not Found
- **Symptom**: `404` on `/functions/v1/{name}`
- **Common Fix**: Function not deployed or name mismatch
- **Check**: `supabase functions list`, deploy with `supabase functions deploy`

## Plan Format

```md
# Bug: <bug name>

## Bug Description
<describe the bug in detail, including symptoms and expected vs actual behavior>

## Problem Statement
<clearly define the specific problem that needs to be solved>

## Solution Statement
<describe the proposed solution approach to fix the bug>

## Steps to Reproduce
<list exact steps to reproduce the bug>

## Root Cause Analysis
<analyze and explain the root cause of the bug>

## Issues Identified
<For multiple errors, create separate issue sections. For single errors, use just Issue 1.>

### Issue 1: <issue name>
- **Error Pattern**: <parsed error from console>
- **Category**: Frontend / Backend / Database / Network
- **Affected Files**: <list of files>
- **Root Cause**: <specific analysis for this issue>
- **Fix Approach**: <from Common Fixes or custom approach>

### Issue 2: <issue name> (if applicable)
<repeat structure above for additional issues>

## Relevant Files
Use these files to fix the bug:

<find and list the files that are relevant to the bug, describe why they are relevant in bullet points>

### New Files
<list any new files that need to be created, if any>

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

<list step by step tasks as h3 headers plus bullet points. Order matters - start with investigation, then fix, then test.>

<Your last step should be running the Validation Commands.>

## Database Changes
<if applicable, describe any schema changes or data fixes needed>

## Testing Strategy

### Regression Tests
<describe tests to ensure the bug is fixed>

### Edge Cases
<list edge cases that need to be tested>

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Notes
<optionally list any additional notes or context relevant to the bug>
```

## Example Inputs

### Format 1: Simple Description
```
/bug Validation fails when vendor ICO is empty
```

### Format 2: Raw Console Errors
```
/bug
bdmygmbxtdgujkytpxha.supabase.co/rest/v1/vehicles:1 406
CORS policy: Response to preflight request doesn't pass access control check
VendorForm.vue:625 ARES lookup error: TypeError: Failed to fetch
```
**Parsed as:**
- Issue 1: HTTP 406 on vehicles REST endpoint (likely Accept header issue)
- Issue 2: CORS + Failed to fetch on ares-lookup (Edge Function CORS issue)

Note: Issues may share a root cause - investigate before creating separate fixes.

### Format 3: Mixed Description + Errors
```
/bug Opportunity page broken - getting these errors:
[console output paste]
```

## Bug
$ARGUMENTS

## Report

- Return the path to the plan file created.
- Summarize the root cause and fix approach.
