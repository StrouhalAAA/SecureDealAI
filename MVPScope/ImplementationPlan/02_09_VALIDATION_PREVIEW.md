# Task 2.9: Validation Preview

> **Phase**: 2 - Backend API
> **Status**: [x] Implemented
> **Priority**: Medium
> **Depends On**: 2.8 Validation Run (Deploy)
> **Estimated Effort**: Medium

---

## Objective

Create a lightweight Edge Function that provides real-time validation preview during data entry. Unlike the full `validation-run`, this endpoint does NOT write results to the database, making it suitable for frequent calls during the wizard flow.

---

## Why This Task Exists

The existing `validation-run` endpoint (Task 2.8):
- Stores results in `validation_results` table
- Creates audit log entries
- Designed for final validation (Step 4)

For the real-time sidebar (Task 3.10), we need:
- Frequent calls during data entry (on field blur/change)
- No database pollution with preview results
- Fast response times
- Cached external API data (ARES/ADIS)

---

## Prerequisites

- [ ] Task 2.8 completed (validation-run deployed)
- [ ] Task 1.1 completed (database schema applied)

---

## API Specification

### Endpoint
```
POST /functions/v1/validation-preview
```

### Request
```typescript
interface ValidationPreviewRequest {
  buying_opportunity_id: string;
  // Optional: filter which rules to run
  categories?: ('vehicle' | 'vendor' | 'cross')[];
  // Use cached ARES/ADIS data (default: true)
  use_cached_external?: boolean;
}
```

### Response
```typescript
interface ValidationPreviewResponse {
  preview_status: 'GREEN' | 'ORANGE' | 'RED' | 'INCOMPLETE';

  // Document progress
  documents: {
    uploaded: number;
    required: number;
    items: DocumentStatus[];
  };

  // Categorized results
  categories: {
    vehicle?: CategoryResult;
    vendor?: CategoryResult;
    ares?: AresResult;  // Only for COMPANY vendors
  };

  // Summary counts
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };

  // Metadata
  is_preview: true;
  cached_at?: string;
}

interface DocumentStatus {
  type: 'ORV' | 'VTP' | 'OP';
  required: boolean;
  uploaded: boolean;
  ocr_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;
  ocr_fields_extracted?: number;
}

interface CategoryResult {
  status: 'GREEN' | 'ORANGE' | 'RED' | 'INCOMPLETE';
  fields_checked: number;
  fields_passed: number;
  fields_missing: number;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  rule_id: string;
  field: string;
  status: 'MATCH' | 'MISMATCH' | 'MISSING';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message_cs: string;
  similarity?: number;
  source_value?: string;
  target_value?: string;
}

interface AresResult {
  company_found: boolean;
  company_active: boolean;
  company_name?: string;
  vat_payer?: boolean;
  unreliable_vat_payer?: boolean;
  checked_at?: string;
}
```

---

## Implementation

### File Structure
```
MVPScope/supabase/functions/validation-preview/
├── index.ts          # HTTP handler
└── preview-engine.ts # Lightweight validation logic (reuses validation-run code)
```

### index.ts
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { runPreviewValidation } from './preview-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    );

    const { buying_opportunity_id, categories, use_cached_external = true } = await req.json();

    if (!buying_opportunity_id) {
      return new Response(
        JSON.stringify({ error: 'buying_opportunity_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await runPreviewValidation(supabase, {
      buying_opportunity_id,
      categories,
      use_cached_external,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Preview validation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Key Differences from validation-run

| Aspect | validation-run | validation-preview |
|--------|----------------|-------------------|
| Database writes | Yes (validation_results, audit_log) | **No** |
| External API calls | Always fresh | Use cached (configurable) |
| Response format | Full validation results | Summarized for sidebar |
| Use case | Final validation (Step 4) | Real-time preview during entry |
| Call frequency | Once per validation | Multiple times during editing |

---

## Caching Strategy

### External API Data (ARES/ADIS)
- Use `ares_validations` table as cache
- Cache TTL: 24 hours for ARES, 1 hour for ADIS
- Option to force fresh lookup: `use_cached_external: false`

### Rules Cache
- Reuse existing rules-loader.ts cache from validation-run
- 5-minute TTL in memory

---

## Reusing validation-run Code

The preview endpoint should import and reuse code from validation-run:

```typescript
// Import shared modules
import { validate } from '../validation-run/engine.ts';
import { loadRules } from '../validation-run/rules-loader.ts';
import { transforms } from '../validation-run/transforms.ts';
import { comparators } from '../validation-run/comparators.ts';
```

This ensures consistency between preview and final validation.

---

## Test Scenarios

### Scenario 1: No Data Yet
```json
// Request
{ "buying_opportunity_id": "uuid-new" }

// Expected Response
{
  "preview_status": "INCOMPLETE",
  "documents": { "uploaded": 0, "required": 2, "items": [...] },
  "categories": { "vehicle": null, "vendor": null },
  "summary": { "passed": 0, "warnings": 0, "failed": 0 },
  "is_preview": true
}
```

### Scenario 2: Vehicle Data Only
```json
// Request
{ "buying_opportunity_id": "uuid-with-vehicle" }

// Expected Response
{
  "preview_status": "INCOMPLETE",
  "documents": { "uploaded": 1, "required": 2, "items": [...] },
  "categories": {
    "vehicle": {
      "status": "GREEN",
      "fields_checked": 7,
      "fields_passed": 7,
      "fields_missing": 0,
      "issues": []
    },
    "vendor": null
  },
  "summary": { "passed": 7, "warnings": 0, "failed": 0 },
  "is_preview": true
}
```

### Scenario 3: Company Vendor with ARES
```json
// Request
{ "buying_opportunity_id": "uuid-company-vendor" }

// Expected Response
{
  "preview_status": "GREEN",
  "categories": {
    "vehicle": { "status": "GREEN", ... },
    "vendor": { "status": "GREEN", ... },
    "ares": {
      "company_found": true,
      "company_active": true,
      "company_name": "OSIT s.r.o.",
      "vat_payer": true,
      "unreliable_vat_payer": false,
      "checked_at": "2026-01-02T12:00:00Z"
    }
  },
  "is_preview": true
}
```

---

## Deployment

```bash
# Deploy alongside validation-run
supabase functions deploy validation-preview

# No additional secrets needed (uses same env vars)
```

---

## Related Documents

- `02_08_VALIDATION_RUN_DEPLOY.md` - Full validation endpoint (code to reuse)
- `03_10_VALIDATION_SIDEBAR.md` - Frontend consumer
- `MVPScope/supabase/functions/validation-run/` - Shared engine code

---

## Completion Checklist

- [x] index.ts created
- [x] preview-engine.ts created
- [x] Reuses validation-run engine code
- [x] Document status calculation works
- [x] Category results (vehicle/vendor) work
- [x] ARES status for companies works
- [x] No database writes verified
- [ ] Local testing successful
- [ ] Deployed to production
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
