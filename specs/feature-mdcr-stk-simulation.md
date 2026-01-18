# Feature: MDCR STK History API Simulation

**Created:** 2026-01-18
**Status:** Draft - Pending Decision
**Author:** Development Team

---

## PENDING DECISION: When Should STK Checks Execute?

> **Decision Required Before Implementation**
>
> Choose when the MDCR STK history check should be triggered in the user workflow:
>
> ### Option A: Step 1 - Vehicle Info Entry
> - Trigger check immediately when VIN is entered
> - **Pros:** Early warning of issues, user knows problems before uploading docs
> - **Cons:** May slow down initial data entry, VIN might not be available yet
>
> ### Option B: After Document Upload (Step 2)
> - Trigger check after VTP/ORV documents are uploaded and OCR extracts VIN
> - **Pros:** VIN is verified from official document, natural workflow pause
> - **Cons:** User invests time uploading before learning of issues
>
> ### Option C: During Validation Run (Step 3)
> - Trigger as part of the full validation execution
> - **Pros:** All checks happen together, simpler UX
> - **Cons:** Late discovery of blocking issues
>
> **Decision:** _________________
> **Decided By:** _________________
> **Date:** _________________

---

## Feature Description
Create a Supabase Edge Function that simulates the MDCR STK History API (Ministerstvo dopravy - vehicle technical inspection history). This simulation endpoint allows developers and testers to request specific mock scenarios without needing a real API key from dataovozidlech.cz. Users can select predefined scenarios (clean vehicle history, odometer tampering, failed inspections, etc.) to test different validation flows in the SecureDealAI application.

The simulated API mirrors the structure of the real MDCR API (`https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2`) but returns deterministic mock data based on the selected scenario.

## User Story
As a developer or QA tester
I want to simulate different MDCR STK History API responses
So that I can test vehicle validation workflows without needing real API credentials or waiting for API registration approval

## Problem Statement
The MDCR STK History API (datová kostka) requires registration and API key approval to access real vehicle technical data. During MVP development and testing:
- API key registration may take time to process
- Real API has rate limits that could slow development
- Testing edge cases (odometer tampering, failed STK) requires finding real vehicles with those issues
- No way to deterministically test specific validation scenarios

## Solution Statement
Create a mock Edge Function `/mdcr-stk-mock` that:
1. Accepts a VIN and optional mock scenario parameter
2. Returns realistic STK history data matching the real API structure
3. Provides predefined scenarios for common test cases (clean, tampering, failures)
4. Includes simulated processing delay for realistic behavior
5. Can derive scenarios deterministically from VIN (for automated testing)

## Relevant Files
Use these files to implement the feature:

- `supabase/functions/health/index.ts` - Reference for basic Edge Function structure with CORS
- `supabase/functions/ares-lookup/index.ts` - Reference for external API client pattern with caching
- `supabase/functions/ares-validate/index.ts` - Reference for storing validation results
- `supabase/functions/validation-run/types.ts` - Existing types for validation (may need extension)
- `supabase/migrations/001_initial_schema.sql` - Database schema reference (ares_validations pattern)
- `docs/architecture/MOCK_API_IMPLEMENTATION_PLAN.md` - Architecture reference for mock API design
- `docs/ckeck.md` - Complete specification with response structures for STK checks

### New Files
- `supabase/functions/mdcr-stk-mock/index.ts` - Main Edge Function handler
- `supabase/functions/mdcr-stk-mock/types.ts` - TypeScript types for MDCR API
- `supabase/functions/mdcr-stk-mock/scenarios.ts` - Mock scenario generators
- `supabase/functions/mdcr-stk-mock/validators.ts` - VIN validation utilities
- `supabase/migrations/018_vehicle_external_checks.sql` - Database migration for storing check results

## Implementation Plan

### Phase 1: Foundation
- Create Edge Function directory structure
- Define TypeScript types matching MDCR API response structure
- Implement VIN validation utility
- Set up basic HTTP handler with CORS

### Phase 2: Database Schema
- Create `vehicle_external_checks` table for storing check results (follows `ares_validations` pattern)
- Add indexes for efficient lookup by `buying_opportunity_id`, `vin`
- Configure RLS policies for authenticated access
- Create migration file

### Phase 3: Core Implementation
- Implement mock scenario system with predefined responses
- Create deterministic scenario derivation from VIN
- Add realistic simulated delays
- Implement scenario-specific data generators

### Phase 4: Storage Integration
- Add optional `buying_opportunity_id` parameter to request
- Implement caching/storage of check results to database
- Support cache lookup to avoid re-running checks
- Store both raw response and processed validation results

