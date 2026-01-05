# Bug: Rules Page Content Disappears After Load

## Bug Description
The Rules Management page at `/rules` loads briefly showing the header and action buttons, but the rules table content never appears. The page remains blank with no data displayed. Console shows multiple `TypeError: Cannot read properties of undefined (reading 'length')` errors from the `RulesManagement` component.

**Symptoms:**
- Page header renders correctly (title, Export/Import/New Rule buttons)
- Stats bar and rules table remain empty
- Multiple console errors referencing `.length` on undefined
- Network shows OPTIONS preflight succeeds (204) but actual GET request appears to fail silently

**Expected Behavior:**
- Page loads within 2 seconds with all validation rules displayed
- Stats bar shows rule counts (total, active, inactive, by severity)
- Rules table shows all rules with filtering and pagination

## Problem Statement
There is a **data structure mismatch** between the backend API response format and what the frontend expects. This causes the rules array to remain `undefined`, triggering errors when components try to call `.length` or `.filter()` on it.

## Solution Statement
Fix the frontend `useRules.ts` composable to correctly parse the backend API response structure. The backend returns `{ data: { rules: [...], total_count, page, limit } }` but the frontend expects `{ data: { data: [...], pagination: {...} } }`.

## Steps to Reproduce
1. Navigate to https://secure-deal-ai-web.vercel.app/rules
2. Observe the page loads header/buttons but no content
3. Open browser console - see TypeError errors
4. Check Network tab - OPTIONS request succeeds but data is not parsed correctly

## Root Cause Analysis

### Backend API Response Structure (handlers.ts:210-217)
```typescript
const response: PaginatedResponse<RuleListItem> = {
  rules,           // Array of RuleListItem
  total_count: total,
  page,
  limit,
};
return success(response);  // Wraps in { data: {...}, meta: {...} }
```

**Actual API response:**
```json
{
  "data": {
    "rules": [...],
    "total_count": 31,
    "page": 1,
    "limit": 50
  },
  "meta": { "timestamp": "..." }
}
```

### Frontend Parsing (useRules.ts:124-126)
```typescript
const data = await response.json() as { data: RulesListResponse };
rules.value = data.data.data;           // WRONG: expects data.data.data
pagination.value = data.data.pagination; // WRONG: expects data.data.pagination
```

**Frontend expects:**
```json
{
  "data": {
    "data": [...],
    "pagination": { "page": 1, "limit": 50, "total": 31, "total_pages": 1 }
  }
}
```

### Secondary Issue: Field Name Mismatches
The backend `RuleListItem` type has different field names than frontend `RuleResponse`:

| Backend (RuleListItem) | Frontend (RuleResponse) |
|------------------------|-------------------------|
| `name` | `rule_name` |
| (no direct fields) | `source_entity`, `source_field`, `target_entity`, `target_field` |
| (nested in definition) | `comparator`, `transform`, `error_message` |

The backend returns a **summary view** (`toListItem`) that flattens some fields from `rule_definition`, but the frontend expects **flattened detail view** fields.

## Issues Identified

### Issue 1: Response Structure Mismatch
- **Error Pattern**: `TypeError: Cannot read properties of undefined (reading 'length')`
- **Category**: Frontend
- **Affected Files**: `apps/web/src/composables/useRules.ts`
- **Root Cause**: Frontend parses `data.data.data` but backend sends `data.rules`
- **Fix Approach**: Update frontend parsing to match actual API response

### Issue 2: Field Name Mismatches
- **Error Pattern**: Components reference undefined fields (e.g., `rule_name` instead of `name`)
- **Category**: Frontend / Backend
- **Affected Files**:
  - `apps/web/src/composables/useRules.ts` (type definitions)
  - `apps/web/src/components/rules/RulesStatsBar.vue`
  - `apps/web/src/components/rules/RulesList.vue`
- **Root Cause**: Backend `RuleListItem` uses `name`, frontend expects `rule_name`
- **Fix Approach**: Either update frontend types to match backend, or update backend to return expected field names

