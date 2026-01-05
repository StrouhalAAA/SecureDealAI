# Task 6.2: Rules Edge Function Core Setup

> **Task ID**: 06_02
> **Status**: [ ] Pending
> **Depends On**: 6.1 (Database Schema Verification)
> **Estimated Time**: 2 hours

---

## Objective

Create the core Edge Function structure for the Rules Management API, including the main router, type definitions, input validators, and response helpers.

---

## Prerequisites

- Task 6.1 completed (database schema verified)
- Supabase CLI installed
- Access to project Supabase instance

---

## File Structure

```
supabase/functions/rules/
├── index.ts        # Main router, CORS, auth
├── types.ts        # TypeScript interfaces
├── validators.ts   # Input validation
├── responses.ts    # Response helpers
└── handlers.ts     # Handler stubs (implemented in 6.3-6.5)
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p supabase/functions/rules
```

### Step 2: Create types.ts

```typescript
// supabase/functions/rules/types.ts

/**
 * Transform types for data normalization
 */
export type TransformType =
  | 'UPPERCASE'
  | 'LOWERCASE'
  | 'TRIM'
  | 'REMOVE_SPACES'
  | 'REMOVE_DIACRITICS'
  | 'NORMALIZE_DATE'
  | 'EXTRACT_NUMBER'
  | 'FORMAT_RC'
  | 'FORMAT_ICO'
  | 'FORMAT_DIC'
  | 'ADDRESS_NORMALIZE'
  | 'NAME_NORMALIZE'
  | 'VIN_NORMALIZE'
  | 'SPZ_NORMALIZE';

/**
 * Comparator types for field comparison
 */
export type ComparatorType =
  | 'EXACT'
  | 'FUZZY'
  | 'CONTAINS'
  | 'REGEX'
  | 'NUMERIC_TOLERANCE'
  | 'DATE_TOLERANCE'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'IN_LIST';

/**
 * Severity levels for validation results
 */
export type SeverityType = 'CRITICAL' | 'WARNING' | 'INFO';

/**
 * Source entity types
 */
export type SourceEntityType = 'VEHICLE' | 'VENDOR' | 'TRANSACTION';

/**
 * Target entity types
 */
export type TargetEntityType = 'OCR' | 'ARES' | 'ADIS' | 'MANUAL';

/**
 * Vendor type filter
 */
export type VendorType = 'PHYSICAL_PERSON' | 'COMPANY';

/**
 * Buying type filter
 */
export type BuyingType = 'BRANCH' | 'MOBILE_BUYING';

/**
 * Rule applicability filters
 */
export interface RuleAppliesTo {
  vendor_type?: VendorType[];
  buying_type?: BuyingType[];
}

/**
 * Transform definition with optional parameters
 */
export interface Transform {
  type: TransformType;
  params?: Record<string, unknown>;
}

/**
 * Comparator parameters
 */
export interface ComparatorParams {
  threshold?: number;      // For FUZZY (0-100)
  tolerance?: number;      // For NUMERIC/DATE_TOLERANCE
  pattern?: string;        // For REGEX
  values?: string[];       // For IN_LIST
  unit?: 'days' | 'months' | 'years';  // For DATE_TOLERANCE
}

/**
 * Complete rule definition stored in rule_definition JSONB
 */
export interface RuleDefinition {
  rule_id: string;
  rule_name: string;
  description?: string;
  source_entity: SourceEntityType;
  source_field: string;
  target_entity: TargetEntityType;
  target_field: string;
  transform?: Transform[];
  comparator: ComparatorType;
  comparator_params?: ComparatorParams;
  severity: SeverityType;
  error_message: string;
  applies_to?: RuleAppliesTo;
  enabled: boolean;
}

/**
 * Database row for validation_rules table
 */
export interface ValidationRuleRow {
  id: string;
  rule_id: string;
  rule_definition: RuleDefinition;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * API response for a single rule
 */
export interface RuleResponse {
  id: string;
  rule_id: string;
  rule_name: string;
  description?: string;
  source_entity: SourceEntityType;
  source_field: string;
  target_entity: TargetEntityType;
  target_field: string;
  transform?: Transform[];
  comparator: ComparatorType;
  comparator_params?: ComparatorParams;
  severity: SeverityType;
  error_message: string;
  applies_to?: RuleAppliesTo;
  enabled: boolean;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Request body for creating a rule
 */
export interface CreateRuleRequest {
  rule_id: string;
  rule_name: string;
  description?: string;
  source_entity: SourceEntityType;
  source_field: string;
  target_entity: TargetEntityType;
  target_field: string;
  transform?: Transform[];
  comparator: ComparatorType;
  comparator_params?: ComparatorParams;
  severity: SeverityType;
  error_message: string;
  applies_to?: RuleAppliesTo;
  enabled?: boolean;
}

/**
 * Request body for updating a rule
 */
export interface UpdateRuleRequest {
  rule_name?: string;
  description?: string;
  source_entity?: SourceEntityType;
  source_field?: string;
  target_entity?: TargetEntityType;
  target_field?: string;
  transform?: Transform[];
  comparator?: ComparatorType;
  comparator_params?: ComparatorParams;
  severity?: SeverityType;
  error_message?: string;
  applies_to?: RuleAppliesTo;
  enabled?: boolean;
}

/**
 * Query parameters for listing rules
 */
export interface ListRulesQuery {
  status?: 'active' | 'draft' | 'all';
  source_entity?: SourceEntityType;
  severity?: SeverityType;
  vendor_type?: VendorType;
  buying_type?: BuyingType;
  page?: number;
  limit?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Import/Export format
 */
export interface RulesExport {
  version: string;
  exported_at: string;
  rules_count: number;
  rules: RuleDefinition[];
}

/**
 * Clone request
 */
export interface CloneRuleRequest {
  new_rule_id: string;
  new_rule_name?: string;
}

/**
 * Import result
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ rule_id: string; error: string }>;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE' | 'CLONE' | 'IMPORT' | 'EXPORT';
  entity_type: 'RULE';
  entity_id: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  performed_by?: string;
  performed_at: string;
}
```

