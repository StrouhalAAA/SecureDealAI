# FIX-002: Fix Type Mismatch in Detail.vue

## Priority: P1 (High)
## Estimated Effort: 10 minutes
## Type: TypeScript Error Fix

---

## Problem Statement

The frontend build fails with TypeScript error:
```
src/pages/Detail.vue(78,12): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
```

---

## Root Cause

**File**: `apps/web/src/pages/Detail.vue`
**Line**: 78

```vue
<DocumentUpload
  v-else-if="nav.currentStep.value === 2"
  :spz="data.opportunity.value?.spz"   <!-- Returns string | undefined -->
  :buying-opportunity-id="opportunityId"
  @back="nav.prevStep"
  @validated="onValidated"
/>
```

The optional chaining operator `?.` on `data.opportunity.value?.spz` produces type `string | undefined`, but the `DocumentUpload` component's `spz` prop is typed as required `string`.

---

## Solution

### Option A: Add conditional rendering (Recommended)

Wrap the component with a v-if to ensure `spz` exists before rendering:

```vue
<DocumentUpload
  v-else-if="nav.currentStep.value === 2 && data.opportunity.value?.spz"
  :spz="data.opportunity.value.spz"
  :buying-opportunity-id="opportunityId"
  @back="nav.prevStep"
  @validated="onValidated"
/>
```

**Why this is best**: It's semantically correct - we shouldn't show document upload without a valid SPZ.

### Option B: Provide default empty string

```vue
<DocumentUpload
  v-else-if="nav.currentStep.value === 2"
  :spz="data.opportunity.value?.spz ?? ''"
  :buying-opportunity-id="opportunityId"
  @back="nav.prevStep"
  @validated="onValidated"
/>
```

**Downside**: Empty string might cause issues in DocumentUpload component logic.

### Option C: Non-null assertion (Not recommended)

```vue
:spz="data.opportunity.value!.spz"
```

**Downside**: Bypasses TypeScript safety, could cause runtime errors.

---

## Implementation Steps

### Step 1: Read the current Detail.vue file

Locate line 78 in `apps/web/src/pages/Detail.vue`

### Step 2: Apply Option A fix

Change from:
```vue
<DocumentUpload
  v-else-if="nav.currentStep.value === 2"
  :spz="data.opportunity.value?.spz"
```

To:
```vue
<DocumentUpload
  v-else-if="nav.currentStep.value === 2 && data.opportunity.value?.spz"
  :spz="data.opportunity.value.spz"
```

### Step 3: Verify the build passes

```bash
npm run build
```

---

## Acceptance Criteria

- [x] `npm run build` no longer shows TS2322 error for Detail.vue:78
- [x] DocumentUpload component only renders when `spz` value exists
- [ ] The detail page workflow still functions correctly

---

## Files Affected

| File | Change |
|------|--------|
| `apps/web/src/pages/Detail.vue` | Update v-else-if condition on line 76-78 |

---

## Testing

1. Run `npm run build` - should pass without TS2322 error
2. Run `npm run dev` and test the detail page flow:
   - Create a new buying opportunity
   - Complete vehicle form
   - Complete vendor form
   - Verify document upload step loads correctly
3. Test edge case: Try to access detail page with invalid/missing opportunity ID

---

## Context

The `Detail.vue` page is a multi-step wizard for validating buying opportunities:
- Step 0: Vehicle form
- Step 1: Vendor form
- Step 2: Document upload (requires SPZ from opportunity)
- Step 3: Validation results

The SPZ (license plate) is the business key for buying opportunities and is required for document upload to associate files correctly.

---

## Completed

**Date**: 2026-01-04

**Summary**: Applied Option A fix to add conditional rendering check. The `v-else-if` directive on the `DocumentUpload` component now includes `&& data.opportunity.value?.spz` to ensure the component only renders when a valid SPZ exists. This removes the TypeScript error TS2322 by guaranteeing `spz` is a `string` (not `string | undefined`) when passed to the component.

**Changes Made**:
- File: `apps/web/src/pages/Detail.vue`
- Line 77: Changed `v-else-if="nav.currentStep.value === 2"` to `v-else-if="nav.currentStep.value === 2 && data.opportunity.value?.spz"`
- Line 78: Changed `:spz="data.opportunity.value?.spz"` to `:spz="data.opportunity.value.spz"`

**Verification**: `npm run build` completed successfully with no TypeScript errors.
