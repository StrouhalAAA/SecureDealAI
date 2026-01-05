# SecureDealAI - Phase 6: Rules Management API Tracker

> **Version**: 1.0
> **Created**: 2026-01-05
> **Last Updated**: 2026-01-05
> **Status**: PENDING IMPLEMENTATION

---

## Overview

This document tracks the implementation progress of Phase 6: Rules Management API for SecureDealAI. This phase adds a comprehensive REST API for managing validation rules dynamically, plus Swagger UI documentation accessible from the main application.

**Purpose**: Enable administrators to create, update, activate, and manage validation rules through a secure API with full audit logging.

**Source Documentation**:
- `docs/Analysis/ValidationRulesManagement.md` - System analysis
- `docs/Analysis/RuleCRUDAPI-Implementation.md` - Implementation specification
- `docs/Analysis/ValidationRulesManagement/openapi-validation-rules.yaml` - OpenAPI 3.0.3 specification

---

## Progress Summary

| Phase | Total Tasks | Completed | In Progress | Pending |
|-------|-------------|-----------|-------------|---------|
| Phase 6: Rules API | 7 | 5 | 0 | 2 |

**Estimated Total Effort**: 14-18 hours

---

## Task Overview

| # | Task | Document | Status | Depends On | Est. Time |
|---|------|----------|--------|------------|-----------|
| 6.1 | Database Schema Verification | [06_01_DB_SCHEMA_VERIFICATION.md](./06_01_DB_SCHEMA_VERIFICATION.md) | [x] Complete | None | 1h |
| 6.2 | Rules Edge Function Core | [06_02_RULES_EDGE_FUNCTION_CORE.md](./06_02_RULES_EDGE_FUNCTION_CORE.md) | [x] Complete | 6.1 | 2h |
| 6.3 | Rules CRUD Handlers | [06_03_RULES_CRUD_HANDLERS.md](./06_03_RULES_CRUD_HANDLERS.md) | [x] Complete* | 6.2 | 3h |
| 6.4 | Rules Lifecycle Handlers | [06_04_RULES_LIFECYCLE_HANDLERS.md](./06_04_RULES_LIFECYCLE_HANDLERS.md) | [x] Complete | 6.2 | 2h |
| 6.5 | Rules Import/Export Handlers | [06_05_RULES_IMPORT_EXPORT.md](./06_05_RULES_IMPORT_EXPORT.md) | [x] Complete | 6.2 | 2h |
| 6.6 | Swagger UI Integration | [06_06_SWAGGER_UI_INTEGRATION.md](./06_06_SWAGGER_UI_INTEGRATION.md) | [x] Complete | 6.3, 6.4, 6.5 | 2h |
| 6.7 | Frontend Rules Management | [06_07_FRONTEND_RULES_MANAGEMENT.md](./06_07_FRONTEND_RULES_MANAGEMENT.md) | [x] Complete | 6.6 | 4h |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY GRAPH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│              ┌───────────┐                                       │
│              │   6.1     │                                       │
│              │   DB      │                                       │
│              │  Schema   │                                       │
│              └─────┬─────┘                                       │
│                    │                                             │
│                    ▼                                             │
│              ┌───────────┐                                       │
│              │   6.2     │                                       │
│              │   Core    │                                       │
│              │  Setup    │                                       │
│              └─────┬─────┘                                       │
│                    │                                             │
│        ┌──────────┼──────────┐                                   │
│        │          │          │                                   │
│        ▼          ▼          ▼                                   │
│   ┌───────┐  ┌───────┐  ┌───────┐                               │
│   │  6.3  │  │  6.4  │  │  6.5  │                               │
│   │ CRUD  │  │ Life  │  │Import │                               │
│   │       │  │ cycle │  │Export │                               │
│   └───┬───┘  └───┬───┘  └───┬───┘                               │
│       │          │          │                                    │
│       └──────────┼──────────┘                                    │
│                  │                                               │
│                  ▼                                               │
│            ┌───────────┐                                         │
│            │   6.6     │                                         │
│            │  Swagger  │                                         │
│            │    UI     │                                         │
│            └─────┬─────┘                                         │
│                  │                                               │
│                  ▼                                               │
│            ┌───────────┐                                         │
│            │   6.7     │                                         │
│            │ Frontend  │                                         │
│            │   Rules   │                                         │
│            └───────────┘                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Parallel Execution Possible:**
- **6.3**, **6.4**, and **6.5** can run in parallel (after 6.2 complete)

