# Feature: App Purpose Text and Navigation Enhancement

## Feature Description
Add static explanatory text in Czech describing the purpose of the SecureDealAI application and convert the "SecureDealAI" header text into a clickable navigation element that returns users to the home page (Dashboard). The explanatory text will inform users that the app is designed to simulate buying workflows, validate rules, and create new rules to validate end-to-end flows.

## User Story
As a user of SecureDealAI
I want to see a clear explanation of the app's purpose and easily navigate back to the home page
So that I understand what the application does and can quickly return to the main dashboard from any page

## Problem Statement
Currently, the application lacks:
1. An explanation of its purpose, leaving users unclear about what the app does
2. A clickable logo/title in the header for quick navigation back to the dashboard
3. Consistent navigation patterns across all pages

## Solution Statement
1. Add a static description section in Czech on the Dashboard explaining the app simulates buying workflows, validates rules, and allows creation of new validation rules for end-to-end testing
2. Convert the "SecureDealAI" title in the App.vue header into a clickable link (using router-link) that navigates to the home page (/)
3. Update all page headers to use consistent navigation patterns

## Relevant Files
Use these files to implement the feature:

### Existing Files to Modify
- `apps/web/src/App.vue` - Main application layout with global header; needs to convert h1 to router-link for navigation
- `apps/web/src/pages/Dashboard.vue` - Dashboard page where the description text should be added; currently has a duplicate header that should be updated
- `apps/web/src/pages/Detail.vue` - Detail page with its own header; should use consistent navigation pattern
- `apps/web/src/router/index.ts` - Router configuration; already has "/" route for Dashboard (no changes needed)

### New Files
No new files are required. All changes will be made to existing components.

## Implementation Plan

### Phase 1: Foundation
Understand the current header structure across App.vue, Dashboard.vue, and Detail.vue to ensure consistent navigation patterns.

### Phase 2: Core Implementation
1. Update App.vue to make "SecureDealAI" a clickable link
2. Add Czech description text to the Dashboard
3. Clean up duplicate headers to avoid confusion

### Phase 3: Integration
Verify that navigation works consistently across all pages and the description displays properly.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update App.vue Header Navigation
- Import `RouterLink` from `vue-router` in the script section
- Replace the static `<h1>SecureDealAI</h1>` with a `<router-link to="/">` element
- Maintain the same styling (text-2xl font-bold text-gray-900)
- Add hover effect (hover:text-blue-600) for visual feedback
- Add cursor-pointer class for clickability indication

### Step 2: Add Description Section to Dashboard
- Add a new section below the existing Dashboard header
- Create a styled info box with:
  - Light blue/gray background for distinction
  - Czech text explaining:
    - "Tato aplikace slouzi k simulaci procesu nakupu vozidel"
    - "Umoznuje validovat data podle definovanych pravidel"
    - "Podporuje tvorbu novych validacnich pravidel pro end-to-end testovani"
  - Use proper typography and spacing
- Place this above the search bar but below the header

### Step 3: Clean Up Dashboard Header
- The Dashboard currently has its own header inside the page
- This creates a duplicate "SecureDealAI" text
- Refactor Dashboard to remove its internal header and rely on App.vue's global header
- Keep the "+ Nova prilezitost" button positioned appropriately

### Step 4: Update Detail.vue Navigation
- The Detail page has its own header with "SecureDealAI"
- Update to use a consistent router-link pattern
- Ensure the back button and navigation work together smoothly

### Step 5: Add Accessibility and UX Improvements
- Ensure all navigation elements have proper aria-labels
- Test keyboard navigation (Enter key on focused link)
- Verify hover states are visible

### Step 6: Run Validation Commands
- Execute `cd apps/web && npm run build` to verify no TypeScript errors
- Execute `cd apps/web && npm run test` to verify unit tests pass
- Manually test navigation flow in browser

## Database Changes
No database changes required. This is a frontend-only feature.

## Testing Strategy

### Unit Tests
- Test that router-link renders correctly in App.vue
- Test that clicking "SecureDealAI" triggers navigation to "/"
- Test that description text renders on Dashboard

### Edge Cases
- Navigation from Detail page back to Dashboard via logo click
- Navigation when already on Dashboard (should not cause issues)
- Mobile responsiveness of description text
- Very long SPZ values don't break header layout

## Acceptance Criteria
1. Clicking "SecureDealAI" in the header navigates to the Dashboard (/)
2. Czech description text is visible on the Dashboard explaining:
   - The app simulates vehicle buying workflows
   - It validates data according to defined rules
   - It supports creating new validation rules for E2E testing
3. Navigation works consistently from all pages (Dashboard, Detail, AccessCode)
4. No duplicate "SecureDealAI" text appears on any page
5. The header remains visually consistent with current design
6. Build completes without errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd apps/web && npm run build` - Build frontend (verifies TypeScript and Vue compilation)
- `cd apps/web && npm run test` - Run unit tests

## Notes
- The description text should use proper Czech with diacritics (e.g., "slouzi" should be "slouzi" - note: confirm with user if diacritics are preferred)
- Consider making the description collapsible in future iterations if it takes too much space
- The router-link approach is preferred over @click with router.push() for better SEO and accessibility (native link behavior)
- Future enhancement: Add a dedicated "About" page if more detailed information is needed
