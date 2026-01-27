# Feature: URL-Based Step Navigation with Data Persistence

## Feature Description
Add URL-based step tracking and automatic data persistence to the new-opportunity wizard. Currently, when a user navigates through the multi-step wizard at `/new-opportunity`, the URL never changes. If the user encounters an issue or accidentally navigates away (browser back button, refresh, or manual URL entry), they lose all entered data and must start over.

This feature implements:
1. **URL-based step tracking**: Each step in the wizard will be reflected in the URL (e.g., `/new-opportunity?step=contact`)
2. **Automatic data persistence**: Form data is saved to sessionStorage as the user types, enabling recovery on navigation errors
3. **Draft recovery**: When returning to the wizard, users can resume from where they left off with all their data intact

## User Story
As a výkupčí (buyer agent)
I want the wizard URL to reflect my current step and my data to be saved automatically
So that I don't lose my work if I accidentally navigate away or encounter a browser issue

## Problem Statement
Currently, the `/new-opportunity` wizard:
1. **URL never changes** - Users cannot bookmark, share, or return to a specific step
2. **Data lives only in component state** - All form data is lost on page refresh or browser back
3. **No draft recovery** - Partially completed opportunities cannot be resumed
4. **Poor UX on navigation errors** - Any navigation mistake requires starting over completely

Example scenario: User fills out contact information (Step 2), proceeds to vehicle step (Step 3), but needs to go back due to an issue. Using browser back button navigates away from the wizard entirely, losing all contact data entered.

## Solution Statement
Implement a three-part solution:

1. **URL Query Parameter for Steps**: Use Vue Router's query params to track current step (`/new-opportunity?step=contact`). Handle browser back/forward navigation properly.

2. **Pinia Store for Form State**: Create an `opportunityDraftStore` to centralize all wizard state. This store will:
   - Hold all form data across steps
   - Sync to sessionStorage automatically
   - Support hydration on page load/refresh

3. **Auto-Save Mechanism**: Save form data to sessionStorage on every change using debounced watchers, ensuring data survives page refresh/navigation.

## Relevant Files
Use these files to implement the feature:

### Existing Files to Modify

- `apps/web/src/pages/NewOpportunity.vue`
  - Main wizard component that needs refactoring to use new store and URL-based navigation
  - Currently holds all state in local refs (894 lines)
  - Must integrate with new `opportunityDraftStore`

- `apps/web/src/router/index.ts`
  - Router configuration needs navigation guards for step validation
  - Must handle query param changes for wizard steps

- `apps/web/src/components/forms/ContactForm.vue`
  - Contact form component that needs to read/write from store instead of local state
  - Emits data to parent, needs to emit to store

- `apps/web/src/components/forms/VendorForm.vue`
  - Vendor form component, similar changes as ContactForm

- `apps/web/src/components/shared/QuickVehicleForm.vue`
  - Manual vehicle entry form, integrate with store

### New Files

- `apps/web/src/stores/opportunityDraftStore.ts`
  - New Pinia store for wizard state management
  - Handles all form data, step tracking, and sessionStorage sync

- `apps/web/src/composables/useWizardNavigation.ts`
  - Composable for URL-based wizard navigation
  - Wraps Vue Router for step-aware navigation

## Implementation Plan

### Phase 1: Foundation
Create the state management infrastructure:
1. Design and implement `opportunityDraftStore` Pinia store
2. Implement sessionStorage persistence with hydration
3. Create `useWizardNavigation` composable for URL handling

### Phase 2: Core Implementation
Integrate store with existing components:
1. Refactor `NewOpportunity.vue` to use store instead of local refs
2. Add URL query param synchronization
3. Update form components to read/write from store
4. Implement auto-save with debounced watchers

### Phase 3: Integration
Connect all pieces and handle edge cases:
1. Add route guards for step validation
2. Handle browser back/forward navigation
3. Add draft recovery UI (optional prompt when resuming)
4. Clean up draft data on successful completion

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create the Opportunity Draft Store
- Create `apps/web/src/stores/opportunityDraftStore.ts`
- Define interface for draft state (matches current NewOpportunity refs)
- Implement actions for each form step (setContactData, setVehicleData, setVendorData)
- Add step tracking (currentStep, stepHistory)
- Implement sessionStorage sync (save on change, load on init)
- Add `clearDraft()` action for cleanup after completion

### Step 2: Create the Wizard Navigation Composable
- Create `apps/web/src/composables/useWizardNavigation.ts`
- Implement URL query param reading (`step=deal-type|contact|choice|...`)
- Create `navigateToStep(step)` function that updates both store and URL
- Handle browser back/forward via `popstate` event or route watcher
- Sync initial step from URL on mount

### Step 3: Update Router Configuration
- Add navigation guard for `/new-opportunity` route
- Validate `step` query param against valid step names
- Redirect invalid steps to `deal-type` (first step)
- Handle deep linking (user enters URL directly with step)

