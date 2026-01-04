# FIX-003: Remove Unused Variables in Test Files

## Priority: P2 (Medium)
## Estimated Effort: 10 minutes
## Type: Code Cleanup / TypeScript Error Fix

---

## Problem Statement

The frontend build fails with TypeScript errors for unused variables in test files:

```
src/__tests__/VehicleForm.test.ts(7,32): error TS6133: 'vi' is declared but its value is never read.
src/__tests__/VehicleForm.test.ts(7,36): error TS6133: 'vi' is declared but its value is never read.
src/composables/__tests__/useDetailData.spec.ts(227,45): error TS6133: 'table' is declared but its value is never read.
src/composables/__tests__/useDetailData.spec.ts(243,45): error TS6133: 'table' is declared but its value is never read.
```

---

## Root Cause Analysis

### Issue 1: VehicleForm.test.ts

**File**: `apps/web/src/__tests__/VehicleForm.test.ts`
**Line**: 7

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

The imports `vi` and `beforeEach` are declared but never used in the test file. The tests only use `describe`, `it`, and `expect`.

### Issue 2: useDetailData.spec.ts

**File**: `apps/web/src/composables/__tests__/useDetailData.spec.ts`
**Lines**: 227, 243

```typescript
mockSupabase.from.mockImplementation((table: string) => ({
```

The `table` parameter is declared in the mock function signature but never used within the function body.

---

## Solution

### Fix 1: VehicleForm.test.ts

Remove unused imports:

```typescript
// Before
import { describe, it, expect, vi, beforeEach } from 'vitest';

// After
import { describe, it, expect } from 'vitest';
```

### Fix 2: useDetailData.spec.ts

Prefix unused parameter with underscore or remove type annotation:

**Option A - Underscore prefix (preserves intent)**:
```typescript
// Before
mockSupabase.from.mockImplementation((table: string) => ({

// After
mockSupabase.from.mockImplementation((_table: string) => ({
```

**Option B - Remove parameter entirely**:
```typescript
// Before
mockSupabase.from.mockImplementation((table: string) => ({

// After
mockSupabase.from.mockImplementation(() => ({
```

**Recommendation**: Use Option A (underscore prefix) as it documents that the parameter exists but is intentionally unused. This is useful if the mock might need the table name in the future.

---

## Implementation Steps

### Step 1: Fix VehicleForm.test.ts

1. Open `apps/web/src/__tests__/VehicleForm.test.ts`
2. Change line 7 from:
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'vitest';
   ```
   To:
   ```typescript
   import { describe, it, expect } from 'vitest';
   ```

### Step 2: Fix useDetailData.spec.ts - Line 227

1. Open `apps/web/src/composables/__tests__/useDetailData.spec.ts`
2. Find line 227 (inside `'updates status to PENDING for ORANGE result'` test)
3. Change from:
   ```typescript
   mockSupabase.from.mockImplementation((table: string) => ({
   ```
   To:
   ```typescript
   mockSupabase.from.mockImplementation((_table: string) => ({
   ```

### Step 3: Fix useDetailData.spec.ts - Line 243

1. Find line 243 (inside `'updates status to REJECTED for RED result'` test)
2. Apply the same fix:
   ```typescript
   mockSupabase.from.mockImplementation((_table: string) => ({
   ```

### Step 4: Verify the build passes

```bash
npm run build
```

### Step 5: Run tests to ensure no regressions

```bash
npm run test --workspace=apps/web
```

---

## Acceptance Criteria

- [x] `npm run build` no longer shows TS6133 errors for these files
- [x] All existing tests still pass
- [x] No new TypeScript errors introduced

---

## Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/web/src/__tests__/VehicleForm.test.ts` | 7 | Remove `vi, beforeEach` from imports |
| `apps/web/src/composables/__tests__/useDetailData.spec.ts` | 227 | Prefix `table` with underscore |
| `apps/web/src/composables/__tests__/useDetailData.spec.ts` | 243 | Prefix `table` with underscore |

---

## Testing

1. Run `npm run build` - should pass without TS6133 errors
2. Run `npm run test --workspace=apps/web` - all tests should pass
3. Specifically verify these test files run successfully:
   - `VehicleForm.test.ts`
   - `useDetailData.spec.ts`

---

## Notes

- TypeScript's `noUnusedLocals` and `noUnusedParameters` options (TS6133) help catch dead code
- The underscore prefix convention (`_variableName`) is widely used to indicate intentionally unused parameters
- These are test files only - changes have no impact on production code

---

## Completed

**Date**: 2026-01-04

**Summary**:
- Removed unused `vi` and `beforeEach` imports from `VehicleForm.test.ts`
- Prefixed unused `table` parameter with underscore in two locations in `useDetailData.spec.ts` (lines 227 and 243)
- Build now completes successfully without TS6133 errors
- All 137 tests pass (7 test files)
