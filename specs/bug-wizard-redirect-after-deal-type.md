# Bug: Wizard redirects to base page after deal type selection

## Bug Description
After creating a new opportunity at `/new-opportunity` and selecting a deal type (e.g., "BRANCH"), the user is unexpectedly redirected back to the base page ("/") instead of proceeding to step 2 "Kontakt" (Contact).

**Actual behavior**: User selects deal type → API successfully creates buying opportunity → User is redirected to "/" (Dashboard)

**Expected behavior**: User selects deal type → API creates buying opportunity → Wizard transitions to step 2 "Kontakt" (Contact form)

## Problem Statement
The wizard in `NewOpportunity.vue` fails to properly transition from the deal-type step to the contact step after initializing the opportunity. Instead of staying in the wizard and advancing to the next step, the user is redirected to the dashboard.

## Solution Statement
Investigate and fix the step transition logic in `NewOpportunity.vue` to ensure the wizard properly advances to the contact step after deal type selection without triggering any unintended navigation to the base page.

## Steps to Reproduce
1. Navigate to `http://localhost:5173/new-opportunity`
2. Click on "Pobocka" (or "Mobilni vykup") to select a deal type
3. Observe that the API call succeeds and creates a buying opportunity
4. Observe that instead of showing the Contact form (step 2), the user is redirected to "/"

## Root Cause Analysis
Based on code analysis of `/apps/web/src/pages/NewOpportunity.vue`:

1. **Flow Analysis**: The `selectDealType()` function (lines 549-553) is:
   ```javascript
   async function selectDealType(type: 'BRANCH' | 'MOBILE_BUYING') {
     buyingType.value = type;
     await initializeOpportunity();  // Creates opportunity in DB
     pushStep('contact');            // Should transition to contact step
   }
   ```

2. **Error Handling Gap**: The `initializeOpportunity()` function (lines 821-841) catches errors and sets `error.value`, but doesn't throw or return early:
   ```javascript
   async function initializeOpportunity() {
     try {
       // ... create opportunity
       tempOpportunityId.value = data.id;
       createdOpportunityId.value = data.id;
     } catch (e) {
       error.value = handleError(e, 'NewOpportunity.initializeOpportunity');
       // Function returns, but pushStep('contact') still executes!
     }
   }
   ```

3. **Potential Issue**: If `initializeOpportunity()` fails silently (sets error but doesn't throw), the wizard still tries to advance. However, if the opportunity ID is not set, subsequent operations may fail, potentially triggering error handlers that redirect to "/".

4. **HandleClose Trigger**: The `handleClose()` function (line 544-546) uses `router.push('/')`. This could be triggered by:
   - User clicking the X button
   - Programmatic navigation from error handlers
   - Component unmounting/remounting due to reactivity issues

5. **Comparison with Working Component**: The `CreateOpportunityWizard.vue` component (the modal version) uses `emit('close')` instead of `router.push('/')`, which is the correct pattern for embedded components but shouldn't affect the page-level wizard.

## Issues Identified

### Issue 1: Silent Error Handling in initializeOpportunity
- **Error Pattern**: Function catches error and sets `error.value` but `selectDealType` continues to call `pushStep('contact')` regardless
- **Category**: Frontend
- **Affected Files**: `/apps/web/src/pages/NewOpportunity.vue`
- **Root Cause**: Missing early return or error propagation in `initializeOpportunity()`
- **Fix Approach**:
  - Make `initializeOpportunity()` return a boolean indicating success
  - Only call `pushStep('contact')` if initialization succeeds
  - Or re-throw the error so `selectDealType` can handle it

### Issue 2: Missing Validation Before Step Transition
- **Error Pattern**: `pushStep('contact')` executes even when `tempOpportunityId` might not be set
- **Category**: Frontend
- **Affected Files**: `/apps/web/src/pages/NewOpportunity.vue`
- **Root Cause**: No validation that opportunity was created before advancing
- **Fix Approach**: Check that `tempOpportunityId.value` is set before calling `pushStep('contact')`

## Relevant Files
Use these files to fix the bug:

- **`/apps/web/src/pages/NewOpportunity.vue`** - Main file containing the bug. The `selectDealType()` and `initializeOpportunity()` functions need to be fixed to properly handle errors and conditionally advance steps.

- **`/apps/web/src/components/shared/CreateOpportunityWizard.vue`** - Reference implementation showing the correct pattern. This modal version has identical logic but emits events instead of using router navigation. Can be used as reference for proper step transition handling.

- **`/apps/web/src/components/shared/__tests__/CreateOpportunityWizard.spec.ts`** - Existing tests for the wizard component. Can be used as reference for creating tests for `NewOpportunity.vue`.

### New Files
- **`/apps/web/src/pages/__tests__/NewOpportunity.spec.ts`** - New test file to add unit tests for the page-level wizard (optional but recommended)

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Investigate Current Behavior
- Add console.log statements to trace the execution flow in `selectDealType()` and `initializeOpportunity()` to confirm the bug
- Check browser Network tab to verify the API call succeeds
- Check browser Console for any errors that might trigger unintended navigation

### Step 2: Fix Error Handling in initializeOpportunity
- Modify `initializeOpportunity()` to return a boolean indicating success/failure
- Update the catch block to return `false` after setting `error.value`
- Return `true` at the end of the try block

```typescript
async function initializeOpportunity(): Promise<boolean> {
  try {
    const placeholderSpz = `TEMP-${Date.now()}`;

    const { data, error: createError } = await supabase
      .from('buying_opportunities')
      .insert({
        spz: placeholderSpz,
        buying_type: buyingType.value,
      })
      .select()
      .single();

    if (createError) throw createError;

    tempOpportunityId.value = data.id;
    createdOpportunityId.value = data.id;
    return true;
  } catch (e) {
    error.value = handleError(e, 'NewOpportunity.initializeOpportunity');
    return false;
  }
}
```

### Step 3: Update selectDealType to Check for Success
- Modify `selectDealType()` to only advance if initialization succeeds

```typescript
async function selectDealType(type: 'BRANCH' | 'MOBILE_BUYING') {
  buyingType.value = type;
  const success = await initializeOpportunity();
  if (success) {
    pushStep('contact');
  }
  // If failed, error.value is already set and displayed to user
}
```

### Step 4: Verify the Fix
- Test the wizard flow by selecting a deal type
- Verify that the wizard advances to the contact step
- Verify that errors are displayed properly if the API call fails

### Step 5: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes
No database changes required.

## Testing Strategy

### Regression Tests
1. **Happy Path**: Select deal type → Should advance to contact step
2. **API Failure**: Simulate API failure → Should display error, stay on deal-type step
3. **Complete Flow**: Deal type → Contact → Vehicle → Vendor → Complete

### Edge Cases
1. Network timeout during opportunity creation
2. User double-clicks the deal type button rapidly
3. User navigates away and back during opportunity creation
4. API returns success but with empty data

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run test:db` - Test Supabase connection
- `cd apps/web && npm run build` - Build frontend to check for TypeScript errors
- `cd apps/web && npm run dev` - Start dev server and manually test the wizard flow

## Notes
- The `CreateOpportunityWizard.vue` component (used in modals) has the same logic pattern but doesn't exhibit this bug because it uses event emission (`emit('close')`) instead of router navigation (`router.push('/')`)
- Consider unifying the two wizard implementations to reduce code duplication and potential for divergent bugs
- The `handleClose()` function using `router.push('/')` is appropriate for a page-level wizard, but the function should only be called via explicit user action (X button click), not as a side effect of other operations