### Step 3: Create validators.ts

```typescript
// supabase/functions/rules/validators.ts

import type {
  CreateRuleRequest,
  UpdateRuleRequest,
  RuleDefinition,
  TransformType,
  ComparatorType,
  SeverityType,
  SourceEntityType,
  TargetEntityType,
  CloneRuleRequest,
} from './types.ts';

const VALID_TRANSFORMS: TransformType[] = [
  'UPPERCASE', 'LOWERCASE', 'TRIM', 'REMOVE_SPACES', 'REMOVE_DIACRITICS',
  'NORMALIZE_DATE', 'EXTRACT_NUMBER', 'FORMAT_RC', 'FORMAT_ICO', 'FORMAT_DIC',
  'ADDRESS_NORMALIZE', 'NAME_NORMALIZE', 'VIN_NORMALIZE', 'SPZ_NORMALIZE'
];

const VALID_COMPARATORS: ComparatorType[] = [
  'EXACT', 'FUZZY', 'CONTAINS', 'REGEX', 'NUMERIC_TOLERANCE',
  'DATE_TOLERANCE', 'EXISTS', 'NOT_EXISTS', 'IN_LIST'
];

const VALID_SEVERITIES: SeverityType[] = ['CRITICAL', 'WARNING', 'INFO'];

const VALID_SOURCE_ENTITIES: SourceEntityType[] = ['VEHICLE', 'VENDOR', 'TRANSACTION'];

const VALID_TARGET_ENTITIES: TargetEntityType[] = ['OCR', 'ARES', 'ADIS', 'MANUAL'];

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate rule_id format: XXX-NNN (e.g., VEH-001, VEN-010)
 */
export function validateRuleId(ruleId: string): boolean {
  return /^[A-Z]{2,4}-\d{3}$/.test(ruleId);
}

/**
 * Validate create rule request
 */
export function validateCreateRule(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }

  const req = data as CreateRuleRequest;

  // Required fields
  if (!req.rule_id) {
    errors.push({ field: 'rule_id', message: 'rule_id is required' });
  } else if (!validateRuleId(req.rule_id)) {
    errors.push({ field: 'rule_id', message: 'rule_id must match format XXX-NNN (e.g., VEH-001)' });
  }

  if (!req.rule_name || typeof req.rule_name !== 'string') {
    errors.push({ field: 'rule_name', message: 'rule_name is required and must be a string' });
  } else if (req.rule_name.length < 3 || req.rule_name.length > 100) {
    errors.push({ field: 'rule_name', message: 'rule_name must be between 3 and 100 characters' });
  }

  if (!req.source_entity) {
    errors.push({ field: 'source_entity', message: 'source_entity is required' });
  } else if (!VALID_SOURCE_ENTITIES.includes(req.source_entity)) {
    errors.push({ field: 'source_entity', message: `source_entity must be one of: ${VALID_SOURCE_ENTITIES.join(', ')}` });
  }

  if (!req.source_field || typeof req.source_field !== 'string') {
    errors.push({ field: 'source_field', message: 'source_field is required' });
  }

  if (!req.target_entity) {
    errors.push({ field: 'target_entity', message: 'target_entity is required' });
  } else if (!VALID_TARGET_ENTITIES.includes(req.target_entity)) {
    errors.push({ field: 'target_entity', message: `target_entity must be one of: ${VALID_TARGET_ENTITIES.join(', ')}` });
  }

  if (!req.target_field || typeof req.target_field !== 'string') {
    errors.push({ field: 'target_field', message: 'target_field is required' });
  }

  if (!req.comparator) {
    errors.push({ field: 'comparator', message: 'comparator is required' });
  } else if (!VALID_COMPARATORS.includes(req.comparator)) {
    errors.push({ field: 'comparator', message: `comparator must be one of: ${VALID_COMPARATORS.join(', ')}` });
  }

  if (!req.severity) {
    errors.push({ field: 'severity', message: 'severity is required' });
  } else if (!VALID_SEVERITIES.includes(req.severity)) {
    errors.push({ field: 'severity', message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
  }

  if (!req.error_message || typeof req.error_message !== 'string') {
    errors.push({ field: 'error_message', message: 'error_message is required' });
  }

  // Optional field validation
  if (req.transform) {
    if (!Array.isArray(req.transform)) {
      errors.push({ field: 'transform', message: 'transform must be an array' });
    } else {
      req.transform.forEach((t, i) => {
        if (!t.type || !VALID_TRANSFORMS.includes(t.type)) {
          errors.push({ field: `transform[${i}].type`, message: `Invalid transform type: ${t.type}` });
        }
      });
    }
  }

  if (req.applies_to) {
    if (req.applies_to.vendor_type) {
      if (!Array.isArray(req.applies_to.vendor_type)) {
        errors.push({ field: 'applies_to.vendor_type', message: 'vendor_type must be an array' });
      } else {
        const validVendorTypes = ['PHYSICAL_PERSON', 'COMPANY'];
        req.applies_to.vendor_type.forEach((vt) => {
          if (!validVendorTypes.includes(vt)) {
            errors.push({ field: 'applies_to.vendor_type', message: `Invalid vendor_type: ${vt}` });
          }
        });
      }
    }
    if (req.applies_to.buying_type) {
      if (!Array.isArray(req.applies_to.buying_type)) {
        errors.push({ field: 'applies_to.buying_type', message: 'buying_type must be an array' });
      } else {
        const validBuyingTypes = ['BRANCH', 'MOBILE_BUYING'];
        req.applies_to.buying_type.forEach((bt) => {
          if (!validBuyingTypes.includes(bt)) {
            errors.push({ field: 'applies_to.buying_type', message: `Invalid buying_type: ${bt}` });
          }
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate update rule request
 */
export function validateUpdateRule(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }

  const req = data as UpdateRuleRequest;

  // At least one field must be provided
  const updateableFields = [
    'rule_name', 'description', 'source_entity', 'source_field',
    'target_entity', 'target_field', 'transform', 'comparator',
    'comparator_params', 'severity', 'error_message', 'applies_to', 'enabled'
  ];

  const hasUpdate = updateableFields.some(field => (req as Record<string, unknown>)[field] !== undefined);
  if (!hasUpdate) {
    errors.push({ field: 'body', message: 'At least one field must be provided for update' });
  }

  // Validate provided fields
  if (req.rule_name !== undefined) {
    if (typeof req.rule_name !== 'string' || req.rule_name.length < 3 || req.rule_name.length > 100) {
      errors.push({ field: 'rule_name', message: 'rule_name must be a string between 3 and 100 characters' });
    }
  }

  if (req.source_entity !== undefined && !VALID_SOURCE_ENTITIES.includes(req.source_entity)) {
    errors.push({ field: 'source_entity', message: `source_entity must be one of: ${VALID_SOURCE_ENTITIES.join(', ')}` });
  }

  if (req.target_entity !== undefined && !VALID_TARGET_ENTITIES.includes(req.target_entity)) {
    errors.push({ field: 'target_entity', message: `target_entity must be one of: ${VALID_TARGET_ENTITIES.join(', ')}` });
  }

  if (req.comparator !== undefined && !VALID_COMPARATORS.includes(req.comparator)) {
    errors.push({ field: 'comparator', message: `comparator must be one of: ${VALID_COMPARATORS.join(', ')}` });
  }

  if (req.severity !== undefined && !VALID_SEVERITIES.includes(req.severity)) {
    errors.push({ field: 'severity', message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
  }

  if (req.transform !== undefined) {
    if (!Array.isArray(req.transform)) {
      errors.push({ field: 'transform', message: 'transform must be an array' });
    } else {
      req.transform.forEach((t, i) => {
        if (!t.type || !VALID_TRANSFORMS.includes(t.type)) {
          errors.push({ field: `transform[${i}].type`, message: `Invalid transform type: ${t.type}` });
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate clone rule request
 */
export function validateCloneRule(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }

  const req = data as CloneRuleRequest;

  if (!req.new_rule_id) {
    errors.push({ field: 'new_rule_id', message: 'new_rule_id is required' });
  } else if (!validateRuleId(req.new_rule_id)) {
    errors.push({ field: 'new_rule_id', message: 'new_rule_id must match format XXX-NNN (e.g., VEH-001)' });
  }

  if (req.new_rule_name !== undefined && typeof req.new_rule_name !== 'string') {
    errors.push({ field: 'new_rule_name', message: 'new_rule_name must be a string' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate import data
 */
export function validateImportData(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }

  const importData = data as { rules?: unknown[] };

  if (!importData.rules || !Array.isArray(importData.rules)) {
    errors.push({ field: 'rules', message: 'rules array is required' });
    return { valid: false, errors };
  }

  if (importData.rules.length === 0) {
    errors.push({ field: 'rules', message: 'rules array cannot be empty' });
  }

  if (importData.rules.length > 100) {
    errors.push({ field: 'rules', message: 'Cannot import more than 100 rules at once' });
  }

  // Validate each rule in the import
  importData.rules.forEach((rule, i) => {
    const result = validateCreateRule(rule);
    result.errors.forEach(err => {
      errors.push({ field: `rules[${i}].${err.field}`, message: err.message });
    });
  });

  return { valid: errors.length === 0, errors };
}
```

