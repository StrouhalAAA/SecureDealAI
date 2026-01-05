# Rule Management API - SecureDealAI MVP

> **Version**: 1.0.0
> **Created**: 2026-01-01
> **Base URL**: `https://api.securedealai.aures.app` (production)
> **Dev URL**: `https://[project-ref].supabase.co/functions/v1`

---

## Overview

Rule Management API provides CRUD operations for dynamic validation rules. Rules are stored as JSON in PostgreSQL (Supabase) and can be managed without code deployments.

### Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <supabase_jwt_token>
```

Admin endpoints require `role: admin` in JWT claims.

---

## API Endpoints

### 1. Validation Execution

#### POST /validate

Execute validation for a buying opportunity.

**Request:**
```json
{
  "buying_opportunity_id": "uuid-123"
}
```

**Alternative Request (by SPZ):**
```json
{
  "spz": "1AB2345"
}
```

**Response (200 OK):**
```json
{
  "id": "result-uuid",
  "buying_opportunity_id": "uuid-123",
  "overall_status": "GREEN",
  "field_validations": [
    {
      "rule_id": "VEH-001",
      "field": "vin",
      "manual_value": "YV1PZA3TCL1103985",
      "ocr_value": "YV1PZA3TCL1103985",
      "result": "MATCH",
      "severity": "CRITICAL",
      "status": "GREEN"
    }
  ],
  "statistics": {
    "total_rules_executed": 21,
    "rules_passed": 21,
    "rules_failed": 0,
    "rules_skipped": 0,
    "critical_issues": 0,
    "warning_issues": 0
  },
  "duration_ms": 234,
  "created_at": "2026-01-01T10:30:00Z"
}
```

**Error Response (400):**
```json
{
  "error": "validation_error",
  "message": "Missing required parameter: buying_opportunity_id or spz",
  "code": "MISSING_PARAMETER"
}
```

---

#### GET /validate/{validationId}

Get validation result by ID.

**Response (200 OK):**
```json
{
  "id": "result-uuid",
  "buying_opportunity_id": "uuid-123",
  "overall_status": "RED",
  "field_validations": [...],
  "statistics": {...},
  "created_at": "2026-01-01T10:30:00Z"
}
```

---

#### GET /validate/spz/{spz}

Get latest validation result for a vehicle by SPZ.

**Response (200 OK):**
```json
{
  "id": "result-uuid",
  "spz": "1AB2345",
  "overall_status": "GREEN",
  "field_validations": [...],
  "created_at": "2026-01-01T10:30:00Z"
}
```

---

#### GET /validate/spz/{spz}/history

Get all validation results for a vehicle.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Max results to return |
| offset | integer | 0 | Pagination offset |

**Response (200 OK):**
```json
{
  "spz": "1AB2345",
  "total_count": 5,
  "validations": [
    {
      "id": "result-uuid-1",
      "overall_status": "GREEN",
      "created_at": "2026-01-01T10:30:00Z"
    },
    {
      "id": "result-uuid-2",
      "overall_status": "ORANGE",
      "created_at": "2025-12-28T14:20:00Z"
    }
  ]
}
```

---

### 2. Rule Management (Admin Only)

#### GET /rules

List all validation rules.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| active_only | boolean | false | Return only active rules |
| category | string | - | Filter by category (vehicle, vendor_fo, vendor_po, cross) |
| severity | string | - | Filter by severity (CRITICAL, WARNING, INFO) |
| phase | string | - | Filter by phase (mvp, phase2) |
| include_drafts | boolean | false | Include draft rules |

**Response (200 OK):**
```json
{
  "total_count": 31,
  "rules": [
    {
      "id": "db-uuid",
      "rule_id": "VEH-001",
      "name": "VIN Match",
      "severity": "CRITICAL",
      "is_active": true,
      "is_draft": false,
      "version": 1,
      "category": "vehicle",
      "phase": "mvp",
      "updated_at": "2026-01-01T10:00:00Z"
    }
  ]
}
```

---

#### GET /rules/{ruleId}

Get rule details by rule_id (e.g., VEH-001).

**Response (200 OK):**
```json
{
  "id": "db-uuid",
  "rule_id": "VEH-001",
  "rule_definition": {
    "id": "VEH-001",
    "name": "VIN Match",
    "description": "VIN must match exactly...",
    "source": {...},
    "target": {...},
    "comparison": {...},
    "severity": "CRITICAL",
    "blockOnFail": true
  },
  "is_active": true,
  "is_draft": false,
  "version": 1,
  "schema_version": "1.0",
  "created_by": "admin@aures.cz",
  "created_at": "2026-01-01T10:00:00Z",
  "activated_by": "admin@aures.cz",
  "activated_at": "2026-01-01T10:05:00Z"
}
```

---

#### POST /rules

Create a new validation rule (as draft).

**Request:**
```json
{
  "rule_definition": {
    "id": "VEH-008",
    "name": "Color Match",
    "description": "Vehicle color should match ORV",
    "enabled": true,
    "source": {
      "entity": "vehicle",
      "field": "barva",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "target": {
      "entity": "ocr_orv",
      "field": "color",
      "transforms": ["UPPERCASE", "TRIM"]
    },
    "comparison": {
      "type": "FUZZY",
      "threshold": 0.8
    },
    "severity": "WARNING",
    "blockOnFail": false,
    "errorMessage": {
      "cs": "Barva vozidla se liší",
      "en": "Vehicle color differs"
    },
    "metadata": {
      "category": "vehicle",
      "phase": "mvp",
      "priority": 24
    }
  }
}
```

**Response (201 Created):**
```json
{
  "id": "db-uuid",
  "rule_id": "VEH-008",
  "is_draft": true,
  "is_active": false,
  "version": 1,
  "message": "Rule created as draft. Use /rules/{id}/activate to activate."
}
```

**Validation Errors (400):**
```json
{
  "error": "validation_error",
  "message": "Rule definition does not match schema",
  "details": [
    {
      "path": "$.comparison.threshold",
      "message": "threshold must be between 0 and 1"
    }
  ]
}
```

---

#### PUT /rules/{ruleId}

Update an existing rule. Creates a new version if rule is active.

**Request:**
```json
{
  "rule_definition": {
    "...updated fields..."
  },
  "change_reason": "Adjusted threshold based on production data"
}
```

**Response (200 OK):**
```json
{
  "id": "db-uuid",
  "rule_id": "VEH-001",
  "version": 2,
  "previous_version_id": "old-db-uuid",
  "is_draft": true,
  "message": "New version created as draft"
}
```

---

#### DELETE /rules/{ruleId}

Delete a rule (soft delete - marks as deleted).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| force | boolean | false | Force delete even if active |

**Response (200 OK):**
```json
{
  "rule_id": "VEH-008",
  "deleted": true,
  "message": "Rule deleted successfully"
}
```

**Error (409 Conflict):**
```json
{
  "error": "conflict",
  "message": "Cannot delete active rule. Deactivate first or use force=true"
}
```

---

#### POST /rules/{ruleId}/activate

Activate a draft rule for production use.

**Request:**
```json
{
  "activation_note": "Approved by QA team after testing"
}
```

**Response (200 OK):**
```json
{
  "rule_id": "VEH-001",
  "is_active": true,
  "is_draft": false,
  "activated_at": "2026-01-01T10:30:00Z",
  "activated_by": "admin@aures.cz"
}
```

---

#### POST /rules/{ruleId}/deactivate

Deactivate a rule (remove from production).

**Request:**
```json
{
  "deactivation_reason": "Temporarily disabled for maintenance"
}
```

**Response (200 OK):**
```json
{
  "rule_id": "VEH-001",
  "is_active": false,
  "deactivated_at": "2026-01-01T11:00:00Z"
}
```

---

#### POST /rules/{ruleId}/test

Test a rule against sample data without saving results.

**Request:**
```json
{
  "test_data": {
    "vehicle": {
      "vin": "YV1PZA3TCL1103985",
      "spz": "1AB2345"
    },
    "ocr_orv": {
      "vin": "YV1PZA3TCL1103985",
      "registrationPlateNumber": "1AB2345"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "rule_id": "VEH-001",
  "test_result": {
    "result": "MATCH",
    "status": "GREEN",
    "source_value": "YV1PZA3TCL1103985",
    "target_value": "YV1PZA3TCL1103985",
    "normalized_source": "YV1PZA3TCL1103985",
    "normalized_target": "YV1PZA3TCL1103985"
  },
  "executed_at": "2026-01-01T10:30:00Z"
}
```

---

#### GET /rules/schema

Get JSON Schema for rule validation.

**Response (200 OK):**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SecureDealAI Validation Rule Schema",
  "version": "1.0.0",
  "...schema content..."
}
```

---

#### POST /rules/import

Bulk import rules from JSON.

**Request:**
```json
{
  "rules": [
    { "...rule1..." },
    { "...rule2..." }
  ],
  "options": {
    "skip_existing": true,
    "activate_on_import": false
  }
}
```

**Response (200 OK):**
```json
{
  "imported": 5,
  "skipped": 2,
  "errors": 0,
  "details": [
    { "rule_id": "VEH-001", "status": "skipped", "reason": "already_exists" },
    { "rule_id": "VEH-008", "status": "imported", "id": "db-uuid" }
  ]
}
```

---

#### GET /rules/export

Export all rules as JSON.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| active_only | boolean | false | Export only active rules |
| format | string | json | Export format (json, yaml) |

**Response (200 OK):**
```json
{
  "version": "1.0.0",
  "exported_at": "2026-01-01T10:30:00Z",
  "rules": [...]
}
```

---

### 3. Rule History (Admin Only)

#### GET /rules/{ruleId}/history

Get change history for a rule.

**Response (200 OK):**
```json
{
  "rule_id": "VEH-001",
  "history": [
    {
      "id": "history-uuid",
      "change_type": "ACTIVATE",
      "changed_by": "admin@aures.cz",
      "changed_at": "2026-01-01T10:05:00Z",
      "change_reason": "Initial activation"
    },
    {
      "id": "history-uuid-2",
      "change_type": "CREATE",
      "changed_by": "admin@aures.cz",
      "changed_at": "2026-01-01T10:00:00Z"
    }
  ]
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_PARAMETER` | 400 | Required parameter missing |
| `INVALID_RULE_ID` | 400 | Rule ID format invalid |
| `SCHEMA_VALIDATION_ERROR` | 400 | Rule doesn't match JSON schema |
| `RULE_NOT_FOUND` | 404 | Rule not found |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `CONFLICT` | 409 | Operation conflicts (e.g., delete active rule) |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /validate | 100/min per user |
| GET endpoints | 300/min per user |
| Admin endpoints | 60/min per user |

---

## Webhooks (Future)

Planned webhook events:
- `rule.created` - New rule created
- `rule.activated` - Rule activated
- `rule.deactivated` - Rule deactivated
- `validation.completed` - Validation run completed
- `validation.failed` - Validation run failed

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Execute validation
const { data, error } = await supabase.functions.invoke('validation-run', {
  body: { buying_opportunity_id: 'uuid-123' }
});

// Get active rules
const { data: rules } = await supabase
  .from('validation_rules')
  .select('*')
  .eq('is_active', true);
```

### cURL

```bash
# Execute validation
curl -X POST "https://[project].supabase.co/functions/v1/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"buying_opportunity_id": "uuid-123"}'

# List rules
curl "https://[project].supabase.co/functions/v1/rules?active_only=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Related Documents

- `VALIDATION_RULES_SCHEMA.json` - JSON Schema for rules
- `DB_SCHEMA_DYNAMIC_RULES.sql` - Database schema
- `VALIDATION_RULES_SEED.json` - Initial rules data
- `SESSION.md` - Project overview and handoff notes
