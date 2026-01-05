# Rule CRUD API - Implementation Specification

> **Purpose**: Detailed implementation specification for the Rule Management API Edge Function. This document provides all necessary details for agents to execute the implementation.
>
> **Date**: January 2026
> **Status**: Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [File Specifications](#file-specifications)
4. [API Endpoints](#api-endpoints)
5. [Database Operations](#database-operations)
6. [Authentication & Authorization](#authentication--authorization)
7. [Error Handling](#error-handling)
8. [Testing Strategy](#testing-strategy)

---

## Overview

### Objective
Create a Supabase Edge Function `rules` that provides REST API for managing validation rules with:
- Full CRUD operations
- Draft/Active workflow (activate/deactivate)
- Rule testing with sample data
- Bulk import/export
- Version history

### Base URL
```
Development: http://localhost:54321/functions/v1/rules
Production: https://[project-ref].supabase.co/functions/v1/rules
```

### Dependencies
- Supabase Edge Functions (Deno runtime)
- Existing types from `validation-run/types.ts`
- JSON Schema from `docs/architecture/VALIDATION_RULES_SCHEMA.json`

---

## File Structure

```
supabase/functions/rules/
├── index.ts          # Main entry, router, CORS
├── handlers.ts       # All 12 endpoint handlers
├── validators.ts     # JSON schema validation
├── types.ts          # API-specific TypeScript types
└── responses.ts      # Response helper functions
```

---

## File Specifications

### 1. `types.ts`

**Purpose**: Define all API request/response TypeScript interfaces.

**Import from validation-run**:
```typescript
// Re-export from validation-run for consistency
export type {
  ValidationRule,
  ValidationRuleRow,
  Severity,
  EntityType,
  TransformType,
  ComparisonType,
  ConditionOperator,
  VendorType,
  BuyingType,
  DataSource,
  ComparisonConfig,
  ConditionGroup,
  RuleMetadata,
  LocalizedMessage,
} from '../validation-run/types.ts';
```

**New Types to Define**:

```typescript
// User info extracted from JWT
export interface UserInfo {
  userId: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

// Query parameters for GET /rules
export interface ListRulesParams {
  active_only?: boolean;
  category?: string;
  severity?: string;
  phase?: string;
  include_drafts?: boolean;
  page?: number;
  limit?: number;
}

// Response for GET /rules
export interface RuleListResponse {
  total_count: number;
  page: number;
  limit: number;
  rules: RuleSummary[];
}

export interface RuleSummary {
  id: string;
  rule_id: string;
  name: string;
  severity: string;
  category: string | null;
  phase: string | null;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  updated_at: string;
}

// Request for POST /rules
export interface CreateRuleRequest {
  rule_definition: ValidationRule;
}

// Response for POST /rules
export interface CreateRuleResponse {
  id: string;
  rule_id: string;
  is_draft: boolean;
  is_active: boolean;
  version: number;
  message: string;
}

// Request for PUT /rules/:id
export interface UpdateRuleRequest {
  rule_definition: Partial<ValidationRule>;
  change_reason?: string;
}

// Request for POST /rules/:id/activate
export interface ActivateRuleRequest {
  activation_note?: string;
}

// Request for POST /rules/:id/deactivate
export interface DeactivateRuleRequest {
  deactivation_reason?: string;
}

// Request for POST /rules/:id/test
export interface TestRuleRequest {
  test_data: Record<string, Record<string, unknown>>;
}

// Response for POST /rules/:id/test
export interface TestRuleResponse {
  rule_id: string;
  test_result: {
    result: 'MATCH' | 'MISMATCH' | 'MISSING' | 'ERROR';
    status: 'GREEN' | 'ORANGE' | 'RED';
    source_value: string | null;
    target_value: string | null;
    normalized_source: string | null;
    normalized_target: string | null;
    similarity?: number;
    error?: string;
  };
  executed_at: string;
}

// Request for POST /rules/import
export interface ImportRulesRequest {
  rules: ValidationRule[];
  options: {
    skip_existing: boolean;
    activate_on_import: boolean;
  };
}

// Response for POST /rules/import
export interface ImportRulesResponse {
  imported: number;
  skipped: number;
  errors: number;
  details: Array<{
    rule_id: string;
    status: 'imported' | 'skipped' | 'error';
    id?: string;
    reason?: string;
    errors?: string[];
  }>;
}

// Response for GET /rules/export
export interface ExportRulesResponse {
  version: string;
  exported_at: string;
  exported_by: string;
  rules_count: number;
  rules: ValidationRule[];
}

// Response for GET /rules/:id/history
export interface RuleHistoryResponse {
  rule_id: string;
  history: Array<{
    id: string;
    change_type: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'DELETE';
    changed_by: string;
    changed_at: string;
    change_reason: string | null;
  }>;
}

// API Error response
export interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: unknown;
}
```

---

### 2. `responses.ts`

**Purpose**: Reusable response helper functions (pattern from buying-opportunity).

```typescript
// CORS headers - same as other Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Success JSON response
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Error response with code
export function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown
): Response {
  const body: ApiErrorResponse = { error: code, message, code };
  if (details) body.details = details;

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// CORS preflight response
export function corsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Map PostgreSQL error codes to HTTP responses
export function mapPostgresError(error: { code?: string; message: string }): Response {
  switch (error.code) {
    case '23505': // unique_violation
      return errorResponse('Rule with this ID already exists', 'DUPLICATE_RULE', 409);
    case 'PGRST116': // no rows returned
      return errorResponse('Rule not found', 'RULE_NOT_FOUND', 404);
    case '23503': // foreign_key_violation
      return errorResponse('Referenced entity does not exist', 'INVALID_REFERENCE', 400);
    case '23514': // check_constraint_violation
      return errorResponse('Invalid rule state', 'CONSTRAINT_VIOLATION', 400);
    default:
      console.error('[Database] Error:', error);
      return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }
}
```

---

### 3. `validators.ts`

**Purpose**: JSON Schema validation and business logic validation.

**Implementation Notes**:
- Embed the JSON Schema at build time (copy from `docs/architecture/VALIDATION_RULES_SCHEMA.json`)
- Use Ajv for validation
- Include business logic checks beyond schema

```typescript
import Ajv from 'npm:ajv@8';
import type { ValidationRule } from './types.ts';

// Embedded JSON Schema (copy content from VALIDATION_RULES_SCHEMA.json)
const RULE_SCHEMA = {
  // ... full schema here
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(RULE_SCHEMA);

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

// Validate rule against JSON Schema
export function validateRuleSchema(rule: unknown): ValidationResult {
  const valid = validateSchema(rule);

  if (!valid) {
    return {
      valid: false,
      errors: (validateSchema.errors ?? []).map(err => ({
        path: err.instancePath || '/',
        message: err.message ?? 'Unknown validation error',
      })),
    };
  }

  return { valid: true, errors: [] };
}

// Validate rule_id pattern
export function validateRuleId(ruleId: string): boolean {
  return /^[A-Z]{2,4}-[0-9]{3}$/.test(ruleId);
}

// Business logic validation beyond schema
export function validateRuleBusinessLogic(rule: ValidationRule): string[] {
  const errors: string[] = [];

  // Valid entity types
  const validEntities = [
    'buying_opportunity', 'vehicle', 'vendor',
    'ocr_orv', 'ocr_op', 'ocr_vtp',
    'ares', 'adis', 'cebia', 'dolozky'
  ];

  if (!validEntities.includes(rule.source.entity)) {
    errors.push(`Invalid source entity: ${rule.source.entity}`);
  }

  if (!validEntities.includes(rule.target.entity)) {
    errors.push(`Invalid target entity: ${rule.target.entity}`);
  }

  // FUZZY requires threshold
  if (rule.comparison.type === 'FUZZY') {
    const threshold = rule.comparison.threshold;
    if (threshold === undefined || threshold < 0 || threshold > 1) {
      errors.push('FUZZY comparison requires threshold between 0 and 1');
    }
  }

  // REGEX requires pattern
  if (rule.comparison.type === 'REGEX' && !rule.comparison.pattern) {
    errors.push('REGEX comparison requires pattern');
  }

  // IN_LIST requires allowedValues
  if (rule.comparison.type === 'IN_LIST') {
    if (!rule.comparison.allowedValues || rule.comparison.allowedValues.length === 0) {
      errors.push('IN_LIST comparison requires allowedValues array');
    }
  }

  return errors;
}

// Full validation combining schema + business logic
export function validateRule(rule: unknown): ValidationResult {
  // First validate schema
  const schemaResult = validateRuleSchema(rule);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  // Then validate business logic
  const businessErrors = validateRuleBusinessLogic(rule as ValidationRule);
  if (businessErrors.length > 0) {
    return {
      valid: false,
      errors: businessErrors.map(msg => ({ path: '/', message: msg })),
    };
  }

  return { valid: true, errors: [] };
}
```

---

### 4. `handlers.ts`

**Purpose**: Implementation of all 12 API endpoint handlers.

**Supabase Client Creation**:
```typescript
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Service client - bypasses RLS (for admin operations)
function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
```

**Handler Signatures**:

```typescript
// 1. GET /rules - List with filters
export async function handleList(
  params: ListRulesParams,
  user: UserInfo
): Promise<Response>

// 2. GET /rules/:id - Get single rule
export async function handleGet(
  ruleId: string,
  version?: number
): Promise<Response>

// 3. POST /rules - Create new rule (as draft)
export async function handleCreate(
  body: CreateRuleRequest,
  user: UserInfo
): Promise<Response>

// 4. PUT /rules/:id - Update rule
export async function handleUpdate(
  ruleId: string,
  body: UpdateRuleRequest,
  user: UserInfo
): Promise<Response>

// 5. DELETE /rules/:id - Soft delete
export async function handleDelete(
  ruleId: string,
  force: boolean,
  user: UserInfo
): Promise<Response>

// 6. POST /rules/:id/activate - Activate draft
export async function handleActivate(
  ruleId: string,
  body: ActivateRuleRequest,
  user: UserInfo
): Promise<Response>

// 7. POST /rules/:id/deactivate - Deactivate rule
export async function handleDeactivate(
  ruleId: string,
  body: DeactivateRuleRequest,
  user: UserInfo
): Promise<Response>

// 8. POST /rules/:id/test - Test rule with sample data
export async function handleTest(
  ruleId: string,
  body: TestRuleRequest
): Promise<Response>

// 9. GET /rules/:id/history - Get change history
export async function handleHistory(
  ruleId: string,
  limit: number,
  offset: number
): Promise<Response>

// 10. GET /rules/schema - Return JSON schema
export function handleGetSchema(): Response

// 11. POST /rules/import - Bulk import
export async function handleImport(
  body: ImportRulesRequest,
  user: UserInfo
): Promise<Response>

// 12. GET /rules/export - Bulk export
export async function handleExport(
  activeOnly: boolean,
  user: UserInfo
): Promise<Response>
```

---

### 5. `index.ts`

**Purpose**: Main entry point with routing and CORS handling.

**Structure**:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsResponse, errorResponse } from './responses.ts';
import { extractUserFromAuth, requireAdmin } from './auth.ts';
import * as handlers from './handlers.ts';

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  try {
    // 2. Parse URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts: ['functions', 'v1', 'rules', ...rest]
    const routeParts = pathParts.slice(3); // After 'rules'

    // 3. Extract auth (required for all endpoints)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return errorResponse('Authorization required', 'UNAUTHORIZED', 401);
    }
    const user = extractUserFromAuth(authHeader);

    // 4. Route to handlers
    return await routeRequest(req, routeParts, url.searchParams, user);

  } catch (error) {
    console.error('[Rules] Unhandled error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      'INTERNAL_ERROR',
      500
    );
  }
});

async function routeRequest(
  req: Request,
  routeParts: string[],
  params: URLSearchParams,
  user: UserInfo
): Promise<Response> {
  const method = req.method;

  // GET /rules (list)
  if (routeParts.length === 0 && method === 'GET') {
    return handlers.handleList(parseListParams(params), user);
  }

  // POST /rules (create)
  if (routeParts.length === 0 && method === 'POST') {
    requireAdmin(user);
    const body = await req.json();
    return handlers.handleCreate(body, user);
  }

  // GET /rules/schema
  if (routeParts[0] === 'schema' && method === 'GET') {
    return handlers.handleGetSchema();
  }

  // POST /rules/import
  if (routeParts[0] === 'import' && method === 'POST') {
    requireAdmin(user);
    const body = await req.json();
    return handlers.handleImport(body, user);
  }

  // GET /rules/export
  if (routeParts[0] === 'export' && method === 'GET') {
    const activeOnly = params.get('active_only') === 'true';
    return handlers.handleExport(activeOnly, user);
  }

  // Routes with :ruleId
  const ruleId = routeParts[0];
  if (!ruleId) {
    return errorResponse('Rule ID required', 'MISSING_PARAMETER', 400);
  }

  const action = routeParts[1];

  // GET /rules/:id
  if (!action && method === 'GET') {
    const version = params.get('version') ? parseInt(params.get('version')!) : undefined;
    return handlers.handleGet(ruleId, version);
  }

  // PUT /rules/:id
  if (!action && method === 'PUT') {
    requireAdmin(user);
    const body = await req.json();
    return handlers.handleUpdate(ruleId, body, user);
  }

  // DELETE /rules/:id
  if (!action && method === 'DELETE') {
    requireAdmin(user);
    const force = params.get('force') === 'true';
    return handlers.handleDelete(ruleId, force, user);
  }

  // POST /rules/:id/activate
  if (action === 'activate' && method === 'POST') {
    requireAdmin(user);
    const body = await req.json().catch(() => ({}));
    return handlers.handleActivate(ruleId, body, user);
  }

  // POST /rules/:id/deactivate
  if (action === 'deactivate' && method === 'POST') {
    requireAdmin(user);
    const body = await req.json().catch(() => ({}));
    return handlers.handleDeactivate(ruleId, body, user);
  }

  // POST /rules/:id/test
  if (action === 'test' && method === 'POST') {
    const body = await req.json();
    return handlers.handleTest(ruleId, body);
  }

  // GET /rules/:id/history
  if (action === 'history' && method === 'GET') {
    requireAdmin(user);
    const limit = parseInt(params.get('limit') ?? '20');
    const offset = parseInt(params.get('offset') ?? '0');
    return handlers.handleHistory(ruleId, limit, offset);
  }

  return errorResponse('Not found', 'NOT_FOUND', 404);
}
```

---

## API Endpoints

### Complete Endpoint Reference

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | GET | `/rules` | authenticated | List rules with filters |
| 2 | GET | `/rules/:id` | authenticated | Get single rule by rule_id |
| 3 | POST | `/rules` | admin | Create new rule (as draft) |
| 4 | PUT | `/rules/:id` | admin | Update rule (versions if active) |
| 5 | DELETE | `/rules/:id` | admin | Soft delete (force option) |
| 6 | POST | `/rules/:id/activate` | admin | Activate draft rule |
| 7 | POST | `/rules/:id/deactivate` | admin | Deactivate active rule |
| 8 | POST | `/rules/:id/test` | authenticated | Test with sample data |
| 9 | GET | `/rules/:id/history` | admin | Get change history |
| 10 | GET | `/rules/schema` | authenticated | Return JSON schema |
| 11 | POST | `/rules/import` | admin | Bulk import rules |
| 12 | GET | `/rules/export` | authenticated | Bulk export rules |

---

## Database Operations

### Key Queries

**List Rules (handleList)**:
```sql
SELECT
  id, rule_id,
  rule_definition->>'name' as name,
  rule_definition->>'severity' as severity,
  rule_definition->'metadata'->>'category' as category,
  rule_definition->'metadata'->>'phase' as phase,
  is_active, is_draft, version, updated_at
FROM validation_rules
WHERE
  ($1::boolean IS NULL OR is_active = $1)
  AND ($2::text IS NULL OR rule_definition->'metadata'->>'category' = $2)
  AND ($3::text IS NULL OR rule_definition->>'severity' = $3)
ORDER BY
  (rule_definition->'metadata'->>'priority')::int NULLS LAST,
  rule_id
LIMIT $4 OFFSET $5;
```

**Create Rule (handleCreate)**:
```sql
INSERT INTO validation_rules (
  rule_id, rule_definition, is_active, is_draft,
  version, schema_version, created_by
) VALUES (
  $1, $2, false, true, 1, '1.1', $3
) RETURNING *;
```

**Activate Rule (handleActivate)**:
```sql
-- Step 1: Deactivate other versions
UPDATE validation_rules
SET is_active = false, deactivated_by = $2, deactivated_at = NOW()
WHERE rule_id = $1 AND is_active = true;

-- Step 2: Activate target
UPDATE validation_rules
SET is_active = true, is_draft = false,
    activated_by = $2, activated_at = NOW()
WHERE id = $3;
```

**Version on Update (handleUpdate for active rule)**:
```sql
INSERT INTO validation_rules (
  rule_id, rule_definition, is_active, is_draft,
  version, previous_version_id, schema_version, created_by
) VALUES (
  $1, $2, false, true, $3, $4, '1.1', $5
) RETURNING *;
```

---

## Authentication & Authorization

### JWT Extraction
```typescript
export function extractUserFromAuth(authHeader: string): UserInfo {
  const token = authHeader.replace('Bearer ', '');
  const [, payloadB64] = token.split('.');
  const payload = JSON.parse(atob(payloadB64));

  return {
    userId: payload.sub ?? 'unknown',
    email: payload.email ?? 'unknown',
    role: payload.role ?? 'authenticated',
    isAdmin: payload.role === 'admin',
  };
}

export function requireAdmin(user: UserInfo): void {
  if (!user.isAdmin) {
    throw new ForbiddenError('Admin role required');
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
```

---

## Error Handling

### Error Codes

| Code | HTTP | When |
|------|------|------|
| `UNAUTHORIZED` | 401 | Missing auth header |
| `FORBIDDEN` | 403 | User lacks admin role |
| `RULE_NOT_FOUND` | 404 | Rule with ID not found |
| `MISSING_PARAMETER` | 400 | Required field missing |
| `INVALID_RULE_ID` | 400 | ID doesn't match pattern |
| `SCHEMA_VALIDATION_ERROR` | 400 | Rule fails JSON schema |
| `DUPLICATE_RULE` | 409 | rule_id already exists |
| `CONFLICT` | 409 | Cannot delete active rule |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## Testing Strategy

### Local Testing
```bash
# Start local Supabase
supabase start

# Serve the function
supabase functions serve rules --env-file supabase/.env.local

# Test list endpoint
curl http://localhost:54321/functions/v1/rules \
  -H "Authorization: Bearer $TOKEN"

# Test create endpoint
curl -X POST http://localhost:54321/functions/v1/rules \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rule_definition": {...}}'
```

### Deployment
```bash
supabase functions deploy rules
```

---

## Implementation Checklist

- [ ] Create `supabase/functions/rules/` directory
- [ ] Create `types.ts` with all interfaces
- [ ] Create `responses.ts` with helper functions
- [ ] Create `validators.ts` with JSON Schema validation
- [ ] Create `handlers.ts` with all 12 handlers
- [ ] Create `index.ts` with routing
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy with `supabase functions deploy`
- [ ] Create OpenAPI specification (`docs/api/openapi-rules.yaml`)

---

## Related Documents

- `docs/architecture/VALIDATION_RULES_SCHEMA.json` - JSON Schema for rules
- `docs/architecture/RULE_MANAGEMENT_API.md` - Original API specification
- `docs/Analysis/ValidationRulesManagement.md` - System analysis
- `supabase/functions/buying-opportunity/index.ts` - Pattern reference
- `supabase/functions/validation-run/types.ts` - Shared type definitions