### Phase 5: Integration & Testing
- Add endpoint documentation
- Create example requests for each scenario
- Test all scenarios locally
- Test database storage and retrieval
- Deploy and verify

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Database Migration
Create `supabase/migrations/018_vehicle_external_checks.sql` with:
- `vehicle_external_checks` table definition (see Database Changes section)
- Indexes for `buying_opportunity_id`, `vin`, `created_at`
- RLS policies following `ares_validations` pattern
- Comments documenting table purpose

### Step 2: Apply Migration Locally
- Run `supabase db reset` to apply migration
- Verify table creation with `supabase db dump`

### Step 3: Create Directory Structure
- Create `supabase/functions/mdcr-stk-mock/` directory
- Verify Supabase CLI can recognize the new function

### Step 4: Define TypeScript Types
Create `types.ts` with:
- `MdcrStkRequest` - Request structure with VIN, mock scenario, and optional `buying_opportunity_id`
- `MdcrStkResponse` - Full response matching real API
- `StkInspection` - Individual inspection record
- `OdometerReading` - Odometer data at inspection
- `InspectionDefect` - Defect found during inspection
- `MockScenario` - Enum of available test scenarios
- `VehicleExternalCheck` - Database row type for storage

### Step 5: Implement VIN Validator
Create `validators.ts` with:
- VIN format validation (17 alphanumeric, no I/O/Q)
- VIN checksum validation (position 9)
- Extract manufacturer info from VIN prefix

### Step 6: Create Scenario Generators
Create `scenarios.ts` with scenario generators:
- `VEHICLE_STK_CLEAN` - Clean history, all inspections passed
- `VEHICLE_STK_MINOR_DEFECTS` - Passed with minor defects
- `VEHICLE_STK_FAILED` - Failed recent inspection
- `VEHICLE_ODOMETER_CONSISTENT` - Consistent odometer readings
- `VEHICLE_ODOMETER_TAMPERED` - Clear rollback detected
- `VEHICLE_ODOMETER_SUSPICIOUS` - Unusual pattern detected
- `VEHICLE_NO_HISTORY` - New vehicle, no inspection history
- `VEHICLE_EXPIRED_STK` - STK validity expired

### Step 7: Implement Main Handler
Create `index.ts` with:
- CORS preflight handling
- POST method handler
- Request validation
- Scenario selection (explicit or derived from VIN)
- Simulated delay (configurable)
- Response formatting

### Step 8: Add Database Storage Integration
Extend `index.ts` with:
- Optional `buying_opportunity_id` in request
- Cache check: look for existing record in `vehicle_external_checks` (within TTL)
- Store new results: insert into `vehicle_external_checks` table
- Return `cached: true/false` in response

### Step 9: Add Deterministic Scenario Derivation
Implement VIN-based scenario selection:
- Use last digit of VIN to determine scenario
- Allow override via explicit `mockScenario` parameter
- Document the VIN-to-scenario mapping

### Step 10: Test Locally
- Run `supabase functions serve mdcr-stk-mock --env-file supabase/.env.local`
- Test each scenario with curl commands
- Test with `buying_opportunity_id` to verify storage
- Verify cache retrieval on repeat requests
- Verify response structure matches specification

### Step 11: Run Validation Commands
Execute all validation commands to ensure no regressions

## Database Changes

### New Table: `vehicle_external_checks`

Following the pattern established by `ares_validations`, this table stores external vehicle check results for caching and audit purposes.

