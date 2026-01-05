# Task 6.4: Rules Lifecycle Handlers

> **Task ID**: 06_04
> **Status**: [ ] Pending
> **Depends On**: 6.2 (Rules Edge Function Core)
> **Estimated Time**: 2 hours

---

## Objective

Implement the lifecycle management handlers for validation rules: activate, deactivate, and clone operations. These handlers manage the rule state transitions with proper validation and audit logging.

---

## Prerequisites

- Task 6.2 completed (core function structure)
- Database schema supports `is_active` and `is_draft` flags
- Audit logging infrastructure in place

---

## Handlers to Implement

| Handler | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| `activateRule` | POST | `/rules/:rule_id/activate` | Activate a draft rule for production use |
| `deactivateRule` | POST | `/rules/:rule_id/deactivate` | Deactivate an active rule |
| `cloneRule` | POST | `/rules/:rule_id/clone` | Clone a rule with a new ID |

---

## State Diagram

```
                  ┌─────────────┐
                  │   CREATE    │
                  └──────┬──────┘
                         │
                         ▼
   ┌─────────────────────────────────────────┐
   │              DRAFT STATE                │
   │   is_draft = true, is_active = false    │
   └─────────────────┬───────────────────────┘
                     │
               ACTIVATE
                     │
                     ▼
   ┌─────────────────────────────────────────┐
   │             ACTIVE STATE                │
   │   is_draft = false, is_active = true    │
   └─────────────────┬───────────────────────┘
                     │
              DEACTIVATE
                     │
                     ▼
   ┌─────────────────────────────────────────┐
   │            INACTIVE STATE               │
   │   is_draft = false, is_active = false   │
   └─────────────────────────────────────────┘

   Note: CLONE creates a new rule in DRAFT state
```

---

## Implementation Steps

### Step 1: Add Lifecycle Handlers to handlers.ts

Add these functions to the existing handlers.ts file:

