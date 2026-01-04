# Validation Rules Management - System Analysis

> **Document Purpose**: Comprehensive analysis of the validation rules system to support frontend rule editing implementation.
>
> **Date**: January 2026
> **Status**: Research Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Architecture](#database-architecture)
3. [Rule JSON Structure](#rule-json-structure)
4. [Available Transforms](#available-transforms)
5. [Available Comparators](#available-comparators)
6. [Validation Engine Logic](#validation-engine-logic)
7. [REST API Specification](#rest-api-specification)
8. [Current Rule Inventory](#current-rule-inventory)
9. [Frontend Implementation Requirements](#frontend-implementation-requirements)
10. [Security Considerations](#security-considerations)

---

## Executive Summary

The SecureDealAI validation system uses a **dynamic rules architecture** where rules are stored as JSON in PostgreSQL rather than hardcoded. This design enables non-developers to create, modify, and deploy validation rules without code changes.

### Current Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Database Schema | ✅ Complete | `supabase/migrations/001_initial_schema.sql` |
| Rule JSON Schema | ✅ Complete | `docs/architecture/VALIDATION_RULES_SCHEMA.json` |
| Validation Engine | ✅ Complete | `supabase/functions/validation-run/` |
| Transforms Library | ✅ Complete | `supabase/functions/validation-run/transforms.ts` |
| Comparators Library | ✅ Complete | `supabase/functions/validation-run/comparators.ts` |
| Rule Management API | 📄 Documented | `docs/architecture/RULE_MANAGEMENT_API.md` |
| API Edge Functions | ❌ Not Implemented | Needs development |
| Frontend Rule Editor | ❌ Not Implemented | Needs development |

### Key Design Decisions

1. **JSONB Storage**: Rules stored as flexible JSON, allowing schema evolution
2. **Versioning**: Built-in version control with `version` column and history table
3. **Draft/Active States**: Safe testing workflow before production deployment
4. **Audit Trail**: Automatic logging of all rule changes via database trigger
5. **Reproducibility**: Rules snapshot hash enables exact validation replay

---

## Database Architecture

### Core Tables

#### `validation_rules`

Primary storage for rule definitions.

```sql
CREATE TABLE validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(20) NOT NULL UNIQUE,        -- Human-readable: "VEH-001"
    rule_definition JSONB NOT NULL,              -- Complete rule as JSON
    is_active BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    schema_version VARCHAR(10) DEFAULT '1.1.0',
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    activated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ
);
```

#### `rule_change_history`

Automatic audit trail populated by database trigger.

```sql
CREATE TABLE rule_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES validation_rules(id),
    change_type VARCHAR(20),  -- CREATE, UPDATE, ACTIVATE, DEACTIVATE, DELETE
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT now(),
    before_state JSONB,       -- Previous rule_definition
    after_state JSONB,        -- New rule_definition
    change_reason TEXT
);
```

#### `validation_results`

Stores validation execution results.

```sql
CREATE TABLE validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID REFERENCES buying_opportunities(id),
    overall_status VARCHAR(10),           -- GREEN, ORANGE, RED
    field_validations JSONB,              -- Array of field-level results
    statistics JSONB,                     -- Counts: total, passed, failed, etc.
    rules_snapshot_hash VARCHAR(64),      -- For reproducibility
    attempt_number INTEGER DEFAULT 1,
    triggered_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    duration_ms INTEGER
);
```

#### `validation_audit_log`

Complete audit trail with input snapshots.

```sql
CREATE TABLE validation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_result_id UUID REFERENCES validation_results(id),
    input_snapshot JSONB,                 -- Exact input state for replay
    triggered_by UUID,
    trigger_source VARCHAR(50),           -- manual, automatic, api
    external_api_calls JSONB,             -- ARES, ADIS calls made
    cache_hits JSONB,                     -- What was served from cache
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Database Functions

```sql
-- Get all active rules ordered by priority
SELECT * FROM get_active_validation_rules();

-- Get rules filtered by context
SELECT * FROM get_active_validation_rules_filtered('PHYSICAL_PERSON', 'BRANCH');

-- Compute reproducible hash of current rules
SELECT compute_rules_snapshot_hash();
```

### Indexes

```sql
CREATE INDEX idx_rules_active ON validation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_rules_category ON validation_rules((rule_definition->>'metadata'->>'category'));
CREATE INDEX idx_rules_severity ON validation_rules((rule_definition->>'severity'));
```

---

## Rule JSON Structure

### Schema Version: 1.1.0

Full schema defined in `docs/architecture/VALIDATION_RULES_SCHEMA.json`.

### TypeScript Interface

```typescript
interface ValidationRule {
  // Identification
  id: string;                    // Pattern: ^[A-Z]{2,4}-[0-9]{3}$ (e.g., "VEH-001")
  name: string;                  // 3-100 characters
  description?: string;          // 0-500 characters
  enabled: boolean;              // Can disable without deletion

  // Data Sources
  source: DataSource;            // Where to get comparison value
  target: DataSource;            // What to compare against

  // Comparison Configuration
  comparison: ComparisonConfig;

  // Severity & Behavior
  severity: "CRITICAL" | "WARNING" | "INFO";
  blockOnFail?: boolean;         // Stop validation on failure

  // Conditional Execution
  conditions?: ConditionGroup;

  // Localized Messages
  errorMessage?: {
    cs: string;
    en: string;
    sk?: string;
    pl?: string;
  };

  // Metadata
  metadata: RuleMetadata;
}

interface DataSource {
  entity: EntityType;
  field: string;                 // Supports dot notation: "address.city"
  transforms?: TransformType[];  // Applied before comparison
}

type EntityType =
  | "vehicle"
  | "vendor"
  | "ocr_orv"
  | "ocr_op"
  | "ocr_vtp"
  | "ares"
  | "adis"
  | "cebia"
  | "dolozky";

interface ComparisonConfig {
  type: ComparisonType;
  caseSensitive?: boolean;       // Default: false
  threshold?: number;            // 0-1 for FUZZY (e.g., 0.8 = 80%)
  tolerance?: number;            // For NUMERIC/DATE_TOLERANCE
  toleranceType?: "absolute" | "percentage";
  pattern?: string;              // For REGEX
  allowedValues?: string[];      // For IN_LIST
}

type ComparisonType =
  | "EXACT"
  | "FUZZY"
  | "CONTAINS"
  | "REGEX"
  | "NUMERIC_TOLERANCE"
  | "DATE_TOLERANCE"
  | "EXISTS"
  | "NOT_EXISTS"
  | "IN_LIST";

interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Condition[];
}

interface Condition {
  field: string;                 // e.g., "vendor.vendor_type"
  operator: ConditionOperator;
  value: unknown;
}

type ConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "EXISTS"
  | "NOT_EXISTS"
  | "IN"
  | "NOT_IN"
  | "GREATER_THAN"
  | "LESS_THAN";

interface RuleMetadata {
  category?: "vehicle" | "vendor_fo" | "vendor_po" | "cross" | "external";
  phase?: "mvp" | "phase2" | "future";
  requiresDocuments?: number[];           // Doc Type IDs
  requiresDocumentGroup?: "VTP" | "ORV" | "OP";
  applicableTo?: ("PHYSICAL_PERSON" | "COMPANY")[];
  applicableToBuyingType?: ("BRANCH" | "MOBILE_BUYING")[];
  priority?: number;                      // 1-100 (lower = first)
  tags?: string[];
}
```

### Example Rule

```json
{
  "id": "VEH-001",
  "name": "VIN Match",
  "description": "Validates that VIN from manual entry matches OCR extraction from ORV document",
  "enabled": true,
  "source": {
    "entity": "vehicle",
    "field": "vin",
    "transforms": ["UPPERCASE", "TRIM", "VIN_NORMALIZE"]
  },
  "target": {
    "entity": "ocr_orv",
    "field": "vin",
    "transforms": ["UPPERCASE", "TRIM", "VIN_NORMALIZE"]
  },
  "comparison": {
    "type": "EXACT",
    "caseSensitive": false
  },
  "severity": "CRITICAL",
  "blockOnFail": true,
  "errorMessage": {
    "cs": "VIN vozidla nesouhlasí s údaji v ORV",
    "en": "Vehicle VIN does not match ORV document"
  },
  "metadata": {
    "category": "vehicle",
    "phase": "mvp",
    "requiresDocumentGroup": "ORV",
    "priority": 10,
    "tags": ["vehicle", "identity", "critical"]
  }
}
```

---

## Available Transforms

**Location**: `supabase/functions/validation-run/transforms.ts`

| Transform | Description | Example |
|-----------|-------------|---------|
| `UPPERCASE` | Convert to uppercase | "Hello" → "HELLO" |
| `LOWERCASE` | Convert to lowercase | "Hello" → "hello" |
| `TRIM` | Remove leading/trailing whitespace | "  abc  " → "abc" |
| `REMOVE_SPACES` | Remove all whitespace | "a b c" → "abc" |
| `REMOVE_DIACRITICS` | Remove Czech accents | "Příliš" → "Prilis" |
| `NORMALIZE_DATE` | Convert to YYYY-MM-DD | "15.03.2024" → "2024-03-15" |
| `EXTRACT_NUMBER` | Extract numeric value | "123 kg" → "123" |
| `FORMAT_RC` | Format Rodné číslo | "8001011234" → "800101/1234" |
| `FORMAT_ICO` | Format IČO (8 digits) | "12345678" → "12345678" |
| `FORMAT_DIC` | Format DIČ | "CZ12345678" → "CZ12345678" |
| `ADDRESS_NORMALIZE` | Standardize address | Removes extra spaces, normalizes street types |
| `NAME_NORMALIZE` | Standardize names | Removes titles (Ing., Mgr., etc.) |
| `VIN_NORMALIZE` | Normalize VIN | Removes spaces, validates length |
| `SPZ_NORMALIZE` | Normalize registration plate | "1A2 3456" → "1A23456" |

### Transform Chain

Transforms are applied in order:
```json
"transforms": ["TRIM", "UPPERCASE", "REMOVE_DIACRITICS"]
```
Input: "  Příliš  " → "PRILIS"

---

## Available Comparators

**Location**: `supabase/functions/validation-run/comparators.ts`

### EXACT

Exact string equality (case-insensitive by default).

```json
{
  "type": "EXACT",
  "caseSensitive": false
}
```

### FUZZY

Levenshtein distance with configurable similarity threshold.

```json
{
  "type": "FUZZY",
  "threshold": 0.8  // 80% similarity required
}
```

**Algorithm**: `similarity = 1 - (levenshtein_distance / max_length)`

### CONTAINS

Target string contains source value.

```json
{
  "type": "CONTAINS",
  "caseSensitive": false
}
```

### REGEX

Pattern matching with regular expression.

```json
{
  "type": "REGEX",
  "pattern": "^[0-9]{6}/[0-9]{3,4}$"  // Czech RČ format
}
```

### NUMERIC_TOLERANCE

Numeric value within tolerance range.

```json
{
  "type": "NUMERIC_TOLERANCE",
  "tolerance": 5,
  "toleranceType": "percentage"  // or "absolute"
}
```

### DATE_TOLERANCE

Date within specified number of days.

```json
{
  "type": "DATE_TOLERANCE",
  "tolerance": 7  // ±7 days
}
```

### EXISTS / NOT_EXISTS

Check for presence or absence of value.

```json
{
  "type": "EXISTS"  // Passes if value is not null/empty
}
```

### IN_LIST

Value must be in allowed list.

```json
{
  "type": "IN_LIST",
  "allowedValues": ["ACTIVE", "PENDING", "APPROVED"]
}
```

---

## Validation Engine Logic

**Location**: `supabase/functions/validation-run/engine.ts`

### Execution Flow

```
1. LOAD RULES
   ├── Fetch from validation_rules WHERE is_active = true
   ├── Sort by priority (lower = first)
   └── Cache for 5 minutes

2. FOR EACH RULE
   ├── Evaluate conditions (AND/OR logic)
   │   └── Skip if conditions not met → SKIPPED
   ├── Extract source value from input data
   ├── Extract target value from input data
   ├── Apply source transforms (in order)
   ├── Apply target transforms (in order)
   ├── Execute comparison algorithm
   └── Determine result: MATCH | MISMATCH | MISSING | ERROR

3. AGGREGATE RESULTS
   ├── Count: total, passed, failed, skipped
   ├── Track: critical_issues, warning_issues
   └── Compute overall status

4. STORE RESULT
   ├── Field-level results with similarity scores
   ├── Statistics summary
   ├── Rules snapshot hash
   └── Duration metrics
```

### Status Determination

```
IF any CRITICAL rule result = MISMATCH:
    → RED (blocking - requires vendor investigation)

ELSE IF any WARNING rule fails
     OR any CRITICAL rule result = MISSING:
    → ORANGE (requires manual review)

ELSE:
    → GREEN (approved for purchase)
```

### Rule Execution Results

| Result | Meaning |
|--------|---------|
| `MATCH` | Values match after comparison |
| `MISMATCH` | Values don't match (threshold not met) |
| `MISSING` | Source or target value is null/empty |
| `SKIPPED` | Conditions not met, rule not executed |
| `ERROR` | Exception during execution |

### Engine Configuration

```typescript
const config = {
  earlyStopOnCritical: true,    // Stop at first CRITICAL failure
  maxParallelRules: 5,          // Concurrent rule execution
  defaultLanguage: 'cs',        // Error message language
  enableCaching: true,          // Cache rule definitions
  cacheTTL: {
    rules: 300,                 // 5 minutes
    ocr: 604800,                // 7 days
    ares: 86400,                // 1 day
    adis: 86400                 // 1 day
  }
};
```

---

## REST API Specification

**Documentation**: `docs/architecture/RULE_MANAGEMENT_API.md`

### Validation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/validate` | Execute validation |
| `GET` | `/api/v1/validate/{id}` | Get result by ID |
| `GET` | `/api/v1/validate/spz/{spz}` | Latest result for vehicle |
| `GET` | `/api/v1/validate/spz/{spz}/history` | All results for vehicle |

### Rule Management Endpoints (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/rules` | List all rules |
| `GET` | `/api/v1/rules/{id}` | Get rule details |
| `POST` | `/api/v1/rules` | Create new rule (as draft) |
| `PUT` | `/api/v1/rules/{id}` | Update rule |
| `DELETE` | `/api/v1/rules/{id}` | Soft delete rule |
| `POST` | `/api/v1/rules/{id}/activate` | Activate draft rule |
| `POST` | `/api/v1/rules/{id}/deactivate` | Deactivate rule |
| `POST` | `/api/v1/rules/{id}/test` | Test rule with sample data |

### Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/rules/import` | Import rules from JSON |
| `GET` | `/api/v1/rules/export` | Export all rules |
| `GET` | `/api/v1/rules/schema` | Get JSON Schema |

### Query Parameters for List Endpoint

```
GET /api/v1/rules?
  active_only=true&
  category=vehicle&
  severity=CRITICAL&
  phase=mvp&
  include_drafts=false&
  page=1&
  limit=20
```

### Rate Limits

| Operation Type | Limit |
|---------------|-------|
| Validation | 100/min per user |
| Read | 300/min per user |
| Admin | 60/min per user |

---

## Current Rule Inventory

**Source**: `docs/architecture/VALIDATION_RULES_SEED.json`

### Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Rules** | 35 |
| **MVP (Enabled)** | 25 |
| **Phase 2 (Disabled)** | 10 |
| **CRITICAL Severity** | 21 |
| **WARNING Severity** | 13 |
| **INFO Severity** | 1 |

### Rules by Category

#### Vehicle Rules (VEH-001 to VEH-007)

| ID | Name | Severity | Comparison |
|----|------|----------|------------|
| VEH-001 | VIN Match | CRITICAL | EXACT |
| VEH-002 | SPZ Match | CRITICAL | EXACT |
| VEH-003 | Owner Name Match | CRITICAL | EXACT |
| VEH-004 | Brand Match | WARNING | FUZZY (0.8) |
| VEH-005 | Model Match | WARNING | FUZZY (0.7) |
| VEH-006 | First Registration Date | WARNING | EXACT |
| VEH-007 | Engine Power Match | WARNING | NUMERIC (5%) |

#### Vendor Individual Rules (VND-001 to VND-006)

| ID | Name | Severity | Comparison |
|----|------|----------|------------|
| VND-001 | Full Name Match | CRITICAL | EXACT |
| VND-002 | Personal ID Match | CRITICAL | EXACT |
| VND-003 | Street Address | WARNING | FUZZY (0.6) |
| VND-004 | City Match | WARNING | FUZZY (0.8) |
| VND-005 | Postal Code | WARNING | EXACT |
| VND-006 | Date of Birth | INFO | EXACT |

#### ARES Rules (ARES-001 to ARES-004)

| ID | Name | Severity | Comparison |
|----|------|----------|------------|
| ARES-001 | Company Existence | CRITICAL | EXISTS |
| ARES-002 | Company Name Match | WARNING | FUZZY (0.8) |
| ARES-003 | VAT ID Match | CRITICAL | EXACT |
| ARES-004 | Company Age Check | WARNING | NUMERIC |

#### DPH/VAT Rules (DPH-001 to DPH-003)

| ID | Name | Severity | Comparison |
|----|------|----------|------------|
| DPH-001 | VAT Payer Status | CRITICAL | EXISTS |
| DPH-002 | Unreliable VAT Payer | CRITICAL | NOT_EXISTS |
| DPH-003 | Bank Account Registration | WARNING | CONTAINS |

#### Cross-Validation Rules (XV-001)

| ID | Name | Severity | Comparison |
|----|------|----------|------------|
| XV-001 | Vehicle Owner = Vendor | CRITICAL | FUZZY (0.95) |

#### VTP Document Rules (VTP-001 to VTP-004)

| ID | Name | Severity | Comparison |
|----|------|----------|------------|
| VTP-001 | VTP SPZ Consistency | CRITICAL | EXACT |
| VTP-002 | VTP VIN Consistency | CRITICAL | EXACT |
| VTP-003 | VTP Owner IČO Match | CRITICAL | EXACT |
| VTP-004 | VTP Owner Name Match | WARNING | FUZZY (0.85) |

#### Phase 2 Rules (Disabled)

- **DOL-001 to DOL-003**: Doložky.cz integration (ID card validity)
- **CEB-001 to CEB-006**: CEBIA legal checks (execution, lien, stolen, insolvency)

---

## Frontend Implementation Requirements

### Implementation Gaps

| Component | Status | Priority |
|-----------|--------|----------|
| Rule Management Edge Functions | ❌ Missing | High |
| Rule List View | ❌ Missing | High |
| Rule Editor Form | ❌ Missing | High |
| Rule Test Panel | ❌ Missing | Medium |
| Version History View | ❌ Missing | Medium |
| Bulk Import/Export | ❌ Missing | Low |

### Recommended Frontend Components

#### 1. Rule List View

```
Features:
├── Table with sortable columns (ID, Name, Severity, Status, Category)
├── Filters: category, severity, status (active/draft/disabled)
├── Search by name/description
├── Quick actions: activate, deactivate, duplicate, delete
└── Pagination
```

#### 2. Rule Editor Form

```
Sections:
├── Basic Info (ID, name, description, enabled)
├── Source Configuration
│   ├── Entity selector (dropdown)
│   ├── Field path (autocomplete based on entity)
│   └── Transforms selector (multi-select)
├── Target Configuration (same as source)
├── Comparison Settings
│   ├── Type selector
│   └── Type-specific options (threshold, tolerance, pattern)
├── Severity & Behavior
├── Conditions Builder (optional)
│   ├── AND/OR toggle
│   └── Condition rows (field, operator, value)
├── Error Messages (localized)
└── Metadata
```

#### 3. Transform Picker

```
- Multi-select dropdown
- Drag-and-drop ordering
- Preview of transform chain result
```

#### 4. Comparator Config

```
Type-specific UI:
├── FUZZY: Slider for threshold (0-100%)
├── NUMERIC_TOLERANCE: Input + absolute/percentage toggle
├── DATE_TOLERANCE: Days input
├── REGEX: Pattern input with validation
└── IN_LIST: Tag input for allowed values
```

#### 5. Condition Builder

```
Visual builder:
├── AND/OR group toggle
├── Add condition button
├── Each condition: [field dropdown] [operator dropdown] [value input]
└── Nested groups support
```

#### 6. Rule Test Panel

```
Features:
├── Sample data input (JSON or form)
├── Execute test button
├── Show: source value, target value, transforms applied
├── Show: comparison result, similarity score
└── Pass/fail indicator
```

#### 7. Version History

```
Features:
├── Timeline of changes
├── Diff view (before/after)
├── Changed by, changed at
├── Restore to version button
```

---

## Security Considerations

### Row-Level Security (RLS)

| Table | Read | Write |
|-------|------|-------|
| `validation_rules` | All authenticated | Admin only |
| `validation_results` | All authenticated | Service role |
| `validation_audit_log` | Admin only | Authenticated |
| `rule_change_history` | Admin only | System trigger |

### API Authentication

- All rule management endpoints require JWT with `role: admin`
- Validation execution requires authenticated user
- Service role key for internal operations only

### Audit Requirements

- All rule changes automatically logged to `rule_change_history`
- Changed by user ID captured from JWT
- Before/after state preserved for rollback capability
- Change reason field for documentation

---

## Next Steps

1. **Implement Rule Management Edge Functions**
   - CRUD operations for rules
   - Activation/deactivation workflow
   - Test endpoint with sample data

2. **Build Frontend Rule List Component**
   - Integrate with API
   - Implement filters and search
   - Add quick actions

3. **Build Rule Editor Component**
   - Form validation against JSON Schema
   - Dynamic field options based on entity
   - Transform/comparator configuration

4. **Add Rule Testing Capability**
   - Sample data input
   - Real-time validation preview
   - Debug output for troubleshooting

5. **Implement Version History**
   - Timeline view
   - Diff comparison
   - Restore functionality