---

## Execution Order for Agents

### Sequential Execution (Safest)

```
1. Task 6.1 (DB Schema)       → Verify database structure
2. Task 6.2 (Core Setup)      → Edge Function foundation
3. Task 6.3 (CRUD Handlers)   → Basic CRUD operations
4. Task 6.4 (Lifecycle)       → Activate/deactivate/clone
5. Task 6.5 (Import/Export)   → Bulk operations
6. Task 6.6 (Swagger UI)      → API documentation page
7. Task 6.7 (Frontend)        → Rules management UI (optional)
```

### Parallel Execution (Faster)

```
Batch 1:
  - 6.1 Database Schema Verification

Batch 2 (After Batch 1):
  - 6.2 Rules Edge Function Core Setup

Batch 3 (After Batch 2, Parallel):
  - 6.3 Rules CRUD Handlers
  - 6.4 Rules Lifecycle Handlers
  - 6.5 Rules Import/Export Handlers

Batch 4 (After Batch 3):
  - 6.6 Swagger UI Integration

Batch 5 (After Batch 4):
  - 6.7 Frontend Rules Management (Optional)
```

---

## API Endpoints Summary

| Endpoint | Method | Handler | Task |
|----------|--------|---------|------|
| `/rules` | GET | listRules | 6.3 |
| `/rules/{rule_id}` | GET | getRule | 6.3 |
| `/rules` | POST | createRule | 6.3 |
| `/rules/{rule_id}` | PUT | updateRule | 6.3 |
| `/rules/{rule_id}` | DELETE | deleteRule | 6.3 |
| `/rules/{rule_id}/activate` | POST | activateRule | 6.4 |
| `/rules/{rule_id}/deactivate` | POST | deactivateRule | 6.4 |
| `/rules/{rule_id}/clone` | POST | cloneRule | 6.4 |
| `/rules/export` | GET | exportRules | 6.5 |
| `/rules/import` | POST | importRules | 6.5 |

---

## Files to Create

| File | Task | Purpose |
|------|------|---------|
| `supabase/functions/rules/index.ts` | 6.2 | Main router and CORS handling |
| `supabase/functions/rules/types.ts` | 6.2 | TypeScript interfaces |
| `supabase/functions/rules/validators.ts` | 6.2 | Input validation functions |
| `supabase/functions/rules/responses.ts` | 6.2 | Response helpers |
| `supabase/functions/rules/handlers.ts` | 6.3, 6.4, 6.5 | All handler implementations |
| `apps/web/src/pages/SwaggerUI.vue` | 6.6 | Swagger UI page component |
| `apps/web/public/openapi.yaml` | 6.6 | OpenAPI spec for Swagger |
| `apps/web/src/pages/RulesManagement.vue` | 6.7 | Rules management page |
| `apps/web/src/components/rules/RuleEditor.vue` | 6.7 | Rule editor component |
| `apps/web/src/components/rules/RuleList.vue` | 6.7 | Rules list component |

## Files to Modify

| File | Task | Changes |
|------|------|---------|
| `supabase/config.toml` | 6.2 | Add `[functions.rules]` config |
| `apps/web/src/router/index.ts` | 6.6, 6.7 | Add Swagger and Rules routes |
| `apps/web/src/components/layout/AppHeader.vue` | 6.6 | Add API Docs link |

---

## Environment Configuration

### Required Supabase Secrets

```bash
# Already configured in previous phases:
SUPABASE_SERVICE_ROLE_KEY  # For admin operations
JWT_SECRET                  # For authentication

# No new secrets needed for Phase 6
```

### Admin Role Verification

Rules API requires admin role. The JWT token must include:
```json
{
  "role": "authenticated",
  "is_admin": true  // Optional: For future admin-only restrictions
}
```

---

## Validation Rules Schema Reference

### Rule Definition Structure

