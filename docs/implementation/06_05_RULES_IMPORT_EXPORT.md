# Task 6.5: Rules Import/Export Handlers

> **Task ID**: 06_05
> **Status**: [x] Complete
> **Depends On**: 6.2 (Rules Edge Function Core)
> **Estimated Time**: 2 hours
> **Completed**: 2026-01-05

---

## Objective

Implement import and export handlers for bulk rule management. These handlers enable backup, migration, and bulk update of validation rules with proper validation and conflict handling.

---

## Prerequisites

- Task 6.2 completed (core function structure)
- Validators for import data in place
- Audit logging infrastructure working

---

## Handlers to Implement

| Handler | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| `exportRules` | GET | `/rules/export` | Export rules as JSON with optional filtering |
| `importRules` | POST | `/rules/import` | Import rules from JSON with conflict handling |

---

## Export Format

```json
{
  "version": "1.0",
  "exported_at": "2026-01-05T10:30:00Z",
  "exported_by": "user-id",
  "rules_count": 25,
  "filters_applied": {
    "status": "active",
    "source_entity": null
  },
  "rules": [
    {
      "rule_id": "VEH-001",
      "rule_name": "VIN Match Check",
      "description": "...",
      "source_entity": "VEHICLE",
      "source_field": "vin",
      "target_entity": "OCR",
      "target_field": "ocr_vin",
      "transform": [{"type": "VIN_NORMALIZE"}],
      "comparator": "EXACT",
      "comparator_params": null,
      "severity": "CRITICAL",
      "error_message": "VIN mismatch",
      "applies_to": null,
      "enabled": true
    }
  ]
}
```

---

## Import Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | string | `skip` | How to handle conflicts: `skip`, `overwrite`, `error` |
| `activate` | boolean | `false` | Auto-activate imported rules |

---

## Implementation Steps

### Step 1: Add Import/Export Handlers to handlers.ts

Add these functions to the existing handlers.ts file:

