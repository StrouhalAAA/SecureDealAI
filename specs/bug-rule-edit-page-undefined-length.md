# Bug: Rule Edit Page - Cannot Read 'length' of Undefined

## Bug Description
When navigating to the rule edit page (`/rules/ACT-001/edit`), the page crashes with a TypeError: "Cannot read properties of undefined (reading 'length')". The error originates in the RuleForm component validation logic. The rule detail does not load, and users cannot edit existing rules.

**Expected behavior**: The rule edit page should load the rule data and display it in the form for editing.

**Actual behavior**: The page crashes with a JavaScript error before the form can render properly.

## Problem Statement
The frontend `RuleEditPage.vue` component expects the API response for a single rule to have a flat structure (matching `RuleListItem`), but the backend `GET /rules/:id` endpoint returns a nested structure with `rule_definition` containing the rule details. This data shape mismatch causes undefined property access when building the form data.

## Solution Statement
Update the `RuleEditPage.vue` component to correctly parse the nested `rule_definition` structure returned by the `GET /rules/:id` endpoint. The `formData` computed property must access properties from `r.rule_definition` instead of expecting them at the top level.

## Steps to Reproduce
1. Navigate to `https://secure-deal-ai-web.vercel.app/rules`
2. Click on a rule to edit (e.g., ACT-001)
3. The page crashes with TypeError before loading the form

## Root Cause Analysis
The bug is caused by a **data format mismatch** between the backend API and frontend expectations:

### Backend Response Format (`GET /rules/:id`)
The `getRule` handler in `supabase/functions/rules/handlers.ts` calls `toRuleResponse()` which returns:
```json
{
  "data": {
    "id": "uuid",
    "rule_id": "ACT-001",
    "rule_definition": {
      "id": "ACT-001",
      "name": "Rule Name",
      "source": { "entity": "vehicle", "field": "vin" },
      "target": { "entity": "ocr_orv", "field": "vin" },
      "comparison": { "type": "EXACT" },
      "severity": "CRITICAL",
      ...
    },
    "is_active": false,
    "is_draft": true,
    ...
  }
}
```

### Frontend Expectation
The `formData` computed in `RuleEditPage.vue` expects:
```javascript
r.rule_name,        // UNDEFINED - actual: r.rule_definition.name
r.source_entity,    // UNDEFINED - actual: r.rule_definition.source.entity
r.comparator,       // UNDEFINED - actual: r.rule_definition.comparison.type
r.transform,        // UNDEFINED - actual: r.rule_definition.source.transforms
r.applies_to,       // UNDEFINED - actual: r.rule_definition.metadata.applicableTo
```

### Error Chain
1. `getRule()` in `useRules.ts` returns data with nested `rule_definition`
2. `RuleEditPage.vue` sets `rule.value = result`
3. `formData` computed tries to access `r.rule_name` (undefined)
4. When assigning to form, arrays like `applicableTo` become undefined
5. `RuleForm.vue` validation accesses `.length` on undefined array
6. **Crash**: `TypeError: Cannot read properties of undefined (reading 'length')`

## Issues Identified

### Issue 1: Data Format Mismatch in RuleEditPage
- **Error Pattern**: `TypeError: Cannot read properties of undefined (reading 'length')` at `RuleForm-DNlxVS2v.js:1:13957`
- **Category**: Frontend
- **Affected Files**: `apps/web/src/pages/RuleEditPage.vue`
- **Root Cause**: The `formData` computed property accesses top-level properties that don't exist on the API response. The response has a nested `rule_definition` structure.
- **Fix Approach**: Update `formData` computed to correctly access properties from `r.rule_definition`

### Issue 2: Type Mismatch in useRules.ts
- **Error Pattern**: TypeScript interface doesn't match actual API response
- **Category**: Frontend
- **Affected Files**: `apps/web/src/composables/useRules.ts`
- **Root Cause**: The `RuleResponse` interface (lines 43-67) shows a flat structure but the actual API returns `rule_definition` as nested
- **Fix Approach**: Add a proper type for single rule response with nested `rule_definition`, or transform the response to match the expected flat format

## Relevant Files
Use these files to fix the bug:

- `apps/web/src/pages/RuleEditPage.vue` - Main fix location. The `formData` computed property needs to parse the nested `rule_definition` structure instead of expecting flat properties.
- `apps/web/src/composables/useRules.ts` - Type definitions. The `RuleResponse` type may need updating to reflect the actual API response format with nested `rule_definition`.
- `supabase/functions/rules/handlers.ts` - Backend reference. The `toRuleResponse()` function shows the actual data structure returned by the API.
- `supabase/functions/rules/types.ts` - Backend types. Shows `RuleResponse` and `RuleDefinition` interfaces that define the nested structure.

### New Files
None required.

## Step by Step Tasks

### Step 1: Understand the API Response Structure
- Read `supabase/functions/rules/types.ts` to understand `RuleResponse` and `RuleDefinition` types
- Verify the actual response structure by examining `toRuleResponse()` in `handlers.ts`

### Step 2: Update RuleEditPage.vue formData Computed
- Modify the `formData` computed property (lines 89-140) to correctly access nested `rule_definition` properties
- Access `r.rule_definition.name` instead of `r.rule_name`
- Access `r.rule_definition.source.entity` instead of `r.source_entity`
- Access `r.rule_definition.comparison.type` instead of `r.comparator`
- Access `r.rule_definition.source.transforms` instead of parsing `r.transform`
- Access `r.rule_definition.metadata?.applicableTo` instead of `r.applies_to?.vendor_type`
- Ensure all array fields default to `[]` to prevent undefined access

### Step 3: Update TypeScript Types (Optional)
- Consider adding a `SingleRuleResponse` type to `useRules.ts` that accurately reflects the nested structure
- Or update the existing `RuleResponse` interface to include `rule_definition: RuleDefinition`

### Step 4: Add Defensive Null Checks
- Ensure `formData` handles cases where optional nested properties are undefined
- Use nullish coalescing (`??`) and optional chaining (`?.`) for all nested property access

### Step 5: Test the Fix
- Run `npm run build` in `apps/web` to verify no TypeScript errors
- Test editing an existing rule (e.g., ACT-001)
- Verify the form loads with correct values populated
- Test saving changes to confirm the full edit flow works

### Step 6: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes
None required. This is a frontend-only fix.

## Testing Strategy

### Regression Tests
- Verify rule list page still loads correctly
- Verify rule create page still works
- Verify rule edit page now loads without errors
- Verify form data is correctly populated from API response
- Verify saving changes works end-to-end

### Edge Cases
- Rule with no transforms (empty arrays)
- Rule with no `applies_to` metadata
- Rule with no `errorMessage.en` (only `cs`)
- Rule with all optional fields populated
- Draft rules vs active rules

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd apps/web && npm run build` - Build frontend (checks TypeScript compilation)
- `npm run test:db` - Test Supabase connection (if applicable)

## Notes
- The backend returns two different formats: `RuleListItem` (flat, for listing) and `RuleResponse` (nested with `rule_definition`, for single rule)
- The list view correctly uses `toListItem()` which flattens the structure
- The detail view uses `toRuleResponse()` which preserves the nested `rule_definition`
- This inconsistency between list and detail views is intentional in the backend but the frontend wasn't updated to handle both formats
- Consider whether to flatten on the backend side for consistency, or handle both formats on the frontend
