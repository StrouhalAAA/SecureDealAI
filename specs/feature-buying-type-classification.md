# Feature: BuyingType Classification for Validation Rules

**Created:** 2026-01-18
**Status:** Ready for Implementation
**Author:** Development Team

---

## Feature Description

Implement BuyingType (deal type) classification for buying opportunities to enable context-aware validation rule filtering. The system currently defines two buying types (`BRANCH` and `MOBILE_BUYING`) in the validation rules schema via `applicableToBuyingType` metadata, and a database function `get_active_validation_rules_filtered` exists to filter rules - but this filtering is NOT currently used.

This feature will:
1. Add `buying_type` column to `buying_opportunities` table
2. Capture deal type selection during opportunity creation
3. Pass the buying type to the validation engine
4. Filter validation rules based on buying type so only applicable rules execute

This enables different validation strictness levels for different sales channels (e.g., branch deals require ID card verification, mobile buying may have relaxed document requirements).

## User Story

As a deal validator
I want buying opportunities to be classified by deal type (Branch or Mobile Buying)
So that the appropriate validation rules are applied based on the sales channel

## Problem Statement

Currently, ALL validation rules run for every buying opportunity regardless of context. The validation rules schema supports `applicableToBuyingType` metadata (e.g., some rules are `["BRANCH"]` only), but:
- The `buying_opportunities` table has no `buying_type` column
- The CreateOpportunityWizard does not capture deal type
- The validation engine loads ALL active rules without filtering by buying type
- The existing database function `get_active_validation_rules_filtered` is never called

This means rules intended only for branch operations incorrectly run for all deals.

## Solution Statement

1. **Database**: Add `buying_type` column to `buying_opportunities` with default `'BRANCH'`
2. **Frontend**: Update CreateOpportunityWizard to include deal type selection step
3. **Types**: Update TypeScript interfaces to include `buying_type`
4. **API**: Modify validation-run Edge Function to load `buying_type` and pass to engine
5. **Engine**: Update rules-loader to filter rules by buying type using the existing database function

## Relevant Files

Use these files to implement the feature:

### Database & Migrations
- `supabase/migrations/001_initial_schema.sql` - Reference for existing schema; contains `get_active_validation_rules_filtered` function that needs to be used
- `docs/architecture/DB_SCHEMA_DYNAMIC_RULES.sql` - Documentation of the filtering function

### Frontend Components
- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - Main wizard to add deal type selection
- `apps/web/src/types/index.ts` - Add `buying_type` to `BuyingOpportunity` interface
- `apps/web/src/composables/useRules.ts` - Already defines `BUYING_TYPES` constant

### Backend Validation Engine
- `supabase/functions/validation-run/index.ts` - Load `buying_type` from opportunity, pass to engine
- `supabase/functions/validation-run/engine.ts` - Accept `buying_type` parameter for rule filtering
- `supabase/functions/validation-run/rules-loader.ts` - Implement filtered rule loading
- `supabase/functions/validation-run/types.ts` - Already has `BuyingType` and `BuyingOpportunityData` types

### Seed Data Reference
- `docs/architecture/VALIDATION_RULES_SEED.json` - Shows which rules have `applicableToBuyingType` set

### New Files

- `supabase/migrations/021_add_buying_type.sql` - Add buying_type column to buying_opportunities

## Implementation Plan

### Phase 1: Foundation (Database)
Add the `buying_type` column to the `buying_opportunities` table with appropriate constraints and default value. Create a database migration that is backward-compatible with existing data.

### Phase 2: Frontend (UI)
Update the CreateOpportunityWizard to capture deal type selection before document upload. Show two options: "Pobočka" (Branch) and "Mobilní výkup" (Mobile Buying). Store the selection when creating the buying opportunity.

### Phase 3: Core Implementation (Backend)
Modify the validation-run Edge Function to:
1. Load `buying_type` from the buying opportunity
2. Pass it to the validation engine
3. Update rules-loader to use `get_active_validation_rules_filtered` function

### Phase 4: Integration
Update the validation engine to include `buying_opportunity` data in the input, enabling rule conditions to check `buying_opportunity.buying_type` for advanced filtering.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Database Migration

Create `supabase/migrations/021_add_buying_type.sql`:

```sql
-- ============================================================================
-- Add buying_type column to buying_opportunities
-- Enables filtering of validation rules by deal channel type
-- ============================================================================

-- Add buying_type column with default 'BRANCH' (backward compatible)
ALTER TABLE buying_opportunities
ADD COLUMN IF NOT EXISTS buying_type VARCHAR(20) DEFAULT 'BRANCH'
CHECK (buying_type IN ('BRANCH', 'MOBILE_BUYING'));

-- Add comment for documentation
COMMENT ON COLUMN buying_opportunities.buying_type IS
    'Deal channel type: BRANCH (default) for in-branch deals, MOBILE_BUYING for mobile buying agents';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_buying_opportunities_buying_type
ON buying_opportunities(buying_type);
```

### Step 2: Apply Migration Locally