```typescript
interface ValidationRule {
  rule_id: string;           // e.g., "VEH-001"
  rule_name: string;         // Human-readable name
  description?: string;      // Purpose description
  source_entity: string;     // "VEHICLE" | "VENDOR" | "TRANSACTION"
  source_field: string;      // e.g., "vin", "company_id"
  target_entity: string;     // "OCR" | "ARES" | "ADIS"
  target_field: string;      // e.g., "ocr_vin", "ares_ico"
  transform?: Transform[];   // Data normalization
  comparator: ComparatorType;
  comparator_params?: object;
  severity: "CRITICAL" | "WARNING" | "INFO";
  error_message: string;
  applies_to?: {
    vendor_type?: string[];  // "PHYSICAL_PERSON", "COMPANY"
    buying_type?: string[];  // "BRANCH", "MOBILE_BUYING"
  };
  enabled: boolean;
}
```

### Available Transforms

```
UPPERCASE, LOWERCASE, TRIM, REMOVE_SPACES, REMOVE_DIACRITICS,
NORMALIZE_DATE, EXTRACT_NUMBER, FORMAT_RC, FORMAT_ICO, FORMAT_DIC,
ADDRESS_NORMALIZE, NAME_NORMALIZE, VIN_NORMALIZE, SPZ_NORMALIZE
```

### Available Comparators

```
EXACT, FUZZY, CONTAINS, REGEX, NUMERIC_TOLERANCE, DATE_TOLERANCE,
EXISTS, NOT_EXISTS, IN_LIST
```

---

## Testing Strategy

### Unit Tests (per handler)

```bash
# Run from supabase/functions/rules directory
deno test --allow-env --allow-read handlers.test.ts
```

### Integration Tests

```bash
# Test against deployed function
curl -X GET "$SUPABASE_URL/functions/v1/rules" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### E2E Tests

```bash
# Frontend Swagger and Rules pages
cd apps/web
npx playwright test rules.spec.ts
```

---

## Changelog

### 2026-01-05: Task 6.5 Import/Export Handlers Complete

- Implemented `exportRules` handler with filtering options (status, source_entity, format)
- Implemented `importRules` handler with three conflict modes (skip, overwrite, error)
- Added auto-activate option for immediate rule activation on import
- Added duplicate detection within import payload
- Updated `conflict()` response helper to support optional details parameter
- Added `rules_count` field to `RulesExport` type
- All 10 test cases passing:
  - TC-6.5.1: Export active rules
  - TC-6.5.2: Export all rules
  - TC-6.5.3: Export filtered by entity
  - TC-6.5.4: Export minimal format
  - TC-6.5.5-9: Import with various modes
  - TC-6.5.10: Duplicate ID detection

### 2026-01-05: Task 6.3 CRUD Handlers Complete

- Implemented all 5 CRUD handlers (List, Get, Create, Update, Delete)
- Rewrote types.ts to match actual database schema (nested RuleDefinition)
- Rewrote validators.ts to validate nested structure
- All tests pass except TC-6.3.9 (Delete Draft Rule)
- **Known Issue**: DELETE fails due to FK constraint on `rule_change_history` table
  - Root cause: Trigger creates history records, FK prevents deletion
  - Recommended fix: `ALTER TABLE rule_change_history` to add `ON DELETE SET NULL`

### 2026-01-05: Phase 6 Plan Created

- Created tracker document
- Created 7 task documents (06_01 - 06_07)
- Defined dependency graph
- Established execution order for agents

---

## Agent Execution Notes

Each task document contains:
- **Objective**: What the task accomplishes
- **Prerequisites**: What must be done first
- **Implementation Steps**: Detailed code and commands
- **Test Cases**: How to verify the implementation
- **Validation Criteria**: Checklist for completion
- **Troubleshooting**: Common issues and solutions

**Critical Details for Agents:**

1. **Admin Auth**: All rules endpoints require authenticated admin role
2. **Audit Logging**: All modifications must log to `validation_audit_log`
3. **Version Control**: Rules use version field; updates increment version
4. **Draft Workflow**: New rules start as draft; must be activated explicitly
5. **Conflict Detection**: Check for existing active rule before activation
6. **Hash Computation**: Recalculate snapshot hash on any rule change
