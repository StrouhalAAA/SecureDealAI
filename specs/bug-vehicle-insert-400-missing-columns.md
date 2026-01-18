# Bug: Vehicle Insert 400 Error - Missing Database Columns

## Bug Description
When creating a new buying opportunity via ORV document upload, the vehicle insert fails with HTTP 400 error. The console shows "Vehicle insert failed" followed by an error object. The frontend is attempting to insert vehicle data with columns (`palivo`, `objem_motoru`, `pocet_mist`, `max_rychlost`, `barva`, `kategorie_vozidla`) that do not exist in the production database.

**Expected behavior**: Vehicle record is created successfully with all OCR-extracted technical specifications.

**Actual behavior**: HTTP 400 error on `/rest/v1/vehicles` - PostgREST rejects the insert because it references non-existent columns.

## Problem Statement
The production Supabase database is missing the vehicle schema extension columns added in migration `014_vehicle_schema_extension.sql`. The frontend `CreateOpportunityWizard.vue` attempts to insert these columns, but since they don't exist in production, PostgREST returns a 400 Bad Request error.

## Solution Statement
Apply the pending database migrations (014, 015, 016, 017) to the production Supabase database using `supabase db push` or the Supabase Dashboard SQL Editor. This will add the missing columns and allow the vehicle insert to succeed.

## Steps to Reproduce
1. Navigate to `https://secure-deal-ai-web.vercel.app`
2. Authenticate with access code
3. Click "+ Nová příležitost" button
4. Select "Nahrát ORV" option
5. Enter a valid SPZ (e.g., "2BD9586")
6. Upload an ORV document image
7. Wait for OCR extraction to complete
8. Click "Vytvořit příležitost"
9. **Result**: Error in console: "Vehicle insert failed" with HTTP 400

## Root Cause Analysis
The error originates from a schema mismatch between the frontend code and the production database:

1. **Migration 014** (`014_vehicle_schema_extension.sql`) adds these columns to the `vehicles` table:
   - `tachometer_km`, `datum_posledni_preregistrace`
   - `barva`, `palivo`, `objem_motoru`, `pocet_mist`, `max_rychlost`, `kategorie_vozidla`
   - `karoserie`, `cislo_motoru`, `provozni_hmotnost`, `povolena_hmotnost`
   - `delka`, `sirka`, `vyska`, `rozvor`
   - `emise_co2`, `spotreba_paliva`, `emisni_norma`
   - `datum_stk`, `stk_platnost`

2. **Frontend code** in `CreateOpportunityWizard.vue` (lines 373-390) inserts:
   ```typescript
   const { error: vehicleError } = await supabase.from('vehicles').insert({
     buying_opportunity_id: opportunity.id,
     spz: spz.value.toUpperCase(),
     vin: (ocrData.vin as string) || null,
     // ...basic fields exist in production...
     palivo: (ocrData.fuelType as string) || null,        // MISSING in prod
     objem_motoru: (ocrData.engineCcm as number) || null, // MISSING in prod
     pocet_mist: (ocrData.seats as number) || null,       // MISSING in prod
     max_rychlost: (ocrData.maxSpeed as number) || null,  // MISSING in prod
     barva: (ocrData.color as string) || null,            // MISSING in prod
     kategorie_vozidla: (ocrData.vehicleType as string) || null, // MISSING in prod
   });
   ```

3. **PostgREST behavior**: When an INSERT references a column that doesn't exist, PostgREST returns HTTP 400 Bad Request.

4. **Additional migrations also pending**:
   - `015_vehicle_validation_rules.sql` - New validation rules
   - `016_vendor_ocr_constraint.sql` - Allows OCR vendors without personal_id
   - `017_fix_kategorie_vozidla_varchar.sql` - Fixes varchar(10) to varchar(50)

## Issues Identified

### Issue 1: Missing Vehicle Schema Columns in Production
- **Error Pattern**: `HTTP 400 on /rest/v1/vehicles` - "Vehicle insert failed"
- **Category**: Database
- **Affected Files**:
  - `supabase/migrations/014_vehicle_schema_extension.sql` (not applied)
  - `apps/web/src/components/shared/CreateOpportunityWizard.vue`
- **Root Cause**: Migration 014 not applied to production database
- **Fix Approach**: Apply migration 014 to production via `supabase db push` or Supabase Dashboard