- Run `supabase db reset` to apply migration
- Verify column exists: `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'buying_opportunities' AND column_name = 'buying_type';`

### Step 3: Update Frontend Types

Update `apps/web/src/types/index.ts`:

- Add `buying_type` to `BuyingOpportunity` interface:
  ```typescript
  export interface BuyingOpportunity {
    id: string;
    spz: string;
    status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED';
    buying_type: 'BRANCH' | 'MOBILE_BUYING';  // Add this
    created_at: string;
    updated_at: string;
  }
  ```

### Step 4: Update CreateOpportunityWizard - Add Deal Type Step

Update `apps/web/src/components/shared/CreateOpportunityWizard.vue`:

- Add new step type `'deal-type'` before `'choice'`
- Add `buyingType` ref with default `'BRANCH'`
- Create deal type selection UI with two cards:
  - "Pobočka" (Branch) - icon: building, description: "Výkup na pobočce"
  - "Mobilní výkup" (Mobile Buying) - icon: car, description: "Mobilní výkup u zákazníka"
- Include `buying_type` in the Supabase insert for both `createFromUpload` and `createFromManual`

### Step 5: Update Wizard Step Flow

- Initial step should be `'deal-type'` instead of `'choice'`
- After deal type selection, proceed to `'choice'` (upload vs manual)
- Update `stepTitle` computed to include deal type step title
- Update `goBack` logic to handle the new step

### Step 6: Pass buying_type to Database Insert

In `CreateOpportunityWizard.vue`, update both insert calls:

```typescript
// In createFromUpload and createFromManual
const { data: opportunity, error: createError } = await supabase
  .from('buying_opportunities')
  .insert({
    spz: spz.value.toUpperCase(),
    buying_type: buyingType.value  // Add this
  })
  .select()
  .single();
```

### Step 7: Update Validation Run - Load buying_type

Update `supabase/functions/validation-run/index.ts`:

In `loadValidationData` function, include `buying_type` in the select:

```typescript
const { data: opportunity, error: oppError } = await supabase
  .from('buying_opportunities')
  .select(`
    id,
    spz,
    buying_type,  // Add this
    vehicles (*),
    vendors (*)
  `)
  .eq('id', buyingOpportunityId)
  .single();
```

Add `buying_opportunity` to the returned `ValidationInputData`:

```typescript
const inputData: ValidationInputData = {
  buying_opportunity: {
    id: opportunity.id,
    spz: opportunity.spz,
    buying_type: opportunity.buying_type ?? 'BRANCH',
  },
  vehicle: vehicle ?? undefined,
  // ... rest
};
```

### Step 8: Update Rules Loader - Add Filtered Loading

Update `supabase/functions/validation-run/rules-loader.ts`:

Add a new function that uses the database filtering function:

```typescript
/**
 * Load active validation rules filtered by vendor type and buying type
 */
export async function loadActiveRulesFiltered(
  vendorType?: 'PHYSICAL_PERSON' | 'COMPANY',
  buyingType: 'BRANCH' | 'MOBILE_BUYING' = 'BRANCH'
): Promise<ValidationRule[]> {
  const client = getSupabaseClient();

  console.log(`[RulesLoader] Loading rules filtered by vendorType=${vendorType}, buyingType=${buyingType}`);

  const { data, error } = await client.rpc('get_active_validation_rules_filtered', {
    p_vendor_type: vendorType ?? null,
    p_buying_type: buyingType,
  });

  if (error) {
    console.error('[RulesLoader] Error loading filtered rules:', error);
    throw new Error(`Failed to load validation rules: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn('[RulesLoader] No filtered rules found');
    return [];
  }

  // Extract and filter enabled rules
  const rules: ValidationRule[] = data.map((row: ValidationRuleRow) => row.rule_definition);
  const enabledRules = rules.filter(rule => rule.enabled !== false);

  console.log(`[RulesLoader] Loaded ${enabledRules.length} filtered rules`);

  return enabledRules;
}
```

### Step 9: Update Validation Engine - Use Filtered Rules

Update `supabase/functions/validation-run/engine.ts`:

Modify `ValidationEngine.validate()` to accept optional filter parameters:

```typescript
interface ValidateOptions {
  vendorType?: 'PHYSICAL_PERSON' | 'COMPANY';
  buyingType?: 'BRANCH' | 'MOBILE_BUYING';
}

