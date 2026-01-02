# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecureDealAI is a validation service for vehicle purchase opportunities. It validates vehicle and vendor data by comparing manual input against OCR extractions and external registry data (ARES/ADIS). Currently in MVP phase.

**Tech Stack**: Node.js + Supabase (PostgreSQL + Edge Functions with Deno/TypeScript)

## Common Commands

```bash
# Test Supabase connection
npm run test:db

# Local Supabase development
supabase start
supabase functions serve validation-run --env-file .env.local

# Deploy Edge Function
supabase functions deploy validation-run
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key

# Database operations
supabase db push                    # Apply migrations
supabase link --project-ref REF    # Link to remote project
```

## Architecture

### Core Validation Engine

Located in `MVPScope/supabase/functions/validation-run/`:

| File | Purpose |
|------|---------|
| `index.ts` | HTTP handler (CORS, auth, routing) |
| `engine.ts` | Core validation logic |
| `types.ts` | TypeScript definitions |
| `transforms.ts` | 14 data normalization functions |
| `comparators.ts` | 9 comparison algorithms |
| `rules-loader.ts` | DB rule loading with caching |

### Dynamic Rules System

Rules are stored as JSON in PostgreSQL, not hardcoded. Schema defined in `MVPScope/VALIDATION_RULES_SCHEMA.json`, initial 31 rules in `MVPScope/VALIDATION_RULES_SEED.json`.

### Validation Status Logic

```
IF any CRITICAL rule fails with MISMATCH → RED (blocked)
ELSE IF any WARNING rule fails OR CRITICAL rule has MISSING → ORANGE (manual review)
ELSE → GREEN (approved)
```

### Data Transforms

UPPERCASE, LOWERCASE, TRIM, REMOVE_SPACES, REMOVE_DIACRITICS, NORMALIZE_DATE, EXTRACT_NUMBER, FORMAT_RC, FORMAT_ICO, FORMAT_DIC, ADDRESS_NORMALIZE, NAME_NORMALIZE, VIN_NORMALIZE, SPZ_NORMALIZE

### Comparators

EXACT, FUZZY (Levenshtein), CONTAINS, REGEX, NUMERIC_TOLERANCE, DATE_TOLERANCE, EXISTS, NOT_EXISTS, IN_LIST

## Key Documentation

- `MVPScope/README.md` - MVP overview and quick start
- `MVPScope/IMPLEMENTATION_PLAN.md` - Architecture and phases
- `MVPScope/VALIDATION_BACKEND_ARCHITECTURE.md` - Backend design
- `MVPScope/RULE_MANAGEMENT_API.md` - REST API specifications
- `MVPScope/DB_SCHEMA_DYNAMIC_RULES.sql` - PostgreSQL schema

## Database Tables

| Table | Purpose |
|-------|---------|
| `buying_opportunities` | Main entity (SPZ as business key) |
| `vehicles` | Vehicle data with OCR mappings |
| `vendors` | Seller data (FO/PO) |
| `ocr_extractions` | OCR processing results |
| `validation_rules` | Dynamic rules (JSON) |
| `validation_results` | Validation outputs |
| `validation_audit_log` | Audit trail |

## Environment Variables

Required in `.env`:
- `SUPABASE_URL` - Project URL
- `SUPABASE_PUBLISHABLE_KEY` - Public anon key
- `SUPABASE_SECRET_KEY` - Service role key

## Specialized Agent

A `supabase-expert` agent is configured in `.claude/agents/` for PostgreSQL, RLS policies, and Edge Function assistance.
