# Bug: validation-run queries non-existent VIN column on buying_opportunities

## Bug Description
The `validation-run` Edge Function fails with error "column buying_opportunities.vin does not exist" when called with a `buying_opportunity_id`. The function attempts to query the `vin` column directly from the `buying_opportunities` table, but this column does not exist in the database schema.

**Expected behavior**: Validation runs successfully, loading VIN from the related `vehicles` table.

**Actual behavior**: Function crashes with PostgreSQL error about missing column.

## Problem Statement
The `validation-run` Edge Function has two locations where it incorrectly assumes `vin` is a direct column on `buying_opportunities`:
1. Line 85 in `loadValidationData()` - selects `vin` in the query
2. Line 174 in `findBuyingOpportunity()` - uses `.eq('vin', ...)` filter

Per the database schema, `vin` exists only on the `vehicles` table, which has a one-to-one relationship with `buying_opportunities` via `buying_opportunity_id` foreign key.

## Solution Statement
Remove the incorrect `vin` reference from the `loadValidationData()` select query. The VIN is already accessible through the `vehicles (*)` join. For `findBuyingOpportunity()`, query through the `vehicles` table when searching by VIN.

## Steps to Reproduce
1. Call the validation-run function with any valid buying_opportunity_id:
```bash
curl 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/validation-run' \
  -H 'authorization: Bearer <token>' \
  -H 'content-type: application/json' \
  --data-raw '{"buying_opportunity_id":"9ab04da9-deb8-484e-aa15-0dbd8883d720"}'
```
2. Observe error: `"column buying_opportunities.vin does not exist"`

## Root Cause Analysis
The code was written assuming `vin` is stored on `buying_opportunities`, but the actual database schema (defined in `supabase/migrations/001_initial_schema.sql`) stores:
- `spz` on `buying_opportunities` (the business key)
- `vin` on `vehicles` (related via foreign key)

This is a schema-code mismatch where the Edge Function query doesn't match the actual table structure.

## Issues Identified

### Issue 1: Invalid `vin` in loadValidationData select
- **Error Pattern**: `column buying_opportunities.vin does not exist`
- **Category**: Backend (Edge Function)
- **Affected Files**: `supabase/functions/validation-run/index.ts`
- **Root Cause**: Line 85 includes `vin` in the select list for `buying_opportunities`
- **Fix Approach**: Remove `vin,` from the select statement - VIN is accessible via `vehicles (*)`

### Issue 2: Invalid VIN lookup in findBuyingOpportunity
- **Error Pattern**: Would fail if VIN-based lookup is attempted
- **Category**: Backend (Edge Function)
- **Affected Files**: `supabase/functions/validation-run/index.ts`
- **Root Cause**: Line 174 queries `.eq('vin', ...)` on `buying_opportunities`
- **Fix Approach**: Query `vehicles` table by VIN, then get the associated `buying_opportunity_id`

## Relevant Files

- **`supabase/functions/validation-run/index.ts`** - Contains both buggy queries that need fixing
- **`supabase/migrations/001_initial_schema.sql`** - Reference for correct schema structure

### New Files
None required.

## Step by Step Tasks

### 1. Fix loadValidationData select query

**File**: `supabase/functions/validation-run/index.ts`
**Location**: Lines 80-90

**Current code (BROKEN)**:
```typescript
const { data: opportunity, error: oppError } = await supabase
  .from('buying_opportunities')
  .select(`
    id,
    spz,
    vin,
    vehicles (*),
    vendors (*)
  `)
  .eq('id', buyingOpportunityId)
  .single();
```

**Fixed code** - Remove `vin,` from the select statement:
```typescript
const { data: opportunity, error: oppError } = await supabase
  .from('buying_opportunities')
  .select(`
    id,
    spz,
    vehicles (*),
    vendors (*)
  `)
  .eq('id', buyingOpportunityId)
  .single();
```

**Why**: VIN is already accessible through `vehicles (*)` join. The vehicles object contains the vin field.