async validate(
  inputData: ValidationInputData,
  options?: ValidateOptions
): Promise<ValidationEngineResult> {
  const startTime = performance.now();

  // Determine filter parameters
  const vendorType = options?.vendorType ?? inputData.vendor?.vendor_type;
  const buyingType = options?.buyingType ?? inputData.buying_opportunity?.buying_type ?? 'BRANCH';

  // Load filtered rules
  const rules = await loadActiveRulesFiltered(vendorType, buyingType);
  // ... rest of validation logic
}
```

### Step 10: Update index.ts to Pass Options

Update `supabase/functions/validation-run/index.ts`:

In `handleValidationRequest`, pass the buying type to validate:

```typescript
// Execute validation with context
const result = await validate(inputData, {
  vendorType: inputData.vendor?.vendor_type,
  buyingType: inputData.buying_opportunity?.buying_type ?? 'BRANCH',
});
```

### Step 11: Add BuyingType Display in Dashboard (Optional Enhancement)

Update Dashboard component to display the buying type badge:

- Show "Pobočka" or "Mobilní" badge next to each opportunity
- Use different colors: blue for Branch, green for Mobile Buying

### Step 12: Test Locally

- Start Supabase: `supabase start`
- Create a new opportunity via the wizard, verify deal type selection works
- Check database: `SELECT spz, buying_type FROM buying_opportunities ORDER BY created_at DESC LIMIT 5;`
- Run validation and verify filtered rules are loaded in logs

### Step 13: Run Validation Commands

Execute all validation commands to ensure no regressions.

## Database Changes

### Migration: `021_add_buying_type.sql`

```sql
-- Add buying_type column to buying_opportunities table
ALTER TABLE buying_opportunities
ADD COLUMN IF NOT EXISTS buying_type VARCHAR(20) DEFAULT 'BRANCH'
CHECK (buying_type IN ('BRANCH', 'MOBILE_BUYING'));

COMMENT ON COLUMN buying_opportunities.buying_type IS
    'Deal channel type: BRANCH (default) for in-branch deals, MOBILE_BUYING for mobile buying agents';

CREATE INDEX IF NOT EXISTS idx_buying_opportunities_buying_type
ON buying_opportunities(buying_type);
```

### Existing Function (No Changes Needed)

The `get_active_validation_rules_filtered(p_vendor_type, p_buying_type)` function already exists in `001_initial_schema.sql` and filters rules based on:
- `applicableTo` metadata (vendor type)
- `applicableToBuyingType` metadata (buying type)

Rules without `applicableToBuyingType` are treated as universal (apply to all types).

## Testing Strategy

### Unit Tests

- Test CreateOpportunityWizard deal type selection flow
- Test that buying_type is correctly saved to database
- Test rules-loader filtering function returns correct subset
- Test validation engine uses filtered rules

### Integration Tests

- Create BRANCH opportunity, verify only BRANCH-applicable rules run
- Create MOBILE_BUYING opportunity, verify MOBILE_BUYING rules run
- Verify rules without `applicableToBuyingType` run for both types

### Edge Cases

- Existing opportunities without buying_type should default to BRANCH
- Invalid buying_type value should be rejected by database constraint
- Empty/null buying_type in API should default to BRANCH
- Rules with empty `applicableToBuyingType` array should run for all types

## Acceptance Criteria

### Database
- [ ] `buying_type` column exists on `buying_opportunities` table
- [ ] Column has CHECK constraint for valid values
- [ ] Default value is `'BRANCH'`
- [ ] Existing records have `buying_type = 'BRANCH'`

### Frontend
- [ ] CreateOpportunityWizard shows deal type selection as first step
- [ ] User can select "Pobočka" or "Mobilní výkup"
- [ ] Selected type is saved with the buying opportunity
- [ ] Back navigation works correctly with new step

### Backend
- [ ] Validation-run loads `buying_type` from opportunity
- [ ] Rules-loader uses `get_active_validation_rules_filtered` function
- [ ] Only applicable rules execute based on buying type
- [ ] Logs show filtered rule count

### Validation Behavior
- [ ] VEH-001 (VIN Match, BRANCH only) runs for BRANCH deals
- [ ] VEH-001 does NOT run for MOBILE_BUYING deals
- [ ] VEH-010 (10-Day Re-registration, both types) runs for all deals
- [ ] Rules without `applicableToBuyingType` run for all deal types

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `supabase db reset` - Apply migrations including new buying_type column
- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend
- `cd apps/web && npm run test` - Run frontend tests

## Notes

### Rules Affected by BuyingType

From the seed data, rules with `applicableToBuyingType`:

| Rule ID | Name | Applies To |
|---------|------|------------|
| VEH-001 | VIN Match | `["BRANCH"]` only |
| VND-001 | Full Name Match | `["BRANCH"]` only |
| ARES-001 | Company Existence | `["BRANCH"]` only |
| DOC-001 | ID Card Validity (MVCR) | `["BRANCH"]` only |
| VEH-010 | 10-Day Re-registration | `["BRANCH", "MOBILE_BUYING"]` |
| VEH-011 | Tachometer Present | `["BRANCH", "MOBILE_BUYING"]` |
| VEH-012 | Color Consistency | `["BRANCH", "MOBILE_BUYING"]` |
| VEH-013 | Fuel Type Consistency | `["BRANCH", "MOBILE_BUYING"]` |

Rules without `applicableToBuyingType` (majority) apply to all deal types.

### Future Considerations

- Consider adding "ONLINE" buying type for e-commerce channel
- May need to add buying type selection to opportunity edit form
- Dashboard filtering by buying type could be useful for reporting
- Consider storing buying_type in validation_results for historical analysis
