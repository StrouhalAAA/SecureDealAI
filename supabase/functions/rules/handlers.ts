// supabase/functions/rules/handlers.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  success,
  created,
  noContent,
  badRequest,
  notFound,
  conflict,
  serverError,
} from './responses.ts';
import {
  validateCreateRule,
  validateUpdateRule,
  validateCloneRule,
  validateImportData,
} from './validators.ts';
import type {
  ValidationRuleRow,
  RuleDefinition,
  RuleListItem,
  RuleResponse,
  CreateRuleRequest,
  UpdateRuleRequest,
  CloneRuleRequest,
  PaginatedResponse,
  RulesExport,
  ImportResult,
} from './types.ts';

/**
 * Transform database row to list item response (summary view)
 */
function toListItem(row: ValidationRuleRow): RuleListItem {
  const def = row.rule_definition;
  return {
    id: row.id,
    rule_id: row.rule_id,
    name: def.name,
    description: def.description,
    severity: def.severity,
    category: def.metadata?.category,
    phase: def.metadata?.phase,
    enabled: def.enabled,
    is_active: row.is_active,
    is_draft: row.is_draft,
    version: row.version,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Transform database row to full rule response
 */
function toRuleResponse(row: ValidationRuleRow): RuleResponse {
  return {
    id: row.id,
    rule_id: row.rule_id,
    rule_definition: row.rule_definition,
    is_active: row.is_active,
    is_draft: row.is_draft,
    version: row.version,
    schema_version: row.schema_version,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    activated_by: row.activated_by,
    activated_at: row.activated_at,
  };
}

/**
 * Log action to audit log
 * Note: The validation_audit_log table is for validation runs, not rule management.
 * Rule changes are tracked in rule_change_history instead.
 * This function is kept for future extensibility but currently only logs to console.
 */
function logAudit(
  _supabase: SupabaseClient,
  action: string,
  entityId: string,
  userId: string,
  _changes?: Record<string, unknown>,
  _previousState?: unknown,
  _newState?: unknown
): void {
  // Note: validation_audit_log is designed for validation runs, not rule management
  // Rule changes are tracked via rule_change_history table
  console.log(`Audit: ${action} on ${entityId} by ${userId}`);
}

/**
 * Log to rule_change_history
 * Note: Table has columns: rule_id (UUID FK), rule_code, change_type, old_definition, new_definition, changed_by, changed_at, change_reason, metadata
 * Note: The database has a trigger that auto-logs CREATE/UPDATE changes.
 * For DELETE, the FK constraint would fail since the rule no longer exists.
 * This function handles this gracefully by silently failing on errors.
 */
async function logRuleChange(
  supabase: SupabaseClient,
  ruleUuid: string,
  ruleCode: string,
  changeType: string,
  userId: string,
  previousDef?: RuleDefinition | null,
  newDef?: RuleDefinition | null,
  changeReason?: string
): Promise<void> {
  // Skip DELETE logging - FK constraint fails for deleted records
  // The database trigger handles CREATE/UPDATE automatically
  if (changeType === 'DELETE') {
    console.log(`Rule ${ruleCode} deleted by ${userId}`);
    return;
  }

  try {
    const { error } = await supabase.from('rule_change_history').insert({
      rule_id: ruleUuid,
      rule_code: ruleCode,
      change_type: changeType,
      changed_by: userId,
      old_definition: previousDef,
      new_definition: newDef,
      change_reason: changeReason,
    });
    if (error) {
      console.error('Failed to log rule change:', error);
    }
  } catch (error) {
    console.error('Failed to log rule change (exception):', error);
    // Don't fail the main operation for logging failures
  }
}

// ============================================================================
// LIST RULES
// ============================================================================

/**
 * List all rules with optional filtering and pagination
 *
 * Query Parameters:
 *   - status: 'active' | 'draft' | 'all' (default: 'all')
 *   - category: 'vehicle' | 'vendor_fo' | 'vendor_po' | 'cross' | 'external'
 *   - severity: 'CRITICAL' | 'WARNING' | 'INFO'
 *   - phase: 'mvp' | 'phase2' | 'future'
 *   - page: number (default: 1)
 *   - limit: number (default: 50, max: 100)
 */
export async function listRules(
  supabase: SupabaseClient,
  params: URLSearchParams
): Promise<Response> {
  try {
    // Parse query parameters
    const status = params.get('status') || 'all';
    const category = params.get('category');
    const severity = params.get('severity');
    const phase = params.get('phase');
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('validation_rules')
      .select('*', { count: 'exact' });

    // Status filter
    if (status === 'active') {
      query = query.eq('is_active', true).eq('is_draft', false);
    } else if (status === 'draft') {
      query = query.eq('is_draft', true);
    }
    // 'all' means no filter

    // Category filter (using JSONB path)
    if (category) {
      query = query.eq('rule_definition->metadata->>category', category);
    }

    // Severity filter (using JSONB path)
    if (severity) {
      query = query.eq('rule_definition->>severity', severity);
    }

    // Phase filter (using JSONB path)
    if (phase) {
      query = query.eq('rule_definition->metadata->>phase', phase);
    }

    // Order and paginate
    query = query
      .order('rule_id', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('List rules error:', error);
      return serverError();
    }

    const rules = (data || []).map((row: ValidationRuleRow) => toListItem(row));
    const total = count || 0;

    const response: PaginatedResponse<RuleListItem> = {
      rules,
      total_count: total,
      page,
      limit,
    };

    return success(response);
  } catch (error) {
    console.error('List rules exception:', error);
    return serverError();
  }
}

// ============================================================================
// GET RULE
// ============================================================================

/**
 * Get a single rule by rule_id (full view with rule_definition)
 */
export async function getRule(
  supabase: SupabaseClient,
  ruleId: string
): Promise<Response> {
  try {
    // Query by rule_id (not UUID)
    const { data, error } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('rule_id', ruleId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFound('Rule');
      }
      console.error('Get rule error:', error);
      return serverError();
    }

    return success(toRuleResponse(data));
  } catch (error) {
    console.error('Get rule exception:', error);
    return serverError();
  }
}

// ============================================================================
// CREATE RULE
// ============================================================================

/**
 * Create a new validation rule
 * New rules are created as drafts (is_draft = true, is_active = false)
 */
export async function createRule(
  supabase: SupabaseClient,
  body: unknown,
  userId: string
): Promise<Response> {
  try {
    // Validate input
    const validation = validateCreateRule(body);
    if (!validation.valid) {
      return badRequest('Validation failed', validation.errors);
    }

    const req = body as CreateRuleRequest;
    const ruleDef = req.rule_definition;

    // Check if rule_id already exists
    const { data: existing } = await supabase
      .from('validation_rules')
      .select('rule_id')
      .eq('rule_id', ruleDef.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return conflict(`Rule with ID '${ruleDef.id}' already exists`);
    }

    // Ensure enabled is set
    const ruleDefinition: RuleDefinition = {
      ...ruleDef,
      enabled: ruleDef.enabled ?? true,
    };

    // Insert new rule
    const { data, error } = await supabase
      .from('validation_rules')
      .insert({
        rule_id: ruleDef.id,
        rule_definition: ruleDefinition,
        is_active: false,
        is_draft: true,
        version: 1,
        schema_version: '1.2',
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Create rule error:', error);
      if (error.code === '23505') {
        return conflict(`Rule with ID '${ruleDef.id}' already exists`);
      }
      return serverError();
    }

    // Log audit
    await logAudit(supabase, 'CREATE', ruleDef.id, userId, null, null, ruleDefinition);
    await logRuleChange(supabase, data.id, ruleDef.id, 'CREATE', userId, null, ruleDefinition, 'Rule created');

    // Return response matching API spec
    return created({
      id: data.id,
      rule_id: data.rule_id,
      is_draft: data.is_draft,
      is_active: data.is_active,
      version: data.version,
      message: 'Rule created as draft. Use /rules/{id}/activate to activate.',
    });
  } catch (error) {
    console.error('Create rule exception:', error);
    return serverError();
  }
}

// ============================================================================
// UPDATE RULE
// ============================================================================

/**
 * Update an existing rule
 * Updates increment the version number
 */
export async function updateRule(
  supabase: SupabaseClient,
  ruleId: string,
  body: unknown,
  userId: string
): Promise<Response> {
  try {
    // Validate input
    const validation = validateUpdateRule(body);
    if (!validation.valid) {
      return badRequest('Validation failed', validation.errors);
    }

    const req = body as UpdateRuleRequest;

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
    const existingDef = existingRow.rule_definition;

    // Deep merge the rule definition
    const updatedDef: RuleDefinition = {
      ...existingDef,
      ...req.rule_definition,
      // Handle nested objects carefully
      source: req.rule_definition?.source ?? existingDef.source,
      target: req.rule_definition?.target ?? existingDef.target,
      comparison: req.rule_definition?.comparison ?? existingDef.comparison,
      metadata: req.rule_definition?.metadata !== undefined
        ? { ...existingDef.metadata, ...req.rule_definition.metadata }
        : existingDef.metadata,
      errorMessage: req.rule_definition?.errorMessage !== undefined
        ? req.rule_definition.errorMessage
        : existingDef.errorMessage,
    };

    const newVersion = existingRow.version + 1;

    // Update the rule (mark as draft if it was active)
    const { data, error: updateError } = await supabase
      .from('validation_rules')
      .update({
        rule_definition: updatedDef,
        version: newVersion,
        is_draft: true,  // Updated rules become drafts
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRow.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update rule error:', updateError);
      return serverError();
    }

    // Calculate change summary
    const changedFields = Object.keys(req.rule_definition || {});

    // Log audit
    await logAudit(supabase, 'UPDATE', ruleId, userId, null, existingDef, updatedDef);
    await logRuleChange(
      supabase,
      data.id,
      ruleId,
      'UPDATE',
      userId,
      existingDef,
      updatedDef,
      `Updated: ${changedFields.join(', ')}`
    );

    // Return response matching API spec
    return success({
      id: data.id,
      rule_id: data.rule_id,
      version: data.version,
      previous_version_id: existingRow.id,
      is_draft: data.is_draft,
      message: 'New version created as draft',
    });
  } catch (error) {
    console.error('Update rule exception:', error);
    return serverError();
  }
}

// ============================================================================
// DELETE RULE
// ============================================================================

/**
 * Delete a validation rule
 * Only draft/inactive rules can be deleted
 * Active rules must be deactivated first
 */
export async function deleteRule(
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

    // Prevent deleting active rules
    if (existingRow.is_active) {
      return conflict('Cannot delete active rule. Deactivate first or use force=true');
    }

    // Delete the rule
    // Note: The database has a trigger that logs to rule_change_history, which has a FK constraint.
    // This can cause DELETE to fail if the trigger fires before the constraint is removed.
    const { error: deleteError } = await supabase
      .from('validation_rules')
      .delete()
      .eq('id', existingRow.id);

    if (deleteError) {
      console.error('Delete rule error:', deleteError);
      // Check for FK constraint error (common with rule_change_history)
      if (deleteError.code === '23503') {
        return conflict('Cannot delete rule - it has associated history records. Database migration may be needed.');
      }
      return serverError();
    }

    // Log audit
    await logAudit(supabase, 'DELETE', ruleId, userId, null, existingRow.rule_definition, null);
    await logRuleChange(
      supabase,
      existingRow.id,
      ruleId,
      'DELETE',
      userId,
      existingRow.rule_definition,
      null,
      'Rule deleted'
    );

    // Return response matching API spec
    return success({
      rule_id: ruleId,
      deleted: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    console.error('Delete rule exception:', error);
    return serverError();
  }
}

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
 * - Records activated_by and activated_at
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
        .update({ is_active: false, deactivated_by: userId, deactivated_at: new Date().toISOString() })
        .eq('id', activeConflict[0].id);
    }

    // Activate the rule
    const { data, error: updateError } = await supabase
      .from('validation_rules')
      .update({
        is_active: true,
        is_draft: false,
        activated_by: userId,
        activated_at: new Date().toISOString(),
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
    logAudit(
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
      existingRow.id,
      ruleId,
      'ACTIVATE',
      userId,
      existingRow.rule_definition,
      existingRow.rule_definition,
      'Rule activated for production use'
    );

    // Recompute rules snapshot hash (if function exists)
    try {
      await supabase.rpc('compute_rules_snapshot_hash');
    } catch {
      // Hash recomputation is optional, don't fail if not available
      console.log('compute_rules_snapshot_hash not available, skipping');
    }

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
 * - Records deactivated_by and deactivated_at
 */
export async function deactivateRule(
  supabase: SupabaseClient,
  ruleId: string,
  userId: string
): Promise<Response> {
  try {
    // Get existing rule - look for active version
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
        deactivated_by: userId,
        deactivated_at: new Date().toISOString(),
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
    logAudit(
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
      existingRow.id,
      ruleId,
      'DEACTIVATE',
      userId,
      existingRow.rule_definition,
      existingRow.rule_definition,
      'Rule deactivated'
    );

    // Recompute rules snapshot hash (if function exists)
    try {
      await supabase.rpc('compute_rules_snapshot_hash');
    } catch {
      // Hash recomputation is optional, don't fail if not available
      console.log('compute_rules_snapshot_hash not available, skipping');
    }

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
 * - Optionally update rule name
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
      id: req.new_rule_id,
      name: req.new_rule_name || `${sourceRow.rule_definition.name} (Copy)`,
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
        schema_version: sourceRow.schema_version || '1.2',
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
    logAudit(
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
      data.id,
      req.new_rule_id,
      'CLONE',
      userId,
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

// ============================================================================
// EXPORT RULES
// ============================================================================

/**
 * Export rules as JSON
 *
 * Query Parameters:
 *   - status: 'active' | 'draft' | 'all' (default: 'active')
 *   - source_entity: filter by source entity
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

    // Source entity filter (using JSONB path for nested structure)
    if (sourceEntity) {
      query = query.eq('rule_definition->source->>entity', sourceEntity);
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
          id: def.id,
          name: def.name,
          source: {
            entity: def.source.entity,
            field: def.source.field,
          },
          target: {
            entity: def.target.entity,
            field: def.target.field,
          },
          comparison: {
            type: def.comparison.type,
          },
          severity: def.severity,
          enabled: def.enabled,
        };
      }

      // Full format - return the complete rule definition
      return def;
    });

    const exportData: RulesExport = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      rules_count: rules.length,
      rules,
    };

    // Log audit
    logAudit(
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
    const ruleIds = rules.map(r => r.id);
    const duplicateIds = ruleIds.filter((id, i) => ruleIds.indexOf(id) !== i);
    if (duplicateIds.length > 0) {
      return badRequest('Duplicate rule IDs in import', { duplicates: [...new Set(duplicateIds)] });
    }

    // Get existing rules
    const { data: existingRules } = await supabase
      .from('validation_rules')
      .select('id, rule_id, version, rule_definition')
      .in('rule_id', ruleIds);

    const existingMap = new Map(
      (existingRules || []).map(r => [r.rule_id, r])
    );

    // Handle based on mode - check conflicts upfront
    if (mode === 'error' && existingMap.size > 0) {
      return conflict('Rules already exist', {
        existing_rule_ids: Array.from(existingMap.keys()),
      });
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    // Process each rule
    for (const rule of rules) {
      try {
        // Ensure enabled is set
        const ruleDefinition: RuleDefinition = {
          ...rule,
          enabled: rule.enabled ?? true,
        };

        const existing = existingMap.get(rule.id);

        if (existing) {
          if (mode === 'skip') {
            result.skipped++;
            result.details.push({
              rule_id: rule.id,
              status: 'skipped',
              reason: 'Rule already exists',
            });
            continue;
          }

          // mode === 'overwrite'
          const newVersion = existing.version + 1;

          const { data: updated, error: updateError } = await supabase
            .from('validation_rules')
            .update({
              rule_definition: ruleDefinition,
              version: newVersion,
              is_active: activate,
              is_draft: !activate,
              updated_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) {
            console.error(`Update error for rule ${rule.id}:`, updateError);
            result.errors++;
            result.details.push({
              rule_id: rule.id,
              status: 'error',
              error: updateError.message,
            });
            continue;
          }

          await logRuleChange(
            supabase,
            existing.id,
            rule.id,
            'UPDATE',
            userId,
            existing.rule_definition,
            ruleDefinition,
            'Updated via import'
          );

          result.imported++;
          result.details.push({
            rule_id: rule.id,
            status: 'imported',
            id: updated.id,
          });
        } else {
          // New rule
          const { data: inserted, error: insertError } = await supabase
            .from('validation_rules')
            .insert({
              rule_id: rule.id,
              rule_definition: ruleDefinition,
              is_active: activate,
              is_draft: !activate,
              version: 1,
              schema_version: '1.2',
              created_by: userId,
              updated_by: userId,
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Insert error for rule ${rule.id}:`, insertError);
            result.errors++;
            result.details.push({
              rule_id: rule.id,
              status: 'error',
              error: insertError.message,
            });
            continue;
          }

          await logRuleChange(
            supabase,
            inserted.id,
            rule.id,
            'CREATE',
            userId,
            null,
            ruleDefinition,
            'Created via import'
          );

          result.imported++;
          result.details.push({
            rule_id: rule.id,
            status: 'imported',
            id: inserted.id,
          });
        }
      } catch (error) {
        console.error(`Import error for rule ${rule.id}:`, error);
        result.errors++;
        result.details.push({
          rule_id: rule.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log audit
    logAudit(
      supabase,
      'IMPORT',
      'bulk',
      userId,
      {
        total: rules.length,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        mode,
        activate,
      },
      null,
      null
    );

    // Recompute hash if any rules were activated
    if (activate && result.imported > 0) {
      try {
        await supabase.rpc('compute_rules_snapshot_hash');
      } catch {
        // Hash recomputation is optional, don't fail if not available
        console.log('compute_rules_snapshot_hash not available, skipping');
      }
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