### 2. Fix findBuyingOpportunity VIN lookup

**File**: `supabase/functions/validation-run/index.ts`
**Location**: Lines 164-186

**Current code (BROKEN)**:
```typescript
async function findBuyingOpportunity(
  supabase: ReturnType<typeof createClient>,
  spz?: string,
  vin?: string
): Promise<string> {
  let query = supabase.from('buying_opportunities').select('id');

  if (spz) {
    query = query.eq('spz', spz.toUpperCase().replace(/\s/g, ''));
  } else if (vin) {
    query = query.eq('vin', vin.toUpperCase().replace(/\s/g, ''));  // BUG: vin doesn't exist on buying_opportunities
  } else {
    throw new Error('Either spz or vin must be provided');
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).single();

  if (error || !data) {
    throw new Error(`Buying opportunity not found for ${spz ? `SPZ: ${spz}` : `VIN: ${vin}`}`);
  }

  return data.id;
}
```

**Fixed code** - Query vehicles table for VIN lookup:
```typescript
async function findBuyingOpportunity(
  supabase: ReturnType<typeof createClient>,
  spz?: string,
  vin?: string
): Promise<string> {
  if (spz) {
    const { data, error } = await supabase
      .from('buying_opportunities')
      .select('id')
      .eq('spz', spz.toUpperCase().replace(/\s/g, ''))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`Buying opportunity not found for SPZ: ${spz}`);
    }
    return data.id;
  } else if (vin) {
    // VIN is on vehicles table, not buying_opportunities
    const { data, error } = await supabase
      .from('vehicles')
      .select('buying_opportunity_id')
      .eq('vin', vin.toUpperCase().replace(/\s/g, ''))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`Buying opportunity not found for VIN: ${vin}`);
    }
    return data.buying_opportunity_id;
  } else {
    throw new Error('Either spz or vin must be provided');
  }
}
```

**Why**: VIN exists on `vehicles` table. Query vehicles by VIN, then return the associated `buying_opportunity_id`.

### 3. Deploy the Edge Function

```bash
supabase functions deploy validation-run
```

### 4. Test the fix

Test the original failing request:
```bash
curl -X POST 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/validation-run' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbXlnbWJ4dGRndWpreXRweGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTE2OTUsImV4cCI6MjA4MjUyNzY5NX0.cXRvo0nZIC1RH3KrrGCSfu7ytEBGapb8n46bnmu0otQ' \
  -H 'content-type: application/json' \
  -d '{"buying_opportunity_id":"9ab04da9-deb8-484e-aa15-0dbd8883d720"}'
```

Expected: Validation completes successfully (no column error).

### 5. Run Validation Commands
- Execute all validation commands listed below

## Database Changes
None required. The database schema is correct; only the Edge Function code needs fixing.

## Testing Strategy

### Regression Tests
1. Call validation-run with `buying_opportunity_id` - should succeed
2. Call validation-run with `spz` parameter - should find opportunity and validate
3. Call validation-run with `vin` parameter - should find opportunity via vehicles table

### Edge Cases
1. Non-existent buying_opportunity_id - should return 404
2. Non-existent SPZ - should return 404
3. Non-existent VIN - should return 404
4. Opportunity without vehicle record - should handle gracefully

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `supabase functions deploy validation-run` - Deploy fixed Edge Function
- `curl -X POST 'https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1/validation-run' -H 'authorization: Bearer <token>' -H 'content-type: application/json' -d '{"buying_opportunity_id":"9ab04da9-deb8-484e-aa15-0dbd8883d720"}'` - Test the original failing request
- `cd apps/web && npm run build` - Ensure frontend still builds

## Notes
- The `vehicles` table has a `UNIQUE(buying_opportunity_id)` constraint, ensuring one-to-one relationship
- VIN is stored on vehicles because it's vehicle-specific data, while SPZ serves as the business key on buying_opportunities
- This pattern (SPZ as business key) is consistent with the ACBS architecture described in CLAUDE.md