### Step 4: Create responses.ts

```typescript
// supabase/functions/rules/responses.ts

/**
 * Standard API response helpers
 */

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Success response (200)
 */
export function success<T>(data: T): Response {
  return jsonResponse({
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }, 200);
}

/**
 * Created response (201)
 */
export function created<T>(data: T): Response {
  return jsonResponse({
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }, 201);
}

/**
 * No content response (204)
 */
export function noContent(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Bad request response (400)
 */
export function badRequest(message: string, details?: unknown): Response {
  return jsonResponse({
    error: {
      code: 'BAD_REQUEST',
      message,
      details,
    },
  }, 400);
}

/**
 * Unauthorized response (401)
 */
export function unauthorized(message = 'Authentication required'): Response {
  return jsonResponse({
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
  }, 401);
}

/**
 * Forbidden response (403)
 */
export function forbidden(message = 'Insufficient permissions'): Response {
  return jsonResponse({
    error: {
      code: 'FORBIDDEN',
      message,
    },
  }, 403);
}

/**
 * Not found response (404)
 */
export function notFound(resource = 'Resource'): Response {
  return jsonResponse({
    error: {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
    },
  }, 404);
}

/**
 * Conflict response (409)
 */
export function conflict(message: string): Response {
  return jsonResponse({
    error: {
      code: 'CONFLICT',
      message,
    },
  }, 409);
}

/**
 * Unprocessable entity response (422)
 */
export function unprocessable(message: string, details?: unknown): Response {
  return jsonResponse({
    error: {
      code: 'UNPROCESSABLE_ENTITY',
      message,
      details,
    },
  }, 422);
}

/**
 * Internal server error response (500)
 */
export function serverError(message = 'Internal server error'): Response {
  return jsonResponse({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  }, 500);
}

/**
 * CORS preflight response
 */
export function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Method not allowed response (405)
 */
export function methodNotAllowed(allowed: string[]): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method not allowed. Allowed: ${allowed.join(', ')}`,
      },
    }),
    {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Allow': allowed.join(', '),
      },
    }
  );
}
```

### Step 5: Create index.ts (Main Router)

```typescript
// supabase/functions/rules/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsResponse,
  badRequest,
  unauthorized,
  notFound,
  methodNotAllowed,
  serverError,
} from './responses.ts';