```typescript
// Add to supabase/functions/rules/handlers.ts

// ============================================================================
// EXPORT RULES
// ============================================================================

/**
 * Export rules as JSON
 *
 * Query Parameters:
 *   - status: 'active' | 'draft' | 'all' (default: 'active')
 *   - source_entity: filter by source entity
 *   - include_inactive: 'true' to include inactive rules
 *   - format: 'full' | 'minimal' (default: 'full')
 */
export async function exportRules(
  supabase: SupabaseClient,
  params: URLSearchParams,
  userId: string
): Promise<Response> {
  try {
    const status = params.get('status') || 'active';
    const sourceEntity = params.get('source_entity');
    const format = params.get('format') || 'full';

    // Build query
    let query = supabase
      .from('validation_rules')
      .select('*');

    // Status filter
    if (status === 'active') {
      query = query.eq('is_active', true).eq('is_draft', false);
    } else if (status === 'draft') {
      query = query.eq('is_draft', true);
    }
    // 'all' means no filter

    // Source entity filter
    if (sourceEntity) {
      query = query.eq('rule_definition->>source_entity', sourceEntity);
    }

    // Order by rule_id for consistent exports
    query = query.order('rule_id', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Export rules error:', error);
      return serverError();
    }

    // Transform to export format
    const rules = (data || []).map((row: ValidationRuleRow) => {
      const def = row.rule_definition;

      if (format === 'minimal') {
        return {
          rule_id: def.rule_id,
          rule_name: def.rule_name,
          source_entity: def.source_entity,
          source_field: def.source_field,
          target_entity: def.target_entity,
          target_field: def.target_field,
          comparator: def.comparator,
          severity: def.severity,
          enabled: def.enabled,
        };
      }

      // Full format
      return {
        rule_id: def.rule_id,
        rule_name: def.rule_name,
        description: def.description,
        source_entity: def.source_entity,
        source_field: def.source_field,
        target_entity: def.target_entity,
        target_field: def.target_field,
        transform: def.transform,
        comparator: def.comparator,
        comparator_params: def.comparator_params,
        severity: def.severity,
        error_message: def.error_message,
        applies_to: def.applies_to,
        enabled: def.enabled,
      };
    });

    const exportData: RulesExport = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      rules_count: rules.length,
      rules,
    };

    // Log audit
    await logAudit(
      supabase,
      'EXPORT',
      'bulk',
      userId,
      { count: rules.length, status, source_entity: sourceEntity },
      null,
      null
    );

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="validation-rules-${new Date().toISOString().slice(0, 10)}.json"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Export rules exception:', error);
    return serverError();
  }
}

// ============================================================================
// IMPORT RULES
// ============================================================================

interface ImportOptions {
  rules: RuleDefinition[];
  mode?: 'skip' | 'overwrite' | 'error';
  activate?: boolean;
}

/**
 * Import rules from JSON
 *
 * Request Body:
 *   - rules: array of rule definitions (required)
 *   - mode: 'skip' | 'overwrite' | 'error' (default: 'skip')
 *   - activate: boolean (default: false)
 *
 * Modes:
 *   - skip: Skip rules that already exist
 *   - overwrite: Update existing rules with imported data
 *   - error: Fail if any rule already exists
 */
export async function importRules(
  supabase: SupabaseClient,
  body: unknown,
  userId: string
): Promise<Response> {
  try {
    // Validate import data
    const validation = validateImportData(body);
    if (!validation.valid) {
      return badRequest('Validation failed', validation.errors);
    }

    const importData = body as ImportOptions;
    const mode = importData.mode || 'skip';
    const activate = importData.activate || false;
    const rules = importData.rules;

    // Check for duplicates within import
    const ruleIds = rules.map(r => r.rule_id);
    const duplicateIds = ruleIds.filter((id, i) => ruleIds.indexOf(id) !== i);
    if (duplicateIds.length > 0) {
      return badRequest('Duplicate rule IDs in import', { duplicates: [...new Set(duplicateIds)] });
    }

    // Get existing rules
    const { data: existingRules } = await supabase
      .from('validation_rules')
      .select('rule_id')
      .in('rule_id', ruleIds);

    const existingIds = new Set((existingRules || []).map(r => r.rule_id));

    // Handle based on mode
    if (mode === 'error' && existingIds.size > 0) {
      return conflict('Rules already exist', {
        existing_rule_ids: Array.from(existingIds),
      });
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // Process each rule
    for (const rule of rules) {
      try {
        const ruleDefinition: RuleDefinition = {
          rule_id: rule.rule_id,
          rule_name: rule.rule_name,
          description: rule.description,
          source_entity: rule.source_entity,
          source_field: rule.source_field,
          target_entity: rule.target_entity,
          target_field: rule.target_field,
          transform: rule.transform,
          comparator: rule.comparator,
          comparator_params: rule.comparator_params,
          severity: rule.severity,
          error_message: rule.error_message,
          applies_to: rule.applies_to,
          enabled: rule.enabled ?? true,
        };

        if (existingIds.has(rule.rule_id)) {
          if (mode === 'skip') {
            result.skipped++;
            continue;
          }

          // mode === 'overwrite'
          // Get existing rule to update
          const { data: existing } = await supabase
            .from('validation_rules')
            .select('*')
            .eq('rule_id', rule.rule_id)
            .order('version', { ascending: false })
            .limit(1)
            .single();

          if (existing) {
            const newVersion = existing.version + 1;

            await supabase
              .from('validation_rules')
              .update({
                rule_definition: ruleDefinition,
                version: newVersion,
                is_active: activate,
                is_draft: !activate,
                updated_by: userId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            await logRuleChange(
              supabase,
              rule.rule_id,
              'UPDATE',
              userId,
              existing.version,
              newVersion,
              existing.rule_definition,
              ruleDefinition,
              'Updated via import'
            );

            result.imported++;
          }
        } else {
          // New rule
          await supabase
            .from('validation_rules')
            .insert({
              rule_id: rule.rule_id,
              rule_definition: ruleDefinition,
              is_active: activate,
              is_draft: !activate,
              version: 1,
              created_by: userId,
              updated_by: userId,
            });

          await logRuleChange(
            supabase,
            rule.rule_id,
            'CREATE',
            userId,
            null,
            1,
            null,
            ruleDefinition,
            'Created via import'
          );

          result.imported++;
        }
      } catch (error) {
        console.error(`Import error for rule ${rule.rule_id}:`, error);
        result.errors.push({
          rule_id: rule.rule_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log audit
    await logAudit(
      supabase,
      'IMPORT',
      'bulk',
      userId,
      {
        total: rules.length,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        mode,
        activate,
      },
      null,
      null
    );

    // Recompute hash if any rules were activated
    if (activate && result.imported > 0) {
      await supabase.rpc('compute_rules_snapshot_hash');
    }

    return success({
      message: 'Import completed',
      result,
    });
  } catch (error) {
    console.error('Import rules exception:', error);
    return serverError();
  }
}
```

### Step 2: Update index.ts to Import and Use Import/Export Handlers

Add the handlers to the imports and switch statement:

```typescript
// In index.ts, update imports:
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  activateRule,
  deactivateRule,
  cloneRule,
  exportRules,
  importRules,
} from './handlers.ts';

// In the switch statement, update cases:
case 'export':
  if (method !== 'GET') {
    return methodNotAllowed(['GET']);
  }
  return exportRules(supabase, url.searchParams, user.id);

case 'import':
  if (method !== 'POST') {
    return methodNotAllowed(['POST']);
  }
  const importBody = await req.json();
  return importRules(supabase, importBody, user.id);
```

### Step 3: Deploy and Test

```bash
supabase functions deploy rules
```

---

## Test Cases

### TC-6.5.1: Export Active Rules

```bash
curl "$SUPABASE_URL/functions/v1/rules/export" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -o exported-rules.json
```

Expected: JSON file with active rules, `Content-Disposition` header

### TC-6.5.2: Export All Rules

```bash
curl "$SUPABASE_URL/functions/v1/rules/export?status=all" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: All rules including drafts and inactive

### TC-6.5.3: Export Filtered by Entity

```bash
curl "$SUPABASE_URL/functions/v1/rules/export?source_entity=VEHICLE" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: Only VEHICLE rules