```typescript
// Add to supabase/functions/rules/handlers.ts

// ============================================================================
// ACTIVATE RULE
// ============================================================================

/**
 * Activate a rule for production use
 *
 * Rules:
 * - Only draft rules can be activated
 * - Already active rules return conflict
 * - Sets is_active=true, is_draft=false
 */
export async function activateRule(
  supabase: SupabaseClient,
  ruleId: string,
  userId: string
): Promise<Response> {
  try {
    // Get existing rule
    const { data: existing, error: fetchError } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('rule_id', ruleId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFound('Rule');
      }
      console.error('Fetch rule error:', fetchError);
      return serverError();
    }

    const existingRow = existing as ValidationRuleRow;

    // Check if already active
    if (existingRow.is_active && !existingRow.is_draft) {
      return conflict('Rule is already active');
    }

    // Check for conflicting active rule with same rule_id
    // (in case of versioning, there should only be one active per rule_id)
    const { data: activeConflict } = await supabase
      .from('validation_rules')
      .select('id')
      .eq('rule_id', ruleId)
      .eq('is_active', true)
      .neq('id', existingRow.id)
      .limit(1);

    if (activeConflict && activeConflict.length > 0) {
      // Deactivate the old active version first
      await supabase
        .from('validation_rules')
        .update({ is_active: false })
        .eq('id', activeConflict[0].id);
    }

    // Activate the rule
    const { data, error: updateError } = await supabase
      .from('validation_rules')
      .update({
        is_active: true,
        is_draft: false,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRow.id)
      .select()
      .single();

    if (updateError) {
      console.error('Activate rule error:', updateError);
      return serverError();
    }

    // Log audit
    await logAudit(
      supabase,
      'ACTIVATE',
      ruleId,
      userId,
      { is_active: { old: existingRow.is_active, new: true }, is_draft: { old: existingRow.is_draft, new: false } },
      { is_active: existingRow.is_active, is_draft: existingRow.is_draft },
      { is_active: true, is_draft: false }
    );

    await logRuleChange(
      supabase,
      ruleId,
      'ACTIVATE',
      userId,
      existingRow.version,
      existingRow.version,
      existingRow.rule_definition,
      existingRow.rule_definition,
      'Rule activated for production use'
    );

    // Recompute rules snapshot hash
    await supabase.rpc('compute_rules_snapshot_hash');

    return success({
      ...toRuleResponse(data),
      message: 'Rule activated successfully',
    });
  } catch (error) {
    console.error('Activate rule exception:', error);
    return serverError();
  }
}

// ============================================================================
// DEACTIVATE RULE
// ============================================================================

/**
 * Deactivate an active rule
 *
 * Rules:
 * - Only active rules can be deactivated
 * - Inactive rules return conflict
 * - Sets is_active=false (keeps is_draft=false)
 */
export async function deactivateRule(
  supabase: SupabaseClient,
  ruleId: string,
  userId: string
): Promise<Response> {
  try {
    // Get existing rule
    const { data: existing, error: fetchError } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('rule_id', ruleId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Check if rule exists but is already inactive
        const { data: inactiveRule } = await supabase
          .from('validation_rules')
          .select('id')
          .eq('rule_id', ruleId)
          .limit(1);

        if (inactiveRule && inactiveRule.length > 0) {
          return conflict('Rule is already inactive');
        }
        return notFound('Rule');
      }
      console.error('Fetch rule error:', fetchError);
      return serverError();
    }

    const existingRow = existing as ValidationRuleRow;

    // Deactivate the rule
    const { data, error: updateError } = await supabase
      .from('validation_rules')
      .update({
        is_active: false,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRow.id)
      .select()
      .single();

    if (updateError) {
      console.error('Deactivate rule error:', updateError);
      return serverError();
    }

    // Log audit
    await logAudit(
      supabase,
      'DEACTIVATE',
      ruleId,
      userId,
      { is_active: { old: true, new: false } },
      { is_active: true },
      { is_active: false }
    );

    await logRuleChange(
      supabase,
      ruleId,
      'DEACTIVATE',
      userId,
      existingRow.version,
      existingRow.version,
      existingRow.rule_definition,
      existingRow.rule_definition,
      'Rule deactivated'
    );

    // Recompute rules snapshot hash
    await supabase.rpc('compute_rules_snapshot_hash');

    return success({
      ...toRuleResponse(data),
      message: 'Rule deactivated successfully',
    });
  } catch (error) {
    console.error('Deactivate rule exception:', error);
    return serverError();
  }
}

// ============================================================================
// CLONE RULE
// ============================================================================

/**
 * Clone an existing rule with a new ID
 *
 * Rules:
 * - Creates a copy with new rule_id
 * - New rule is created as draft (is_draft=true, is_active=false)
 * - Version starts at 1
 * - Optionally update rule_name
 */
export async function cloneRule(
  supabase: SupabaseClient,
  ruleId: string,
  body: unknown,
  userId: string
): Promise<Response> {
  try {
    // Validate input
    const validation = validateCloneRule(body);
    if (!validation.valid) {
      return badRequest('Validation failed', validation.errors);
    }

    const req = body as CloneRuleRequest;

    // Get source rule
    const { data: sourceRule, error: fetchError } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('rule_id', ruleId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFound('Source rule');
      }
      console.error('Fetch source rule error:', fetchError);
      return serverError();
    }

    const sourceRow = sourceRule as ValidationRuleRow;

    // Check if new_rule_id already exists
    const { data: existing } = await supabase
      .from('validation_rules')
      .select('rule_id')
      .eq('rule_id', req.new_rule_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return conflict(`Rule with ID '${req.new_rule_id}' already exists`);
    }

    // Clone the rule definition
    const clonedDef: RuleDefinition = {
      ...sourceRow.rule_definition,
      rule_id: req.new_rule_id,
      rule_name: req.new_rule_name || `${sourceRow.rule_definition.rule_name} (Copy)`,
    };

    // Insert cloned rule
    const { data, error: insertError } = await supabase
      .from('validation_rules')
      .insert({
        rule_id: req.new_rule_id,
        rule_definition: clonedDef,
        is_active: false,
        is_draft: true,
        version: 1,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Clone rule error:', insertError);
      if (insertError.code === '23505') {
        return conflict(`Rule with ID '${req.new_rule_id}' already exists`);
      }
      return serverError();
    }

    // Log audit
    await logAudit(
      supabase,
      'CLONE',
      req.new_rule_id,
      userId,
      { source_rule_id: ruleId },
      sourceRow.rule_definition,
      clonedDef
    );

    await logRuleChange(
      supabase,
      req.new_rule_id,
      'CLONE',
      userId,
      null,
      1,
      null,
      clonedDef,
      `Cloned from ${ruleId}`
    );

    return created({
      ...toRuleResponse(data),
      message: `Rule cloned from ${ruleId}`,
      source_rule_id: ruleId,
    });
  } catch (error) {
    console.error('Clone rule exception:', error);
    return serverError();
  }
}
```