// Handler imports will be added in tasks 6.3-6.5
// import { listRules, getRule, createRule, updateRule, deleteRule } from './handlers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Parse route from URL path
 * Routes:
 *   GET    /rules                    -> listRules
 *   GET    /rules/:rule_id           -> getRule
 *   POST   /rules                    -> createRule
 *   PUT    /rules/:rule_id           -> updateRule
 *   DELETE /rules/:rule_id           -> deleteRule
 *   POST   /rules/:rule_id/activate  -> activateRule
 *   POST   /rules/:rule_id/deactivate -> deactivateRule
 *   POST   /rules/:rule_id/clone     -> cloneRule
 *   GET    /rules/export             -> exportRules
 *   POST   /rules/import             -> importRules
 */
function parseRoute(url: URL): { action: string; ruleId?: string } {
  const path = url.pathname.replace('/rules', '').replace(/^\/+|\/+$/g, '');
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { action: 'list' };
  }

  if (segments[0] === 'export') {
    return { action: 'export' };
  }

  if (segments[0] === 'import') {
    return { action: 'import' };
  }

  if (segments.length === 1) {
    return { action: 'single', ruleId: segments[0] };
  }

  if (segments.length === 2) {
    const ruleId = segments[0];
    const subAction = segments[1];

    if (subAction === 'activate') {
      return { action: 'activate', ruleId };
    }
    if (subAction === 'deactivate') {
      return { action: 'deactivate', ruleId };
    }
    if (subAction === 'clone') {
      return { action: 'clone', ruleId };
    }
  }

  return { action: 'unknown' };
}

