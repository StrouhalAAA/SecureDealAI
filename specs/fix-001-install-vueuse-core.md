# FIX-001: Install Missing @vueuse/core Dependency

## Priority: P0 (Critical)
## Estimated Effort: 5 minutes
## Type: Dependency Fix

---

## Problem Statement

The frontend build fails with TypeScript error:
```
src/components/validation/ValidationSidebar.vue(111,31): error TS2307: Cannot find module '@vueuse/core' or its corresponding type declarations.
```

The `ValidationSidebar.vue` component imports `useDebounceFn` from `@vueuse/core`, but this package is not listed in `apps/web/package.json`.

---

## Root Cause

**File**: `apps/web/src/components/validation/ValidationSidebar.vue`
**Line**: 111

```typescript
import { useDebounceFn } from '@vueuse/core';
```

The `@vueuse/core` package was used in the component but never added as a dependency.

---

## Solution

### Step 1: Install the dependency

Run from project root:
```bash
npm install @vueuse/core --workspace=apps/web
```

### Step 2: Verify package.json was updated

Check that `apps/web/package.json` now includes:
```json
{
  "dependencies": {
    "@vueuse/core": "^11.x.x"
  }
}
```

### Step 3: Verify the build passes

```bash
npm run build
```

The TypeScript error for `@vueuse/core` should be resolved.

---

## Acceptance Criteria

- [x] `@vueuse/core` is listed in `apps/web/package.json` dependencies
- [x] `npm run build` no longer shows the TS2307 error for `@vueuse/core`
- [ ] `ValidationSidebar.vue` component works correctly with debounced fetch

---

## Files Affected

| File | Change |
|------|--------|
| `apps/web/package.json` | Add `@vueuse/core` dependency |
| `package-lock.json` | Auto-updated by npm |

---

## Testing

1. Run `npm run build` - should not show @vueuse/core error
2. Run `npm run dev` and navigate to a detail page with validation sidebar
3. Verify the debounced fetch works (no excessive API calls on rapid input)

---

## Notes

- VueUse is a well-maintained collection of Vue 3 Composition API utilities
- `useDebounceFn` is used to prevent excessive validation API calls during form input
- Current Vue version (3.4.0) is compatible with latest VueUse

---

## Completed

**Date**: 2026-01-04

**Summary**: Successfully installed `@vueuse/core` (version ^14.1.0) as a dependency in `apps/web/package.json`. The TypeScript error TS2307 for the missing `@vueuse/core` module is now resolved. The build still has other unrelated TypeScript errors (unused variables in test files and a type mismatch in `Detail.vue`), but the specific `@vueuse/core` import issue has been fixed.