### TC-6.5.4: Export Minimal Format

```bash
curl "$SUPABASE_URL/functions/v1/rules/export?format=minimal" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: Rules with fewer fields

### TC-6.5.5: Import New Rules (Skip Mode)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "skip",
    "rules": [
      {
        "rule_id": "IMP-001",
        "rule_name": "Imported Rule 1",
        "source_entity": "VEHICLE",
        "source_field": "vin",
        "target_entity": "OCR",
        "target_field": "ocr_vin",
        "comparator": "EXACT",
        "severity": "CRITICAL",
        "error_message": "Import test"
      },
      {
        "rule_id": "IMP-002",
        "rule_name": "Imported Rule 2",
        "source_entity": "VENDOR",
        "source_field": "company_id",
        "target_entity": "ARES",
        "target_field": "ares_ico",
        "comparator": "EXACT",
        "severity": "CRITICAL",
        "error_message": "Import test 2"
      }
    ]
  }'
```

Expected: `imported: 2, skipped: 0`

### TC-6.5.6: Import Existing Rules (Skip Mode)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "skip",
    "rules": [
      {
        "rule_id": "VEH-001",
        "rule_name": "Should be skipped",
        "source_entity": "VEHICLE",
        "source_field": "vin",
        "target_entity": "OCR",
        "target_field": "ocr_vin",
        "comparator": "EXACT",
        "severity": "CRITICAL",
        "error_message": "Skip test"
      }
    ]
  }'
```

Expected: `imported: 0, skipped: 1`

### TC-6.5.7: Import Existing Rules (Error Mode)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "error",
    "rules": [
      {
        "rule_id": "VEH-001",
        "rule_name": "Should fail",
        "source_entity": "VEHICLE",
        "source_field": "vin",
        "target_entity": "OCR",
        "target_field": "ocr_vin",
        "comparator": "EXACT",
        "severity": "CRITICAL",
        "error_message": "Error test"
      }
    ]
  }'
```

Expected: 409 Conflict with existing_rule_ids

### TC-6.5.8: Import Existing Rules (Overwrite Mode)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "overwrite",
    "rules": [
      {
        "rule_id": "IMP-001",
        "rule_name": "Updated Imported Rule",
        "source_entity": "VEHICLE",
        "source_field": "vin",
        "target_entity": "OCR",
        "target_field": "ocr_vin",
        "comparator": "FUZZY",
        "comparator_params": {"threshold": 90},
        "severity": "WARNING",
        "error_message": "Overwrite test"
      }
    ]
  }'
```

Expected: `imported: 1, skipped: 0`, version incremented

### TC-6.5.9: Import with Auto-Activate

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activate": true,
    "rules": [
      {
        "rule_id": "ACT-002",
        "rule_name": "Auto-activated Rule",
        "source_entity": "VEHICLE",
        "source_field": "spz",
        "target_entity": "OCR",
        "target_field": "ocr_spz",
        "comparator": "EXACT",
        "severity": "CRITICAL",
        "error_message": "Auto-activate test"
      }
    ]
  }'
```

Expected: Rule created with `is_active: true, is_draft: false`

### TC-6.5.10: Import with Duplicate IDs in Request

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "rule_id": "DUP-001",
        "rule_name": "Duplicate 1",
        "source_entity": "VEHICLE",
        "source_field": "vin",
        "target_entity": "OCR",
        "target_field": "ocr_vin",
        "comparator": "EXACT",
        "severity": "CRITICAL",
        "error_message": "Dup test 1"
      },
      {
        "rule_id": "DUP-001",
        "rule_name": "Duplicate 2",
        "source_entity": "VEHICLE",
        "source_field": "vin",
        "target_entity": "OCR",
        "target_field": "ocr_vin",
        "comparator": "EXACT",
        "severity": "CRITICAL",
        "error_message": "Dup test 2"
      }
    ]
  }'
```

Expected: 400 Bad Request with duplicate IDs

---

## Validation Criteria

- [ ] `exportRules` returns valid JSON with correct structure
- [ ] `exportRules` filters by status correctly
- [ ] `exportRules` filters by source_entity correctly
- [ ] `exportRules` supports minimal format
- [ ] `exportRules` includes Content-Disposition header
- [ ] `importRules` creates new rules correctly
- [ ] `importRules` skip mode works
- [ ] `importRules` error mode works
- [ ] `importRules` overwrite mode works
- [ ] `importRules` auto-activate works
- [ ] `importRules` detects duplicate IDs
- [ ] All operations log to audit tables

---

## Troubleshooting

### Issue: Export file doesn't download

**Solution**: Check Content-Disposition header is set correctly.

### Issue: Import validation fails

**Solution**: Ensure all required fields are present in each rule.

### Issue: Overwrite doesn't increment version

**Solution**: Verify version is read from existing rule and incremented.

---

## Completion Checklist

When this task is complete:
1. [x] Export handler implemented
2. [x] Import handler implemented with all modes
3. [x] Duplicate detection working
4. [x] Auto-activate option working
5. [x] Audit logging for all operations
6. [x] All test cases passing

**Status**: ✅ Complete (2026-01-05)