/**
 * Get authenticated user from JWT token
 */
async function getUser(req: Request): Promise<{ id: string; role: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // For custom JWT tokens (from verify-access-code), decode manually
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'authenticated') {
        return { id: payload.sub || 'system', role: 'authenticated' };
      }
      return null;
    }

    return { id: user.id, role: user.role || 'authenticated' };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const url = new URL(req.url);
  const route = parseRoute(url);
  const method = req.method;

  // Authenticate request
  const user = await getUser(req);
  if (!user) {
    return unauthorized();
  }

  // Create Supabase client with service role for DB operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Route handling
    switch (route.action) {
      case 'list':
        if (method === 'GET') {
          // return listRules(supabase, url.searchParams);
          return badRequest('Handler not implemented - see task 6.3');
        }
        if (method === 'POST') {
          const body = await req.json();
          // return createRule(supabase, body, user.id);
          return badRequest('Handler not implemented - see task 6.3');
        }
        return methodNotAllowed(['GET', 'POST']);

      case 'single':
        if (!route.ruleId) {
          return badRequest('Rule ID is required');
        }
        if (method === 'GET') {
          // return getRule(supabase, route.ruleId);
          return badRequest('Handler not implemented - see task 6.3');
        }
        if (method === 'PUT') {
          const body = await req.json();
          // return updateRule(supabase, route.ruleId, body, user.id);
          return badRequest('Handler not implemented - see task 6.3');
        }
        if (method === 'DELETE') {
          // return deleteRule(supabase, route.ruleId, user.id);
          return badRequest('Handler not implemented - see task 6.3');
        }
        return methodNotAllowed(['GET', 'PUT', 'DELETE']);

      case 'activate':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        // return activateRule(supabase, route.ruleId!, user.id);
        return badRequest('Handler not implemented - see task 6.4');

      case 'deactivate':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        // return deactivateRule(supabase, route.ruleId!, user.id);
        return badRequest('Handler not implemented - see task 6.4');

      case 'clone':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        const cloneBody = await req.json();
        // return cloneRule(supabase, route.ruleId!, cloneBody, user.id);
        return badRequest('Handler not implemented - see task 6.4');

      case 'export':
        if (method !== 'GET') {
          return methodNotAllowed(['GET']);
        }
        // return exportRules(supabase, url.searchParams);
        return badRequest('Handler not implemented - see task 6.5');

      case 'import':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        const importBody = await req.json();
        // return importRules(supabase, importBody, user.id);
        return badRequest('Handler not implemented - see task 6.5');

      default:
        return notFound('Endpoint');
    }
  } catch (error) {
    console.error('Rules API error:', error);
    if (error instanceof SyntaxError) {
      return badRequest('Invalid JSON in request body');
    }
    return serverError();
  }
});
```

### Step 6: Update supabase/config.toml

Add the rules function configuration:

```toml
# Add to supabase/config.toml

