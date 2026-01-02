/**
 * SecureDealAI MVP - Validation Engine
 * Core engine for executing dynamic validation rules
 */

import {
  ValidationRule,
  ValidationInputData,
  FieldValidationResult,
  ValidationResult,
  ValidationStatus,
  Severity,
  ConditionGroup,
  Condition,
  ConditionOperator,
  EngineConfig,
  DEFAULT_ENGINE_CONFIG,
  DataSource,
} from './types.ts';
import { applyTransforms } from './transforms.ts';
import { compare, ComparisonResult } from './comparators.ts';
import { loadActiveRules, getRulesSnapshotHash } from './rules-loader.ts';

// =============================================================================
// ENGINE STATE
// =============================================================================

interface EngineState {
  config: EngineConfig;
  inputData: ValidationInputData;
  results: FieldValidationResult[];
  startTime: number;
  criticalFailure: boolean;
}

// =============================================================================
// DATA EXTRACTION
// =============================================================================

/**
 * Extract value from input data using entity and field path
 */
function extractValue(
  data: ValidationInputData,
  source: DataSource
): unknown {
  const entityData = data[source.entity as keyof ValidationInputData];

  if (!entityData) {
    return null;
  }

  // Handle nested field paths (e.g., "address.city")
  const fieldPath = source.field.split('.');
  let value: unknown = entityData;

  for (const key of fieldPath) {
    if (value === null || value === undefined) {
      return null;
    }
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

/**
 * Extract and transform value from input data
 */
function extractAndTransform(
  data: ValidationInputData,
  source: DataSource
): string {
  const rawValue = extractValue(data, source);
  const transforms = source.transforms ?? [];

  return applyTransforms(rawValue, transforms);
}

// =============================================================================
// CONDITION EVALUATION
// =============================================================================

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: Condition,
  data: ValidationInputData
): boolean {
  // Parse field path: "vendor.vendor_type" or "ocr_op"
  const parts = condition.field.split('.');
  let value: unknown;

  if (parts.length === 1) {
    // Entity existence check (e.g., "ocr_op")
    value = data[parts[0] as keyof ValidationInputData];
  } else {
    // Nested field (e.g., "vendor.vendor_type")
    const entity = parts[0];
    const fieldPath = parts.slice(1).join('.');
    const entityData = data[entity as keyof ValidationInputData];

    if (!entityData) {
      value = null;
    } else {
      value = fieldPath.split('.').reduce((obj, key) => {
        return obj?.[key as keyof typeof obj];
      }, entityData as Record<string, unknown>);
    }
  }

  // Evaluate based on operator
  switch (condition.operator) {
    case 'EQUALS':
      return value === condition.value;

    case 'NOT_EQUALS':
      return value !== condition.value;

    case 'EXISTS':
      return value !== null && value !== undefined && value !== '';

    case 'NOT_EXISTS':
      return value === null || value === undefined || value === '';

    case 'IN':
      if (!Array.isArray(condition.value)) return false;
      return condition.value.includes(value);

    case 'NOT_IN':
      if (!Array.isArray(condition.value)) return true;
      return !condition.value.includes(value);

    case 'GREATER_THAN':
      if (typeof value !== 'number' || typeof condition.value !== 'number') return false;
      return value > condition.value;

    case 'LESS_THAN':
      if (typeof value !== 'number' || typeof condition.value !== 'number') return false;
      return value < condition.value;

    default:
      console.warn(`Unknown condition operator: ${condition.operator}`);
      return false;
  }
}

/**
 * Evaluate a condition group (AND/OR)
 */
function evaluateConditionGroup(
  group: ConditionGroup,
  data: ValidationInputData
): boolean {
  if (!group.conditions || group.conditions.length === 0) {
    return true;
  }

  const results = group.conditions.map(c => evaluateCondition(c, data));

  if (group.operator === 'OR') {
    return results.some(r => r);
  }

  // Default: AND
  return results.every(r => r);
}

// =============================================================================
// RULE EXECUTION
// =============================================================================

/**
 * Execute a single validation rule
 */
function executeRule(
  rule: ValidationRule,
  data: ValidationInputData
): FieldValidationResult {
  // Check conditions first
  if (rule.conditions) {
    const conditionsMet = evaluateConditionGroup(rule.conditions, data);
    if (!conditionsMet) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        field: rule.source.field,
        sourceValue: null,
        targetValue: null,
        normalizedSource: null,
        normalizedTarget: null,
        result: 'SKIPPED',
        severity: rule.severity,
        status: 'GREEN',
        message: 'Rule conditions not met',
      };
    }
  }

  // Extract and transform values
  const sourceValue = extractValue(data, rule.source);
  const targetValue = extractValue(data, rule.target);
  const normalizedSource = extractAndTransform(data, rule.source);
  const normalizedTarget = extractAndTransform(data, rule.target);

  // Check for missing target value
  if (normalizedTarget === '' || normalizedTarget === null) {
    const status = determineFieldStatus('MISSING', rule.severity);
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      field: rule.source.field,
      sourceValue: sourceValue as string | number | null,
      targetValue: targetValue as string | number | null,
      normalizedSource,
      normalizedTarget,
      result: 'MISSING',
      severity: rule.severity,
      status,
      message: `Target value missing from ${rule.target.entity}.${rule.target.field}`,
      errorMessage: rule.errorMessage,
    };
  }

  // Compare values
  const comparisonResult: ComparisonResult = compare(
    normalizedSource,
    normalizedTarget,
    rule.comparison
  );

  const result: ValidationResult = comparisonResult.isMatch ? 'MATCH' : 'MISMATCH';
  const status = determineFieldStatus(result, rule.severity);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    field: rule.source.field,
    sourceValue: sourceValue as string | number | null,
    targetValue: targetValue as string | number | null,
    normalizedSource,
    normalizedTarget,
    result,
    severity: rule.severity,
    status,
    similarity: comparisonResult.similarity,
    message: comparisonResult.details,
    errorMessage: result === 'MISMATCH' ? rule.errorMessage : undefined,
  };
}