```sql
-- ============================================================================
-- Vehicle External Checks Table
-- Stores results from external vehicle validation APIs (MDCR STK, Cebia, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_external_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to buying opportunity (optional - for linking to specific deal)
    buying_opportunity_id UUID REFERENCES buying_opportunities(id) ON DELETE CASCADE,

    -- Vehicle identification
    vin VARCHAR(17) NOT NULL,
    spz VARCHAR(20),

    -- MDCR STK History data
    mdcr_stk_data JSONB,                    -- Raw MDCR API response
    mdcr_stk_fetched_at TIMESTAMPTZ,        -- When MDCR data was fetched
    mdcr_stk_source VARCHAR(20),            -- 'REAL' or 'MOCK'

    -- Cebia data (for future use)
    cebia_blacklist_data JSONB,             -- Raw Cebia blacklist response
    cebia_blacklist_fetched_at TIMESTAMPTZ,
    cebia_odometer_data JSONB,              -- Raw Cebia odometer response
    cebia_odometer_fetched_at TIMESTAMPTZ,
    cebia_accident_data JSONB,              -- Raw Cebia accident response
    cebia_accident_fetched_at TIMESTAMPTZ,

    -- SFDI Highway vignette (for future use)
    sfdi_vignette_data JSONB,
    sfdi_vignette_fetched_at TIMESTAMPTZ,

    -- Aggregated validation results
    check_results JSONB,                    -- Processed results for validation engine
    overall_status VARCHAR(20) CHECK (overall_status IN ('OK', 'WARNING', 'BLOCKED')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_vehicle_checks_buying_opp ON vehicle_external_checks(buying_opportunity_id);
CREATE INDEX idx_vehicle_checks_vin ON vehicle_external_checks(vin);
CREATE INDEX idx_vehicle_checks_spz ON vehicle_external_checks(spz) WHERE spz IS NOT NULL;
CREATE INDEX idx_vehicle_checks_created ON vehicle_external_checks(created_at DESC);

-- Index for cache lookups (find recent checks by VIN)
CREATE INDEX idx_vehicle_checks_vin_recent ON vehicle_external_checks(vin, mdcr_stk_fetched_at DESC);

COMMENT ON TABLE vehicle_external_checks IS
    'External vehicle validation results cache (MDCR STK, Cebia, SFDI) - similar pattern to ares_validations';

-- Trigger for updated_at
CREATE TRIGGER tr_vehicle_external_checks_updated
    BEFORE UPDATE ON vehicle_external_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE vehicle_external_checks ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users
CREATE POLICY "vehicle_external_checks_select" ON vehicle_external_checks
    FOR SELECT TO authenticated
    USING (true);

-- Insert: authenticated users
CREATE POLICY "vehicle_external_checks_insert" ON vehicle_external_checks
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Update: authenticated users
CREATE POLICY "vehicle_external_checks_update" ON vehicle_external_checks
    FOR UPDATE TO authenticated
    USING (true);
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Buying Opportunity                                │
│                        (id: uuid, spz: "4A12345")                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  ares_validations   │  │vehicle_external_    │  │ validation_results  │
│                     │  │checks               │  │                     │
│ • ARES company data │  │ • MDCR STK history  │  │ • Overall status    │
│ • ADIS DPH status   │  │ • Cebia blacklist   │  │ • Field validations │
│ • Bank accounts     │  │ • Odometer analysis │  │ • Statistics        │
└─────────────────────┘  │ • Accident history  │  └─────────────────────┘
                         │ • Highway vignette  │
                         └─────────────────────┘
```

### Cache TTL Strategy

| Check Type | TTL | Reason |
|------------|-----|--------|
| MDCR STK History | 24 hours | STK data changes infrequently |
| Cebia Blacklist | 1 hour | Stolen status can change quickly |
| Cebia Odometer | 24 hours | Historical data, rarely changes |
| SFDI Vignette | 1 hour | Vignette can be purchased anytime |

## Testing Strategy

### Unit Tests
- VIN validation (valid/invalid formats)
- Scenario generator output structure
- Deterministic VIN-to-scenario mapping
- Response matches expected TypeScript types

### Edge Cases
- Invalid VIN format (too short, too long, invalid chars)
- Unknown scenario requested
- Missing VIN parameter
- Empty request body
- Invalid JSON body

## Acceptance Criteria

### API Functionality
- [ ] POST `/functions/v1/mdcr-stk-mock` accepts VIN and returns mock STK data
- [ ] All 8 predefined scenarios return appropriate mock data
- [ ] Response structure matches real MDCR API format (as documented)
- [ ] VIN validation returns 400 for invalid VINs
- [ ] Simulated delay of 500-1500ms (configurable) is applied
- [ ] Deterministic scenario derivation from VIN works
- [ ] Explicit `mockScenario` parameter overrides derived scenario
- [ ] CORS preflight requests are handled correctly
- [ ] Response includes `source: "MDCR_MOCK"` to distinguish from real API