### Issue 2: Additional Pending Migrations
- **Error Pattern**: Potential future errors after Issue 1 is fixed
- **Category**: Database
- **Affected Files**:
  - `supabase/migrations/015_vehicle_validation_rules.sql`
  - `supabase/migrations/016_vendor_ocr_constraint.sql`
  - `supabase/migrations/017_fix_kategorie_vozidla_varchar.sql`
- **Root Cause**: Migrations 015-017 also not applied
- **Fix Approach**: Apply all pending migrations in sequence

## Relevant Files
Use these files to fix the bug:

### Files to Verify/Apply
- **`supabase/migrations/014_vehicle_schema_extension.sql`** - Adds missing columns; must be applied
- **`supabase/migrations/015_vehicle_validation_rules.sql`** - New validation rules; apply after 014
- **`supabase/migrations/016_vendor_ocr_constraint.sql`** - Vendor constraint fix; apply after 015
- **`supabase/migrations/017_fix_kategorie_vozidla_varchar.sql`** - VARCHAR fix; apply after 016

### Files for Context
- **`apps/web/src/components/shared/CreateOpportunityWizard.vue`** (lines 373-390) - Vehicle insert code
- **`supabase/migrations/001_initial_schema.sql`** (lines 47-68) - Original vehicles table schema
- **`CLAUDE.md`** - Project deployment commands

### New Files
None - all migrations already exist, they just need to be applied to production.

## Step by Step Tasks

### Step 1: Verify Local Environment
- Run `supabase status` to check if local Supabase is running
- If not running, start with `supabase start`
- Verify local database has all migrations applied

### Step 2: Link to Production Project
- Run `supabase link --project-ref bdmygmbxtdgujkytpxha` to link to production
- This connects your local CLI to the production Supabase project

### Step 3: Check Migration Status
- Run `supabase migration list` to see which migrations are applied in production
- Confirm migrations 014-017 are NOT applied

### Step 4: Apply Migrations to Production
- Run `supabase db push` to apply all pending migrations
- This will apply migrations 014, 015, 016, 017 in order
- Monitor output for any errors

### Step 5: Verify Column Addition
- Use Supabase Dashboard or run a query to verify `vehicles` table now has:
  - `palivo`, `objem_motoru`, `pocet_mist`, `max_rychlost`, `barva`, `kategorie_vozidla`

### Step 6: Test the Fix
- Navigate to `https://secure-deal-ai-web.vercel.app`
- Create a new buying opportunity via ORV upload
- Verify vehicle insert succeeds without 400 error
- Check browser console for any errors

### Step 7: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes

All migrations already exist. Apply these in order:

```bash
# Link to production (if not already linked)
supabase link --project-ref bdmygmbxtdgujkytpxha

# Apply all pending migrations
supabase db push
```

**Migrations to be applied:**
1. `014_vehicle_schema_extension.sql` - Adds 19 new columns to vehicles table
2. `015_vehicle_validation_rules.sql` - Adds new validation rules
3. `016_vendor_ocr_constraint.sql` - Relaxes vendor constraint for OCR data
4. `017_fix_kategorie_vozidla_varchar.sql` - Fixes kategorie_vozidla VARCHAR size

## Testing Strategy

### Regression Tests
1. **OCR Upload Flow**: Create new opportunity via ORV upload - should succeed
2. **Manual Entry Flow**: Create new opportunity via manual entry - should still work
3. **Existing Opportunities**: View existing opportunities - should display correctly
4. **Vehicle Detail View**: Open vehicle details - new fields should display if populated
5. **Vendor Auto-Creation**: OCR vendor should be created without personal_id requirement

### Edge Cases
1. OCR returns null for all technical fields - should insert NULLs
2. OCR returns very long `vehicleType` - should work with VARCHAR(50)
3. Creating opportunity for existing SPZ - should show proper error message
4. Multiple concurrent uploads - should not cause conflicts

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Test database connection
npm run test:db

# Build frontend (verify no TypeScript errors)
cd apps/web && npm run build

# If local Supabase is running, test Edge Function
supabase functions serve validation-run --env-file supabase/.env.local
```

## Notes
- The project ref `bdmygmbxtdgujkytpxha` is extracted from the error URL in the bug report
- Migrations are idempotent (use `IF NOT EXISTS`) so re-running is safe
- After applying migrations, no code changes are needed - frontend already expects these columns
- The existing spec `bug-kategorie-vozidla-varchar-overflow.md` describes a related issue that will also be fixed by applying migration 017
- Consider setting up a CI/CD pipeline to auto-apply migrations on merge to main