// =============================================================================
// STATUS DETERMINATION
// =============================================================================

/**
 * Determine field status based on result and severity
 */
function determineFieldStatus(
  result: ValidationResult,
  severity: Severity
): ValidationStatus {
  if (result === 'MATCH' || result === 'SKIPPED') {
    return 'GREEN';
  }

  if (result === 'MISSING') {
    // MISSING on CRITICAL -> ORANGE (needs review)
    // MISSING on WARNING/INFO -> GREEN (acceptable)
    return severity === 'CRITICAL' ? 'ORANGE' : 'GREEN';
  }

  // MISMATCH
  if (severity === 'CRITICAL') {
    return 'RED';
  } else if (severity === 'WARNING') {
    return 'ORANGE';
  }

  return 'GREEN'; // INFO severity
}

/**
 * Determine overall status from all field validations
 */
function determineOverallStatus(
  results: FieldValidationResult[]
): ValidationStatus {
  // RED: Any CRITICAL MISMATCH
  const hasCriticalMismatch = results.some(
    r => r.severity === 'CRITICAL' && r.result === 'MISMATCH'
  );
  if (hasCriticalMismatch) {
    return 'RED';
  }

  // ORANGE: WARNING MISMATCH or CRITICAL MISSING
  const hasWarning = results.some(
    r =>
      (r.severity === 'WARNING' && r.result === 'MISMATCH') ||
      (r.severity === 'CRITICAL' && r.result === 'MISSING')
  );
  if (hasWarning) {
    return 'ORANGE';
  }

  // GREEN: All OK
  return 'GREEN';
}

// =============================================================================
// VALIDATION ENGINE
// =============================================================================

export interface ValidationEngineResult {
  overallStatus: ValidationStatus;
  fieldValidations: FieldValidationResult[];
  statistics: {
    totalRulesExecuted: number;
    rulesPassed: number;
    rulesFailed: number;
    rulesSkipped: number;
    criticalIssues: number;
    warningIssues: number;
  };
  rulesSnapshotHash: string;
  durationMs: number;
}

/**
 * Main validation engine class
 */
export class ValidationEngine {
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  /**
   * Execute all active validation rules against input data
   */
  async validate(inputData: ValidationInputData): Promise<ValidationEngineResult> {
    const startTime = performance.now();

    // Load active rules
    const rules = await loadActiveRules();
    const rulesSnapshotHash = await getRulesSnapshotHash();

    console.log(`[Engine] Executing ${rules.length} rules...`);

    // Execute rules
    const results: FieldValidationResult[] = [];
    let criticalFailure = false;

    for (const rule of rules) {
      // Early stop on critical failure if configured
      if (this.config.earlyStopOnCritical && criticalFailure) {
        console.log(`[Engine] Early stopping - critical failure detected`);
        break;
      }

      try {
        const result = executeRule(rule, inputData);
        results.push(result);

        // Check for critical failure
        if (result.result === 'MISMATCH' && result.severity === 'CRITICAL') {
          criticalFailure = true;
        }

        console.log(
          `[Engine] ${rule.id}: ${result.result} (${result.status})`
        );
      } catch (error) {
        console.error(`[Engine] Error executing rule ${rule.id}:`, error);

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          field: rule.source.field,
          sourceValue: null,
          targetValue: null,
          normalizedSource: null,
          normalizedTarget: null,
          result: 'ERROR',
          severity: rule.severity,
          status: rule.severity === 'CRITICAL' ? 'ORANGE' : 'GREEN',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Calculate statistics
    const statistics = {
      totalRulesExecuted: results.length,
      rulesPassed: results.filter(r => r.result === 'MATCH').length,
      rulesFailed: results.filter(r => r.result === 'MISMATCH').length,
      rulesSkipped: results.filter(r => r.result === 'SKIPPED').length,
      criticalIssues: results.filter(
        r => r.severity === 'CRITICAL' && r.result === 'MISMATCH'
      ).length,
      warningIssues: results.filter(
        r => r.severity === 'WARNING' && r.result === 'MISMATCH'
      ).length,
    };

    const overallStatus = determineOverallStatus(results);
    const durationMs = Math.round(performance.now() - startTime);

    console.log(
      `[Engine] Validation complete: ${overallStatus} (${durationMs}ms, ${statistics.rulesPassed}/${statistics.totalRulesExecuted} passed)`
    );

    return {
      overallStatus,
      fieldValidations: results,
      statistics,
      rulesSnapshotHash,
      durationMs,
    };
  }

  /**
   * Execute a single rule for testing
   */
  testRule(rule: ValidationRule, inputData: ValidationInputData): FieldValidationResult {
    return executeRule(rule, inputData);
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a new validation engine with default config
 */
export function createEngine(config?: Partial<EngineConfig>): ValidationEngine {
  return new ValidationEngine(config);
}

/**
 * Quick validation function
 */
export async function validate(
  inputData: ValidationInputData,
  config?: Partial<EngineConfig>
): Promise<ValidationEngineResult> {
  const engine = createEngine(config);
  return engine.validate(inputData);
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const _internal = {
  extractValue,
  extractAndTransform,
  evaluateCondition,
  evaluateConditionGroup,
  executeRule,
  determineFieldStatus,
  determineOverallStatus,
};