### Step 4: Refactor NewOpportunity.vue - State Migration
- Import and use `opportunityDraftStore`
- Replace local refs with store state:
  - `currentStep` → `draftStore.currentStep`
  - `stepHistory` → `draftStore.stepHistory`
  - `buyingType` → `draftStore.buyingType`
  - `savedContact` → `draftStore.contactData`
  - `ocrExtraction` → `draftStore.ocrExtraction`
  - etc.
- Update computed properties to use store getters
- Update `pushStep()` and `goBack()` to use store actions

### Step 5: Integrate URL Navigation in NewOpportunity.vue
- Use `useWizardNavigation` composable
- Watch route query changes to sync step
- Update all step transitions to use URL-aware navigation
- Handle `onMounted` to restore step from URL

### Step 6: Update ContactForm Integration
- Modify ContactForm to emit data on every change (not just save)
- Add `@update:form` event that fires on input changes
- Parent (NewOpportunity) writes to store on update
- Remove requirement to save to DB before proceeding (save on wizard completion)
- Or: Keep DB save but also sync to store for recovery

### Step 7: Update VendorForm Integration
- Same pattern as ContactForm
- Emit form changes to parent for store sync
- Ensure vendor data persists across navigation

### Step 8: Update QuickVehicleForm Integration
- Add `@update:form` event for real-time sync
- Parent writes to store on changes

### Step 9: Handle OCR/Upload State Persistence
- Save `ocrExtraction` object to store
- Save `uploadedFile` metadata (can't persist File object, but can track name/status)
- On recovery, show message that file needs re-upload if OCR incomplete

### Step 10: Add Draft Recovery UX
- On wizard mount, check if draft exists in sessionStorage
- If draft exists and has data, show "Resume" prompt
- Allow user to continue from saved state or start fresh
- Clear draft on "Start Fresh"

### Step 11: Clean Up on Completion
- Call `draftStore.clearDraft()` in `completeWizard()`
- Clear sessionStorage data
- Reset store to initial state

### Step 12: Add Browser Navigation Handling
- Handle browser back button within wizard (stay in wizard, go to previous step)
- Prevent accidental exit with confirmation if draft has unsaved data
- Use `beforeunload` event for page close warning

### Step 13: Write Unit Tests
- Test `opportunityDraftStore` actions and persistence
- Test `useWizardNavigation` URL synchronization
- Test step transitions with URL changes

### Step 14: Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

## Database Changes
None required. This feature only affects frontend state management.

### Schema Changes
None.

### Migrations
None.

### RLS Policies
None.

### Indexes & Performance
None.

## Testing Strategy

### Unit Tests
1. **opportunityDraftStore tests**:
   - Test initial state is empty
   - Test setContactData/setVehicleData/setVendorData update state
   - Test sessionStorage sync works (mock storage)
   - Test clearDraft resets all state
   - Test hydration from sessionStorage on init

2. **useWizardNavigation tests**:
   - Test navigateToStep updates URL query
   - Test initial step is read from URL
   - Test invalid step redirects to deal-type

### Integration Tests
1. Fill contact form, navigate away, return - verify data persists
2. Complete steps 1-3, refresh page - verify step and data restore
3. Use browser back/forward - verify correct step navigation

### Edge Cases
1. **Deep linking**: User enters `/new-opportunity?step=vendor-form` directly
   - Should redirect to `deal-type` if no prior steps completed
   - Or show error and redirect

2. **Expired session storage**: sessionStorage data exists but is from old session
   - Check for opportunity ID match or timestamp
   - Clear stale data

3. **Concurrent tabs**: User opens wizard in two tabs
   - Each tab should have independent draft (use unique key per tab)

4. **File upload recovery**: OCR upload was in progress when user navigated away
   - Show message that upload needs to restart
   - Keep extracted data if OCR completed

5. **Browser with no sessionStorage**: Rare but possible
   - Gracefully degrade to current behavior (no persistence)

6. **Very long drafts**: User leaves wizard open for extended time
   - Consider draft expiration (24 hours?)

## Acceptance Criteria
1. URL changes when user moves between wizard steps (e.g., `/new-opportunity?step=contact`)
2. Entering URL with step query param navigates to correct step (if valid)
3. Browser back button navigates to previous wizard step (not away from wizard)
4. Page refresh preserves current step and all form data
5. Contact form data entered in step 2 persists if user goes back to step 1
6. OCR extraction data persists across step navigation
7. On successful wizard completion, draft is cleared
8. On wizard start, if draft exists, user is prompted to resume or start fresh

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Notes
- The existing `useStepNavigation` composable (`apps/web/src/composables/useStepNavigation.ts`) provides generic step navigation but doesn't handle URL sync - the new `useWizardNavigation` composable will extend this pattern
- Form components currently save to Supabase immediately on "save" - this behavior should be preserved, but we add sessionStorage as a backup layer
- Consider future enhancement: server-side draft storage for cross-device continuity
- sessionStorage is preferred over localStorage because drafts should not persist after browser close
- The unique step names (`deal-type`, `contact`, `choice`, `upload-orv`, `manual-entry`, `vendor-decision`, `vendor-form`) are already defined in `WizardStep` type - use these directly as URL param values
