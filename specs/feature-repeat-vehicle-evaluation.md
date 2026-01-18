# Feature: Repeat Vehicle Evaluation (Same SPZ/VIN Multiple Times)

## Feature Description
Enable users to create multiple buying opportunities for the same vehicle (identified by SPZ or VIN) over time. This addresses the use case where a customer returns after a period (e.g., 6 months) with the same vehicle, and the business needs to run a fresh validation process. The system will inform users that the vehicle has been seen before and show the history of previous evaluations, while still allowing them to proceed with creating a new buying opportunity.

Currently, the database enforces a unique constraint on SPZ in the `buying_opportunities` table, preventing any duplicate entries. This feature will modify the architecture to support multiple buying opportunities per vehicle while maintaining data integrity and providing users with historical context.

## User Story
As a vehicle purchasing agent
I want to create a new buying opportunity for a vehicle I've evaluated before
So that I can run a fresh validation when a customer returns with the same car months later

## Problem Statement
The current system enforces a unique SPZ constraint on the `buying_opportunities` table, which blocks any attempt to create a duplicate entry. While this prevents accidental duplicates, it creates a significant limitation for the real-world use case where:
- A customer may return with the same vehicle after several months
- Market conditions, vehicle condition, or vendor circumstances may have changed
- The business needs to perform a fresh validation with updated documents and data
- Historical data from previous evaluations should be preserved for reference

The error message "Prileztitost s touto SPZ jiz existuje" (Opportunity with this SPZ already exists) does not provide context about when the previous opportunity was created or its outcome.

## Solution Statement
Implement a "repeat vehicle evaluation" flow that:

1. **Removes the unique constraint on SPZ** in the `buying_opportunities` table, allowing multiple opportunities per vehicle
2. **Adds a vehicle history detection mechanism** that checks for existing opportunities with the same SPZ when creating a new one
3. **Displays an informational modal** showing previous opportunities (date, status, vendor) when duplicates are detected
4. **Allows users to continue** with creating a new opportunity after acknowledging the history
5. **Links related opportunities** through a shared vehicle identifier for historical tracking
6. **Preserves full audit trail** of all evaluations for compliance and business intelligence

## Relevant Files
Use these files to implement the feature:

### Database Layer
- `supabase/migrations/001_initial_schema.sql` - Contains the UNIQUE constraint on SPZ that needs to be modified
- Contains `buying_opportunities`, `vehicles`, `ocr_extractions` table schemas

### Frontend - Creation Flow
- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - Main wizard where duplicate detection needs to happen (lines 355-368 for upload, 448-461 for manual)
- `apps/web/src/components/shared/QuickVehicleForm.vue` - Manual entry form that captures SPZ
- `apps/web/src/pages/Dashboard.vue` - Entry point for creating opportunities

### Frontend - Display & History
- `apps/web/src/pages/Detail.vue` - Detail page where history could be displayed
- `apps/web/src/types/index.ts` - Type definitions for BuyingOpportunity

### Error Handling
- `apps/web/src/composables/useErrorHandler.ts` - Error handler that catches code 23505 (duplicate key)

### New Files
- `supabase/migrations/018_remove_spz_unique_constraint.sql` - Migration to modify the unique constraint
- `apps/web/src/components/shared/VehicleHistoryModal.vue` - Modal to display previous opportunities
- `apps/web/src/composables/useVehicleHistory.ts` - Composable for fetching vehicle history

## Implementation Plan

### Phase 1: Foundation
Modify the database schema to allow multiple buying opportunities per SPZ while maintaining data integrity through other means.

**Key decisions:**
- Remove the UNIQUE constraint on `buying_opportunities.spz`
- Add a composite index for efficient history queries
- Consider adding a `vehicle_group_id` or similar field to link related opportunities (optional, can use SPZ-based queries)

### Phase 2: Core Implementation
Implement the duplicate detection and user notification flow in the frontend.

**Key components:**
1. Pre-creation check: Query existing opportunities by SPZ before insert
2. History modal: Display previous opportunities with relevant details
3. User confirmation: Allow explicit acknowledgment before proceeding
4. Continue creation: Proceed with normal flow after acknowledgment

### Phase 3: Integration
Ensure the history is accessible throughout the application.

**Integration points:**
1. Detail page: Show link to related opportunities in a sidebar or header
2. Dashboard: Consider adding a "has history" indicator
3. Validation results: Reference previous validation outcomes if relevant

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Database Migration
- Create `supabase/migrations/018_remove_spz_unique_constraint.sql`
- Drop the unique constraint on `buying_opportunities.spz`
- Add a non-unique index on SPZ for query performance
- Add a composite index on `(spz, created_at DESC)` for efficient history queries

### Step 2: Create VehicleHistory Composable
- Create `apps/web/src/composables/useVehicleHistory.ts`
- Implement `checkVehicleHistory(spz: string)` function that queries for existing opportunities
- Return an array of previous opportunities with: id, spz, status, created_at, vendor name
- Add loading and error states

### Step 3: Create VehicleHistoryModal Component
- Create `apps/web/src/components/shared/VehicleHistoryModal.vue`
- Display title: "Vozidlo bylo jiz drive hodnoceno" (Vehicle has been evaluated before)
- Show table of previous opportunities:
  - Date created
  - Status (with StatusBadge)
  - Vendor name
  - Link to view detail
- Add two action buttons:
  - "Zobrazit posledni" (View Latest) - navigate to most recent opportunity
  - "Pokracovat" (Continue) - proceed with creating new opportunity
- Include informational text explaining that a new evaluation will be created

