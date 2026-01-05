# Feature: Rules Management UI - Strategy Document

## Overview

Implement a comprehensive Rules Management UI page that allows administrators to view, filter, search, and manage validation rules. The UI follows the design mockup at `docs/design/validation-rules-management-mockup.html` with a light theme.

**Feature Type:** Pure UI (no backend changes)
**Complexity:** Medium
**Estimated Components:** 6 new, 2 modified

## User Story

As an administrator
I want to view and manage validation rules through a web interface
So that I can configure, activate, deactivate, and monitor the rules that power the validation engine

---

## Shared Contracts

These contracts are established FIRST and shared across all implementation phases. Sub-agents must use these exact definitions.

### TypeScript Types

```typescript
// Location: apps/web/src/composables/useRules.ts

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

### API Endpoints (Existing)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/functions/v1/rules` | GET | List rules with filtering |
| `/functions/v1/rules/:id/activate` | POST | Activate a rule |
| `/functions/v1/rules/:id/deactivate` | POST | Deactivate a rule |

### Design Reference

- **Mockup:** `docs/design/validation-rules-management-mockup.html`
- **Theme:** Light (white backgrounds, gray borders)
- **Language:** Czech

---

## Implementation Phases

### Phase 1: Foundation Types
**Handled by:** Main orchestrator
**Duration:** Quick (< 5 min)
**Dependencies:** None

Add type definitions to `apps/web/src/composables/useRules.ts`:
- Transform type constants and type
- Comparator type constants and type
- Entity type constants and type

**Outputs:** Updated `useRules.ts` with exported types

---

### Phase 2: UI Components & Page
**Delegated to:** `ui-agent`
**Spec:** [./feature-rules-management-ui/01-ui-implementation.md](./feature-rules-management-ui/01-ui-implementation.md)
**Dependencies:** Phase 1 types
**Can start:** Immediately (uses contracts above)

**Scope:**
- Create 5 new components (badges, chips, stats bar)
- Refactor RulesList.vue to light theme
- Create RulesManagement.vue page

**Outputs:**
- `apps/web/src/components/rules/RuleSeverityBadge.vue`
- `apps/web/src/components/rules/RuleEntityBadge.vue`
- `apps/web/src/components/rules/RuleChip.vue`
- `apps/web/src/components/rules/RulesStatsBar.vue`
- `apps/web/src/components/rules/RuleStatusBadge.vue` (updated)
- `apps/web/src/components/rules/RulesList.vue` (refactored)
- `apps/web/src/pages/RulesManagement.vue`

---

### Phase 3: Validation & Testing
**Handled by:** Main orchestrator
**Dependencies:** Phase 2 complete

**Tasks:**
1. Run `cd apps/web && npm run build` - verify TypeScript compilation
2. Manual testing checklist (see Acceptance Criteria)

---

## Existing Files Reference

### Files to Modify
- `apps/web/src/composables/useRules.ts` - Add type definitions
- `apps/web/src/components/rules/RulesList.vue` - Light theme refactor
- `apps/web/src/components/rules/RuleStatusBadge.vue` - Update styling

### Pattern References
- `apps/web/src/pages/Dashboard.vue` - Page structure patterns
- `apps/web/src/composables/useToast.ts` - Toast notification pattern

---

## Acceptance Criteria

- [ ] `/rules` page loads and displays rules from API
- [ ] Stats bar shows correct counts by status and severity
- [ ] Search filters rules by ID, name, description
- [ ] Quick filter chips filter by entity category
- [ ] Table shows source → target with entity badges
- [ ] Transform and comparator chips display correctly
- [ ] Activate/Deactivate buttons work and show toast
- [ ] Light theme matches mockup design
- [ ] Build completes without errors (`npm run build`)

---

## Scope Boundaries

### Included
- Read-only rule display with filtering
- Activate/Deactivate functionality
- Light theme styling per mockup

### Excluded (Future Iterations)
- Rule creation form
- Rule editing modal
- Import/Export functionality
- Clone operation
- Delete operation
- Rule detail view

---

## Validation Commands

```bash
# Build verification
cd apps/web && npm run build

# Dev server for manual testing
cd apps/web && npm run dev
# Navigate to http://localhost:5173/rules
```
