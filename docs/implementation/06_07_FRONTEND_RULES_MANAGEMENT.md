# Task 6.7: Frontend Rules Management - Light Theme

> **Task ID**: 06_07
> **Status**: [x] Complete
> **Depends On**: 6.6 (Swagger UI Integration)
> **Estimated Time**: 3 hours
> **Priority**: Required
> **Agent**: ui-agent (optional delegation)

---

## Objective

Create a user-friendly frontend interface for managing validation rules. This task uses the **hierarchical spec pattern** with a main strategy document and delegated sub-documents.

---

## Implementation Strategy

This task follows the **contract-first, agent-delegation pattern**:

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Foundation Types (5 min)                          │
│  → Main orchestrator adds shared types                      │
├─────────────────────────────────────────────────────────────┤
│  Phase 2: UI Components (2.5 hours)                         │
│  → UI agent executes sub-document                           │
├─────────────────────────────────────────────────────────────┤
│  Phase 3: Validation (10 min)                               │
│  → Build verification + acceptance criteria                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Spec Documents

| Document | Purpose |
|----------|---------|
| [specs/feature-rules-management-ui.md](../../specs/feature-rules-management-ui.md) | Main strategy (contracts, phases, criteria) |
| [specs/feature-rules-management-ui/01-ui-implementation.md](../../specs/feature-rules-management-ui/01-ui-implementation.md) | UI agent sub-document (all components) |

---

## Prerequisites

- Task 6.6 completed (Swagger UI working, confirms API is functional)
- Rules API endpoints working at `/functions/v1/rules`
- Design mockup available: `docs/design/validation-rules-management-mockup.html`

---

## Implementation Steps

### Step 1: Add Shared Types (Phase 1)

Add these type definitions to `apps/web/src/composables/useRules.ts` after the imports:

```typescript
// Transform types supported by the validation engine
export const TRANSFORM_TYPES = [
  'UPPERCASE', 'LOWERCASE', 'TRIM', 'REMOVE_SPACES', 'REMOVE_DIACRITICS',
  'NORMALIZE_DATE', 'EXTRACT_NUMBER', 'FORMAT_RC', 'FORMAT_ICO', 'FORMAT_DIC',
  'ADDRESS_NORMALIZE', 'NAME_NORMALIZE', 'VIN_NORMALIZE', 'SPZ_NORMALIZE'
] as const;

// Comparator types for rule matching
export const COMPARATOR_TYPES = [
  'EXACT', 'FUZZY', 'CONTAINS', 'REGEX', 'NUMERIC_TOLERANCE',
  'DATE_TOLERANCE', 'EXISTS', 'NOT_EXISTS', 'IN_LIST'
] as const;

// Entity types (data sources)
export const ENTITY_TYPES = [
  'vehicle', 'vendor', 'buying_opportunity',
  'ocr_orv', 'ocr_op', 'ocr_vtp', 'ares', 'adis', 'cebia'
] as const;

export type TransformType = typeof TRANSFORM_TYPES[number];
export type ComparatorType = typeof COMPARATOR_TYPES[number];
export type EntityType = typeof ENTITY_TYPES[number];
```

### Step 2: Execute UI Sub-Document (Phase 2)

Execute the UI implementation spec:

```
specs/feature-rules-management-ui/01-ui-implementation.md
```

This creates the following files:

| File | Type |
|------|------|
| `apps/web/src/components/rules/RuleSeverityBadge.vue` | NEW |
| `apps/web/src/components/rules/RuleEntityBadge.vue` | NEW |
| `apps/web/src/components/rules/RuleChip.vue` | NEW |
| `apps/web/src/components/rules/RulesStatsBar.vue` | NEW |
| `apps/web/src/components/rules/RuleStatusBadge.vue` | UPDATE |
| `apps/web/src/components/rules/RulesList.vue` | REFACTOR |
| `apps/web/src/pages/RulesManagement.vue` | NEW |

### Step 3: Verify Build (Phase 3)

Run validation commands:

```bash
cd apps/web && npm run build
```

Expected: Build completes with no TypeScript errors.

---

## Test Cases

### TC-6.7.1: Rules Page Loads

Navigate to `/rules` in the browser.

**Expected**:
- Rules list displayed with light theme
- Stats bar shows correct counts
- Filters and search visible

### TC-6.7.2: Filter by Entity

Click "Vozidlo" quick filter chip.

**Expected**: Only rules involving vehicle entity displayed

### TC-6.7.3: Search Works

Type "VEH" in search box.

**Expected**: Only rules with "VEH" in ID, name, or description shown

### TC-6.7.4: Activate Rule

Click activate button on an inactive rule.

**Expected**:
- Toast notification appears
- Rule status changes to Active
- List refreshes

### TC-6.7.5: Deactivate Rule

Click deactivate button on active rule.

**Expected**:
- Toast notification appears
- Rule status changes to Inactive
- List refreshes

### TC-6.7.6: Source→Target Display

Examine any rule row.

**Expected**:
- Entity badges show source and target
- Arrow icon between them
- Field mapping shown below

### TC-6.7.7: Transform/Comparator Chips

Examine rule with transforms.

**Expected**:
- Comparator chip (green) displayed
- Transform chips (purple) displayed
- Monospace font styling

---

## Validation Commands

```bash
# Build verification
cd apps/web && npm run build

# Dev server for manual testing
cd apps/web && npm run dev
# Navigate to http://localhost:5173/rules
```

---

## Validation Criteria

- [ ] Foundation types added to useRules.ts
- [ ] RuleSeverityBadge displays CRITICAL/WARNING/INFO correctly
- [ ] RuleEntityBadge shows entity colors per mockup
- [ ] RuleChip displays transforms (purple) and comparators (green)
- [ ] RulesStatsBar shows correct counts
- [ ] RuleStatusBadge shows Active/Inactive/Draft states
- [ ] RulesList table uses light theme
- [ ] Source→Target mapping visualization works
- [ ] Search filters locally by ID/name/description
- [ ] Quick filter chips filter by entity category
- [ ] Activate/Deactivate buttons call API and show toast
- [ ] Pagination works (when >1 page)
- [ ] Build completes without errors

---

## Scope Boundaries

### Included in This Task
- Read-only rule display with filtering
- Activate/Deactivate functionality
- Light theme styling per mockup
- Stats bar with counts

### Excluded (Future Tasks)
- Rule creation form (disabled button placeholder)
- Rule editing modal (disabled button placeholder)
- Import/Export functionality (disabled button placeholder)
- Clone operation (toast placeholder only)
- Delete operation (toast placeholder only)

---

## Completion Checklist

When this task is complete:
1. All 7 components created/updated
2. Types added to useRules.ts
3. Light theme matches mockup exactly
4. All test cases pass
5. Build completes without errors
6. Activate/Deactivate work with API

**Mark as complete**: Update tracker status to `[x] Complete`

---

## Troubleshooting

### Issue: Import errors for components

**Solution**: Ensure all component imports use correct paths:
```typescript
import RuleSeverityBadge from './RuleSeverityBadge.vue';
import RuleEntityBadge from './RuleEntityBadge.vue';
import RuleChip from './RuleChip.vue';
```

### Issue: API calls fail

**Solution**: Verify useRules composable has `activateRule` and `deactivateRule` methods.
Check that the API base URL is correct in the composable.

### Issue: Styles don't match mockup

**Solution**: Compare hex values against mockup:
- Critical: `#FEE2E2` bg, `#991B1B` text
- Warning: `#FFEDD5` bg, `#9A3412` text
- Info: `#DBEAFE` bg, `#1E40AF` text