### Step 2: Update index.ts to Import and Use Lifecycle Handlers

Add the lifecycle handlers to the imports and switch statement:

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
} from './handlers.ts';

// In the switch statement, update cases:
case 'activate':
  if (method !== 'POST') {
    return methodNotAllowed(['POST']);
  }
  return activateRule(supabase, route.ruleId!, user.id);

case 'deactivate':
  if (method !== 'POST') {
    return methodNotAllowed(['POST']);
  }
  return deactivateRule(supabase, route.ruleId!, user.id);

case 'clone':
  if (method !== 'POST') {
    return methodNotAllowed(['POST']);
  }
  const cloneBody = await req.json();
  return cloneRule(supabase, route.ruleId!, cloneBody, user.id);
```

### Step 3: Deploy and Test

```bash
supabase functions deploy rules
```

---

## Test Cases

### TC-6.4.1: Activate Draft Rule

```bash
# First create a test rule
curl -X POST "$SUPABASE_URL/functions/v1/rules" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rule_id": "ACT-001",
    "rule_name": "Activation Test",
    "source_entity": "VEHICLE",
    "source_field": "vin",
    "target_entity": "OCR",
    "target_field": "ocr_vin",
    "comparator": "EXACT",
    "severity": "CRITICAL",
    "error_message": "Test error"
  }'

# Then activate it
curl -X POST "$SUPABASE_URL/functions/v1/rules/ACT-001/activate" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: 200 with `is_active: true`, `is_draft: false`

### TC-6.4.2: Activate Already Active Rule

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/ACT-001/activate" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: 409 Conflict "Rule is already active"

### TC-6.4.3: Activate Non-existent Rule

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/XXX-999/activate" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: 404 Not Found

### TC-6.4.4: Deactivate Active Rule

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/ACT-001/deactivate" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: 200 with `is_active: false`

### TC-6.4.5: Deactivate Inactive Rule

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/ACT-001/deactivate" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected: 409 Conflict "Rule is already inactive"

### TC-6.4.6: Clone Existing Rule

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/VEH-001/clone" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_rule_id": "VEH-099",
    "new_rule_name": "Cloned VIN Check"
  }'
```

Expected: 201 with new rule, `is_draft: true`, `is_active: false`, `version: 1`

### TC-6.4.7: Clone with Duplicate ID

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/VEH-001/clone" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_rule_id": "VEH-002"
  }'
```

Expected: 409 Conflict (VEH-002 already exists)

### TC-6.4.8: Clone Non-existent Rule

```bash
curl -X POST "$SUPABASE_URL/functions/v1/rules/XXX-999/clone" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_rule_id": "XXX-998"
  }'
```

Expected: 404 Not Found

### TC-6.4.9: Verify Snapshot Hash Updates

```sql
-- Run before and after activation/deactivation
SELECT compute_rules_snapshot_hash();
```

Expected: Hash changes after each activation/deactivation

---

## Validation Criteria

- [ ] `activateRule` sets `is_active=true`, `is_draft=false`
- [ ] `activateRule` rejects already active rules
- [ ] `activateRule` handles version conflicts
- [ ] `activateRule` triggers hash recomputation
- [ ] `deactivateRule` sets `is_active=false`
- [ ] `deactivateRule` rejects already inactive rules
- [ ] `deactivateRule` triggers hash recomputation
- [ ] `cloneRule` creates new rule with new ID
- [ ] `cloneRule` validates new_rule_id format
- [ ] `cloneRule` rejects duplicate IDs
- [ ] `cloneRule` preserves all rule properties
- [ ] All operations log to audit tables

---

## Troubleshooting

### Issue: Hash recomputation fails

**Solution**: Ensure `compute_rules_snapshot_hash()` function exists:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'compute_rules_snapshot_hash';
```

### Issue: Clone creates rule with wrong version

**Solution**: Verify the insert explicitly sets `version: 1`.

### Issue: Activate doesn't deactivate old version

**Solution**: Check the conflict detection query filters correctly.

---

## Completion Checklist

When this task is complete:
1. All 3 lifecycle handlers implemented
2. State transitions working correctly
3. Conflict detection working
4. Hash recomputation triggering
5. Audit logging for all operations
6. All test cases passing

**Mark as complete**: Update tracker status to `[x] Complete`