### Issue 3: Missing Defensive Coding
- **Error Pattern**: `.length` called on potentially undefined array
- **Category**: Frontend
- **Affected Files**:
  - `apps/web/src/components/rules/RulesStatsBar.vue`
  - `apps/web/src/components/rules/RulesList.vue`
- **Root Cause**: No fallback when `rules` prop is undefined
- **Fix Approach**: Add optional chaining or default empty array

## Relevant Files
Use these files to fix the bug:

### Frontend Files to Modify
- **`apps/web/src/composables/useRules.ts`** - Main composable that fetches and parses API response. Update parsing logic and `RuleResponse` interface to match actual backend response.
- **`apps/web/src/components/rules/RulesStatsBar.vue`** - Uses `rules.length` and `rules.filter()`. Add defensive coding.
- **`apps/web/src/components/rules/RulesList.vue`** - Uses various rule fields. May need updates if field names change.

### Backend Files (Reference Only)
- **`supabase/functions/rules/handlers.ts`** - Contains `listRules` handler and `toListItem` transform (lines 35-52, 153-222)
- **`supabase/functions/rules/types.ts`** - Contains `RuleListItem` and `PaginatedResponse` types (lines 185-199, 251-256)
- **`supabase/functions/rules/responses.ts`** - Contains `success()` wrapper (lines 45-52)

### New Files
None required.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update Frontend Type Definitions
- Update `RuleResponse` interface in `apps/web/src/composables/useRules.ts` to match backend `RuleListItem` structure
- Add new `RulesApiResponse` interface that matches actual API response structure

### Step 2: Fix API Response Parsing
- Update `fetchRules` function in `useRules.ts` to correctly parse `data.rules` instead of `data.data.data`
- Map pagination from `{ total_count, page, limit }` to frontend format `{ total, page, limit, total_pages }`

### Step 3: Add Defensive Coding to Stats Bar
- In `RulesStatsBar.vue`, ensure `props.rules` defaults to empty array
- Use optional chaining or nullish coalescing for safety

### Step 4: Add Defensive Coding to Rules List
- In `RulesList.vue`, ensure `props.rules` defaults to empty array
- Verify all field references match updated type definitions

### Step 5: Test Locally
- Run `npm run dev` in `apps/web`
- Navigate to `/rules` page
- Verify rules load and display correctly
- Verify stats bar shows correct counts
- Verify filtering works

### Step 6: Run Validation Commands
- Execute all validation commands listed below

## Database Changes
No database changes required. This is a frontend-backend API contract mismatch.

## Testing Strategy

### Regression Tests
1. **Rules List Loading**: Navigate to `/rules`, verify all rules load within 2 seconds
2. **Stats Bar Accuracy**: Verify counts match actual rule data
3. **Filtering**: Test each filter chip (All, Vehicle, Vendor, ARES, OCR)
4. **Search**: Test search by rule ID, name, and description
5. **Activate/Deactivate**: Test rule activation toggle (if implemented)

### Edge Cases
1. **Empty Rules**: Test with no rules in database
2. **Large Dataset**: Test with many rules (pagination)
3. **Slow Network**: Test with throttled network
4. **API Error**: Test error state when API fails

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd apps/web && npm run build` - Build frontend (ensures no TypeScript errors)
- `npm run dev` - Start frontend dev server for manual testing
- Open browser to `http://localhost:5173/rules` - Verify rules page loads correctly

## Notes

### API Contract Discrepancy
The backend API follows a clean REST pattern where the list response contains:
- `rules` - the array of items
- `total_count` - total number of matching items
- `page` - current page number
- `limit` - items per page

The frontend was written expecting a different structure (`data`, `pagination`). This may have happened during development when the API spec changed but frontend wasn't updated.

### Recommended Long-term Fix
Consider generating TypeScript types from OpenAPI spec to ensure frontend/backend alignment. The API documentation at `/functions/v1/api/docs` should be the source of truth.

### Alternative: Modify Backend
Instead of modifying the frontend, the backend could be modified to return the format the frontend expects. However, this would deviate from the documented API spec and could break other clients. Frontend fix is recommended.