[functions.rules]
verify_jwt = true
```

### Step 7: Deploy and Test

```bash
# Deploy the function
supabase functions deploy rules

# Test that it's accessible (should return 401 without auth)
curl -i "$SUPABASE_URL/functions/v1/rules"
```

---

## Test Cases

### TC-6.2.1: CORS Preflight

```bash
curl -i -X OPTIONS "$SUPABASE_URL/functions/v1/rules"
```

Expected: 204 with CORS headers

### TC-6.2.2: Unauthorized Access

```bash
curl -i "$SUPABASE_URL/functions/v1/rules"
```

Expected: 401 Unauthorized

### TC-6.2.3: Authenticated Access (Stub Response)

```bash
curl -i "$SUPABASE_URL/functions/v1/rules" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: 400 "Handler not implemented"

---

## Validation Criteria

- [ ] Function directory created with all files
- [ ] Types correctly define all interfaces
- [ ] Validators handle all validation scenarios
- [ ] Response helpers return correct status codes
- [ ] Router correctly parses all routes
- [ ] CORS headers present on all responses
- [ ] Authentication check working
- [ ] Function deployed successfully

---

## Troubleshooting

### Issue: Import errors in Deno

**Solution**: Use correct ESM imports:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

### Issue: JWT verification fails

**Solution**: Ensure `verify_jwt = true` in config.toml and token is valid.

### Issue: CORS errors in browser

**Solution**: Verify all response helpers include corsHeaders.

---

## Completion Checklist

When this task is complete:
1. All 4 TypeScript files created
2. Function compiles without errors
3. Function deployed to Supabase
4. CORS working
5. Authentication working
6. Stub responses returning for all routes

**Mark as complete**: Update tracker status to `[x] Complete`
