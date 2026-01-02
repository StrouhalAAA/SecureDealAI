# Validation Run - Supabase Edge Function

Dynamic validation engine for SecureDealAI MVP.

## Overview

This Edge Function executes validation rules against buying opportunity data, comparing manual input with OCR extractions and external registry data (ARES, ADIS).

## Files

```
validation-run/
├── index.ts          # Main handler (HTTP endpoint)
├── types.ts          # TypeScript type definitions
├── transforms.ts     # Data normalization functions (14 transforms)
├── comparators.ts    # Value comparison functions (9 comparators)
├── rules-loader.ts   # Load rules from Supabase DB
├── engine.ts         # Core validation engine
└── README.md         # This file
```

## API

### POST /functions/v1/validation-run

Execute validation for a buying opportunity.

**Request:**
```json
{
  "buying_opportunity_id": "uuid-123"
}
```

**Alternative (by SPZ/VIN):**
```json
{
  "spz": "1AB2345"
}
```

**Response:**
```json
{
  "id": "result-uuid",
  "buying_opportunity_id": "uuid-123",
  "overall_status": "GREEN",
  "field_validations": [...],
  "statistics": {
    "totalRulesExecuted": 21,
    "rulesPassed": 21,
    "rulesFailed": 0,
    "rulesSkipped": 0,
    "criticalIssues": 0,
    "warningIssues": 0
  },
  "duration_ms": 234,
  "created_at": "2026-01-01T10:30:00Z"
}
```

## Transforms

| Transform | Description |
|-----------|-------------|
| `UPPERCASE` | Convert to uppercase |
| `LOWERCASE` | Convert to lowercase |
| `TRIM` | Remove leading/trailing whitespace |
| `REMOVE_SPACES` | Remove all whitespace |
| `REMOVE_DIACRITICS` | Remove accents (á→a, č→c) |
| `NORMALIZE_DATE` | Convert to YYYY-MM-DD |
| `EXTRACT_NUMBER` | Extract numeric value |
| `FORMAT_RC` | Format Czech personal ID (######/####) |
| `FORMAT_ICO` | Format Czech company ID (8 digits) |
| `FORMAT_DIC` | Format Czech VAT ID (CZxxxxxxxx) |
| `ADDRESS_NORMALIZE` | Normalize address format |
| `NAME_NORMALIZE` | Normalize name (remove titles) |
| `VIN_NORMALIZE` | Normalize VIN (17 chars, fix OCR errors) |
| `SPZ_NORMALIZE` | Normalize license plate |

## Comparators

| Comparator | Description |
|------------|-------------|
| `EXACT` | Exact string match |
| `FUZZY` | Levenshtein similarity (0-1 threshold) |
| `CONTAINS` | Substring match |
| `REGEX` | Regular expression match |
| `NUMERIC_TOLERANCE` | Numeric comparison with tolerance |
| `DATE_TOLERANCE` | Date comparison with days tolerance |
| `EXISTS` | Check value is non-empty |
| `NOT_EXISTS` | Check value is empty |
| `IN_LIST` | Check value is in allowed list |

## Status Logic

```
IF any CRITICAL rule fails with MISMATCH:
    return RED (blocked)
ELSE IF any WARNING rule fails OR CRITICAL rule has MISSING:
    return ORANGE (manual review)
ELSE:
    return GREEN (approved)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anonymous key for user requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for DB writes |

## Local Development

```bash
# Start Supabase locally
supabase start

# Serve the function
supabase functions serve validation-run --env-file .env.local

# Test
curl -X POST http://localhost:54321/functions/v1/validation-run \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"buying_opportunity_id": "uuid-123"}'
```

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy validation-run

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

## Related Files

- `../../../VALIDATION_RULES_SCHEMA.json` - JSON Schema for rules
- `../../../VALIDATION_RULES_SEED.json` - Initial rules data
- `../../../DB_SCHEMA_DYNAMIC_RULES.sql` - Database schema
- `../../../RULE_MANAGEMENT_API.md` - Full API documentation