### Database Storage
- [ ] Migration `018_vehicle_external_checks.sql` creates table successfully
- [ ] When `buying_opportunity_id` is provided, results are stored in `vehicle_external_checks`
- [ ] Cached results are returned for repeat requests within TTL (24 hours)
- [ ] Response includes `cached: true/false` indicating cache status
- [ ] Raw MDCR response is stored in `mdcr_stk_data` JSONB column
- [ ] `mdcr_stk_source` is set to `'MOCK'` for mock responses
- [ ] RLS policies allow authenticated users to read/write records

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `supabase db reset` - Apply migrations including new `vehicle_external_checks` table
- `npm run test:db` - Test Supabase connection
- `supabase functions serve mdcr-stk-mock --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## API Documentation

### Endpoint
```
POST /functions/v1/mdcr-stk-mock
Content-Type: application/json
```

### Request Body
```json
{
  "vin": "WVWZZZ3CZWE123456",
  "buying_opportunity_id": "uuid-optional",
  "mockScenario": "VEHICLE_STK_CLEAN",
  "simulateDelay": true,
  "skipCache": false
}
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vin` | string | Yes | 17-character Vehicle Identification Number |
| `buying_opportunity_id` | UUID | No | Link to buying opportunity (enables storage & caching) |
| `mockScenario` | string | No | Explicit scenario selection (see scenarios below) |
| `simulateDelay` | boolean | No | Whether to add realistic delay (default: true) |
| `skipCache` | boolean | No | Force fresh check, ignore cached results (default: false) |

### Available Scenarios
| Scenario | Description | STK Status | Odometer |
|----------|-------------|------------|----------|
| `VEHICLE_STK_CLEAN` | Perfect history | All passed | Consistent |
| `VEHICLE_STK_MINOR_DEFECTS` | Minor issues | Passed with notes | Consistent |
| `VEHICLE_STK_FAILED` | Recent failure | Failed | Consistent |
| `VEHICLE_ODOMETER_TAMPERED` | Rollback detected | Passed | **Tampered** |
| `VEHICLE_ODOMETER_SUSPICIOUS` | Unusual pattern | Passed | Suspicious |
| `VEHICLE_NO_HISTORY` | No records | N/A | N/A |
| `VEHICLE_EXPIRED_STK` | Overdue inspection | Expired | Consistent |
| `VEHICLE_MULTIPLE_ISSUES` | Combined problems | Mixed | Suspicious |

### Response Structure
```json
{
  "requestId": "uuid",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "MDCR_MOCK",
  "cached": false,
  "cachedAt": null,
  "processingTimeMs": 850,
  "storedToDb": true,
  "vehicle": {
    "vin": "WVWZZZ3CZWE123456",
    "make": "Volkswagen",
    "model": "Passat",
    "firstRegistrationDate": "2018-03-15"
  },
  "inspections": [
    {
      "date": "2024-06-15",
      "type": "REGULAR",
      "station": "STK Praha 4",
      "result": "PASSED",
      "odometer": 118500,
      "validUntil": "2026-06-15",
      "defects": []
    }
  ],
  "currentStatus": {
    "stkValid": true,
    "stkValidUntil": "2026-06-15",
    "emissionsValid": true,
    "emissionsValidUntil": "2026-06-15"
  },
  "odometerAnalysis": {
    "isSuspicious": false,
    "trend": "CONSISTENT",
    "averageYearlyKm": 23300,
    "readings": [
      { "date": "2024-06-15", "km": 118500, "source": "STK" },
      { "date": "2022-06-10", "km": 72100, "source": "STK" }
    ]
  }
}
```

### Response Fields (Metadata)
| Field | Type | Description |
|-------|------|-------------|
| `cached` | boolean | Whether result was retrieved from cache |
| `cachedAt` | string | ISO timestamp when result was cached (null if fresh) |
| `storedToDb` | boolean | Whether result was stored to database (requires `buying_opportunity_id`) |
| `source` | string | `"MDCR_MOCK"` or `"MDCR_REAL"` (future) |

## VIN-to-Scenario Mapping
For automated testing, scenarios are derived from the last character of the VIN:

| VIN ends with | Scenario |
|---------------|----------|
| 0, 1 | `VEHICLE_STK_CLEAN` |
| 2, 3 | `VEHICLE_STK_MINOR_DEFECTS` |
| 4 | `VEHICLE_STK_FAILED` |
| 5, 6 | `VEHICLE_ODOMETER_TAMPERED` |
| 7 | `VEHICLE_ODOMETER_SUSPICIOUS` |
| 8 | `VEHICLE_EXPIRED_STK` |
| 9 | `VEHICLE_MULTIPLE_ISSUES` |
| A-Z | `VEHICLE_STK_CLEAN` (default) |

## Notes

### Development & Testing
- This mock API is designed for MVP development and testing only
- When real MDCR API key is obtained, the validation engine should be configurable to use either mock or real API
- Consider adding environment variable `USE_MDCR_MOCK=true` to control mock usage globally
- Response structure follows the specification in `docs/ckeck.md` section 5.5

### Data Storage
- The `vehicle_external_checks` table follows the same pattern as `ares_validations`
- Results are only stored when `buying_opportunity_id` is provided in the request
- Cache TTL is 24 hours for MDCR STK data (configurable via environment variable)
- The table is designed to store all future vehicle external checks (Cebia, SFDI, etc.)

### Future Integration
- Real MDCR API will use same types and storage, just different data source
- `mdcr_stk_source` column distinguishes between `'MOCK'` and `'REAL'` data
- Validation engine can read from `vehicle_external_checks` for rule evaluation
- Consider adding a unified `/proverky` endpoint that orchestrates all external checks