### Step 4: Integrate History Check in CreateOpportunityWizard
- Modify `apps/web/src/components/shared/CreateOpportunityWizard.vue`
- Before inserting new `buying_opportunity`, call `checkVehicleHistory(spz)`
- If history exists, show VehicleHistoryModal
- Only proceed with insert after user clicks "Continue"
- Update error handling to remove the 23505 duplicate key check (no longer needed)

### Step 5: Update QuickVehicleForm Validation
- Modify `apps/web/src/components/shared/QuickVehicleForm.vue`
- No changes to validation logic (SPZ format check remains)
- The duplicate check happens at the wizard level, not the form level

### Step 6: Add History Indicator to Dashboard
- Modify `apps/web/src/pages/Dashboard.vue`
- Add optional: Visual indicator (icon or badge) if an SPZ has multiple opportunities
- This could be a count badge or a small icon next to SPZ

### Step 7: Add History Section to Detail Page
- Modify `apps/web/src/pages/Detail.vue`
- Add a collapsible section or sidebar link showing related opportunities
- Display: "Dalsi hodnoceni tohoto vozidla" (Other evaluations of this vehicle)
- Link to navigate between related opportunities

### Step 8: Update Types
- Update `apps/web/src/types/index.ts` if needed
- Add VehicleHistory interface if creating a dedicated type

### Step 9: Add Tests
- Create tests for `useVehicleHistory.ts` composable
- Create tests for `VehicleHistoryModal.vue` component
- Update `CreateOpportunityWizard.spec.ts` to test the history flow
- Test scenarios:
  - No history: proceeds normally
  - Has history: shows modal, user continues
  - Has history: shows modal, user navigates to existing

### Step 10: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes

### Migration: 018_remove_spz_unique_constraint.sql

```sql
-- ============================================================================
-- Migration: Allow multiple buying opportunities per SPZ
-- ============================================================================
-- Purpose: Enable repeat vehicle evaluations by removing the unique constraint
-- on SPZ while maintaining query performance through proper indexing.
-- ============================================================================

-- Step 1: Drop the unique constraint on SPZ
-- The constraint name is derived from the column and table name
ALTER TABLE buying_opportunities DROP CONSTRAINT IF EXISTS buying_opportunities_spz_key;

-- Step 2: Ensure the index on SPZ still exists for query performance
-- (The original migration created this, but let's make sure)
CREATE INDEX IF NOT EXISTS idx_buying_opportunities_spz ON buying_opportunities(spz);

-- Step 3: Add composite index for efficient history queries
-- This allows fast lookup of all opportunities for a given SPZ, ordered by date
CREATE INDEX IF NOT EXISTS idx_buying_opportunities_spz_created
ON buying_opportunities(spz, created_at DESC);

-- Step 4: Add a comment explaining the change
COMMENT ON COLUMN buying_opportunities.spz IS
'Vehicle license plate - not unique, allows multiple evaluations over time';
```

**No changes to RLS policies** - the existing policies allow authenticated users to select/insert/update all records.

## Testing Strategy

### Unit Tests
- `useVehicleHistory.spec.ts`:
  - Test returns empty array for new SPZ
  - Test returns array of opportunities for existing SPZ
  - Test handles errors gracefully
  - Test loading state management
- `VehicleHistoryModal.spec.ts`:
  - Test displays correct number of previous opportunities
  - Test "Continue" button emits continue event
  - Test "View Latest" navigates to correct opportunity
  - Test correct date formatting
  - Test status badges display correctly
- `CreateOpportunityWizard.spec.ts` (updates):
  - Test shows history modal when duplicates exist
  - Test proceeds after user acknowledges
  - Test does not show modal for new SPZ

### Edge Cases
- SPZ with many previous opportunities (10+) - test pagination or scrolling
- Very old opportunities (years ago) - date formatting
- Opportunities with different statuses (DRAFT, PENDING, VALIDATED, REJECTED)
- Opportunities without vendor data (show "-" or "Neuvedeno")
- Concurrent creation attempts for same SPZ
- User refreshes during history modal display

## Acceptance Criteria
1. [ ] User can create a new buying opportunity for an SPZ that already exists in the system
2. [ ] When entering an existing SPZ, user sees a modal showing previous evaluations
3. [ ] Modal displays: creation date, status, and vendor name for each previous opportunity
4. [ ] User can click "Continue" to proceed with creating a new opportunity
5. [ ] User can click "View Latest" to navigate to the most recent existing opportunity
6. [ ] New opportunity is created successfully with the same SPZ as previous ones
7. [ ] Dashboard shows all opportunities (including duplicates) correctly
8. [ ] Detail page shows link to other evaluations of the same vehicle
9. [ ] All existing functionality continues to work
10. [ ] Frontend builds without errors
11. [ ] All tests pass

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend
- `cd apps/web && npm run test` - Run frontend tests
- `supabase db push` - Apply migration to database

## Notes

### Design Considerations
- **Why remove unique constraint vs. soft delete/reactivate**: Removing the constraint provides the cleanest solution. Alternative approaches like soft-delete or status-based reactivation would add complexity and could confuse users about which record is "active"
- **Vehicle grouping**: While we could add a `vehicle_group_id` to explicitly link related opportunities, using SPZ-based queries is simpler and sufficient for MVP. This can be enhanced later if needed
- **VIN consideration**: This feature focuses on SPZ as the primary identifier. VIN is not unique in the vehicles table, so no changes needed there. Future enhancement could add history lookup by VIN as well

### Business Intelligence Value
With this change, the system can provide valuable insights:
- How often do vehicles return for re-evaluation?
- What is the typical time between evaluations?
- Do validation outcomes change between evaluations?
- Which vendors are repeat sellers?

### Future Enhancements
- Add analytics tracking for repeat vehicle patterns
- Implement a "copy from previous" feature to pre-fill forms with last evaluation data
- Add comparison view between current and previous validation results
- Notify users if a vehicle's validation status changed significantly
