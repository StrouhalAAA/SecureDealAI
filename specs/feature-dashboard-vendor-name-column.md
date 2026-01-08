# Feature: Dashboard Vendor Name Column

## Feature Description
Add a new "Vendor Name" column to the buying opportunities table in the Dashboard page. This column will display the vendor's name associated with each buying opportunity, providing users with immediate visibility into who the seller is without needing to navigate to the detail page.

## User Story
As a vehicle purchase analyst
I want to see the vendor name directly in the opportunities list
So that I can quickly identify and prioritize opportunities based on the seller

## Problem Statement
Currently, the Dashboard table displays only SPZ (license plate), Status, and Created date for each buying opportunity. Users must click into each opportunity's detail page to see vendor information, which slows down the workflow when reviewing multiple opportunities. Adding the vendor name to the main table view will improve efficiency and decision-making.

## Solution Statement
Modify the Dashboard page to include a new "Prodejce" (Vendor) column in the opportunities table. This requires:
1. Updating the Supabase query to join the `vendors` table and fetch the vendor name
2. Adding the new column to the table header and body
3. Handling cases where a vendor doesn't exist yet (show a placeholder)
4. Updating the TypeScript types to include vendor data

## Relevant Files
Use these files to implement the feature:

### Existing Files to Modify

- **`apps/web/src/pages/Dashboard.vue`** - Main dashboard page containing the opportunities table. The template needs a new column and the script needs query modifications.

- **`apps/web/src/types/index.ts`** - TypeScript types. The `BuyingOpportunity` interface needs to be extended with vendor information or a new extended type created.

### Reference Files (Read-only)

- **`apps/web/src/composables/useDetailData.ts`** - Shows the pattern for fetching vendor data alongside buying opportunities using Supabase.

- **`apps/web/e2e/dashboard.spec.ts`** - E2E tests for the dashboard. Should be extended to verify the new column.

- **`supabase/migrations/001_initial_schema.sql`** - Database schema showing the relationship between `buying_opportunities` and `vendors` tables (1:1 via `buying_opportunity_id`).

### New Files
No new files are required for this feature.

## Implementation Plan

### Phase 1: Foundation
Extend the TypeScript types to support vendor data in the buying opportunities list view. Create an extended type that includes the vendor name to maintain backward compatibility with existing code.

### Phase 2: Core Implementation
Update the Dashboard.vue component:
1. Modify the Supabase query to join the `vendors` table
2. Add the "Prodejce" column header to the table
3. Add the vendor name cell to each table row
4. Handle the case where vendor data is not yet available

### Phase 3: Integration
Test the integration and ensure the dashboard displays correctly with the new column. Verify edge cases like opportunities without vendors.

## Step by Step Tasks

### Step 1: Extend TypeScript Types
- Add a new `BuyingOpportunityWithVendor` type in `apps/web/src/types/index.ts` that extends `BuyingOpportunity` with vendor name information
- This preserves backward compatibility while providing type safety for the new data

### Step 2: Update Supabase Query
- Modify the `fetchOpportunities` function in `Dashboard.vue` to use a foreign table select
- The Supabase query pattern: `.select('*, vendors(name)')` to include vendor data
- Ensure the count query still works correctly with the join

### Step 3: Add Table Column Header
- Add a new `<th>` element for "Prodejce" (Vendor) in the table header
- Position it between "Status" and "Vytvořeno" for logical grouping

### Step 4: Add Table Column Body
- Add a new `<td>` element to display the vendor name
- Use a fallback value like "-" or "Nezadán" (Not set) when vendor is null
- Apply consistent styling with existing cells

### Step 5: Update Component Typing
- Update the `opportunities` ref to use the new extended type
- Ensure TypeScript is satisfied with the vendor property access

### Step 6: Update E2E Tests
- Add test assertions in `apps/web/e2e/dashboard.spec.ts` to verify the vendor column exists
- Optionally test that vendor names are displayed correctly

### Step 7: Run Validation Commands
- Execute build and test commands to verify zero regressions

## Database Changes
No database changes required. The `vendors` table already has:
- `buying_opportunity_id` foreign key to `buying_opportunities(id)`
- `name` field (VARCHAR(200), NOT NULL)

The relationship is 1:1 with `UNIQUE(buying_opportunity_id)` constraint.

## Testing Strategy

### Unit Tests
No additional unit tests required - this is primarily a UI display change.

### E2E Tests
- Verify the "Prodejce" column header is visible
- Verify vendor names display in table rows
- Verify "-" or placeholder shows for opportunities without vendors

### Manual Testing
- Create a new opportunity (no vendor yet) - should show placeholder
- Add vendor to opportunity - table should show vendor name
- Verify pagination still works with the new column
- Verify search still works correctly

### Edge Cases
- Opportunity with no vendor: Show "-" or "Nezadán"
- Vendor with very long name: Should not break table layout (CSS truncation may be needed)
- Multiple opportunities from same vendor: All should display correctly
- Empty table state: Should still show correct column structure

## Acceptance Criteria
- [ ] Dashboard table displays "Prodejce" column header between Status and Vytvořeno
- [ ] Each row shows the vendor name from the associated vendor record
- [ ] Rows without a vendor show "-" placeholder
- [ ] TypeScript types are properly defined with no type errors
- [ ] Build passes without errors (`npm run build`)
- [ ] E2E tests pass with new column assertions
- [ ] Table layout remains responsive and readable

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `cd apps/web && npm run build` - Build frontend
- `cd apps/web && npm run test` - Run frontend tests
- `npm run test:e2e` - Run E2E tests

## Notes
- The vendor name column uses the Czech label "Prodejce" to match the application's Czech language UI
- If vendor names can be long, consider adding CSS `truncate` class or `max-w-*` constraint with hover tooltip
- Future enhancement: Could add vendor type indicator (FO/PO icon) alongside the name
- The Supabase query uses PostgREST's resource embedding syntax (`vendors(name)`) which performs an efficient JOIN
