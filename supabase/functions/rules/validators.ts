// supabase/functions/rules/validators.ts

import type {
  CreateRuleRequest,
  UpdateRuleRequest,
  RuleDefinition,
  TransformType,
  ComparatorType,
  SeverityType,
  EntityType,
  CategoryType,
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

const VALID_ENTITIES: EntityType[] = [
  'buying_opportunity', 'vehicle', 'vendor', 'ocr_orv', 'ocr_op',
  'ocr_vtp', 'ares', 'adis', 'cebia', 'dolozky'
];

const VALID_CATEGORIES: CategoryType[] = ['vehicle', 'vendor_fo', 'vendor_po', 'cross', 'external'];

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
 * Validate a DataSource object
 */
function validateDataSource(source: unknown, fieldPrefix: string, errors: ValidationError[]): void {
  if (!source || typeof source !== 'object') {
    errors.push({ field: fieldPrefix, message: `${fieldPrefix} must be an object with entity and field properties` });
    return;
  }

  const s = source as Record<string, unknown>;

  if (!s.entity) {
    errors.push({ field: `${fieldPrefix}.entity`, message: 'entity is required' });
  } else if (!VALID_ENTITIES.includes(s.entity as EntityType)) {
    errors.push({ field: `${fieldPrefix}.entity`, message: `entity must be one of: ${VALID_ENTITIES.join(', ')}` });
  }

  if (!s.field || typeof s.field !== 'string') {
    errors.push({ field: `${fieldPrefix}.field`, message: 'field is required and must be a string' });
  }

  if (s.transforms !== undefined) {
    if (!Array.isArray(s.transforms)) {
      errors.push({ field: `${fieldPrefix}.transforms`, message: 'transforms must be an array' });
    } else {
      s.transforms.forEach((t: unknown, i: number) => {
        if (typeof t !== 'string' || !VALID_TRANSFORMS.includes(t as TransformType)) {
          errors.push({ field: `${fieldPrefix}.transforms[${i}]`, message: `Invalid transform type: ${t}` });
        }
      });
    }
  }
}

/**
 * Validate comparison configuration
 */
function validateComparison(comparison: unknown, errors: ValidationError[]): void {
  if (!comparison || typeof comparison !== 'object') {
    errors.push({ field: 'comparison', message: 'comparison must be an object' });
    return;
  }

  const c = comparison as Record<string, unknown>;

  if (!c.type) {
    errors.push({ field: 'comparison.type', message: 'comparison type is required' });
  } else if (!VALID_COMPARATORS.includes(c.type as ComparatorType)) {
    errors.push({ field: 'comparison.type', message: `comparison type must be one of: ${VALID_COMPARATORS.join(', ')}` });
  }

  // Validate threshold for FUZZY
  if (c.type === 'FUZZY' && c.threshold !== undefined) {
    if (typeof c.threshold !== 'number' || c.threshold < 0 || c.threshold > 1) {
      errors.push({ field: 'comparison.threshold', message: 'threshold must be a number between 0 and 1' });
    }
  }

  // Validate tolerance for NUMERIC_TOLERANCE and DATE_TOLERANCE
  if ((c.type === 'NUMERIC_TOLERANCE' || c.type === 'DATE_TOLERANCE') && c.tolerance !== undefined) {
    if (typeof c.tolerance !== 'number') {
      errors.push({ field: 'comparison.tolerance', message: 'tolerance must be a number' });
    }
  }

  // Validate pattern for REGEX
  if (c.type === 'REGEX') {
    if (!c.pattern || typeof c.pattern !== 'string') {
      errors.push({ field: 'comparison.pattern', message: 'pattern is required for REGEX comparison' });
    } else {
      try {
        new RegExp(c.pattern);
      } catch {
        errors.push({ field: 'comparison.pattern', message: 'pattern must be a valid regular expression' });
      }
    }
  }

  // Validate allowedValues for IN_LIST
  if (c.type === 'IN_LIST') {
    if (!c.allowedValues || !Array.isArray(c.allowedValues)) {
      errors.push({ field: 'comparison.allowedValues', message: 'allowedValues array is required for IN_LIST comparison' });
    }
  }
}

/**
 * Validate rule definition
 */
function validateRuleDefinition(def: unknown, errors: ValidationError[]): void {
  if (!def || typeof def !== 'object') {
    errors.push({ field: 'rule_definition', message: 'rule_definition must be an object' });
    return;
  }

  const d = def as Record<string, unknown>;

  // Required: id
  if (!d.id) {
    errors.push({ field: 'rule_definition.id', message: 'id is required' });
  } else if (!validateRuleId(d.id as string)) {
    errors.push({ field: 'rule_definition.id', message: 'id must match format XXX-NNN (e.g., VEH-001)' });
  }

  // Required: name
  if (!d.name || typeof d.name !== 'string') {
    errors.push({ field: 'rule_definition.name', message: 'name is required and must be a string' });
  } else if (d.name.length < 3 || d.name.length > 100) {
    errors.push({ field: 'rule_definition.name', message: 'name must be between 3 and 100 characters' });
  }

  // Required: source
  validateDataSource(d.source, 'rule_definition.source', errors);

  // Required: target
  validateDataSource(d.target, 'rule_definition.target', errors);

  // Required: comparison
  validateComparison(d.comparison, errors);

  // Required: severity
  if (!d.severity) {
    errors.push({ field: 'rule_definition.severity', message: 'severity is required' });
  } else if (!VALID_SEVERITIES.includes(d.severity as SeverityType)) {
    errors.push({ field: 'rule_definition.severity', message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
  }

  // Optional: metadata validation
  if (d.metadata && typeof d.metadata === 'object') {
    const meta = d.metadata as Record<string, unknown>;

    if (meta.category !== undefined && !VALID_CATEGORIES.includes(meta.category as CategoryType)) {
      errors.push({ field: 'rule_definition.metadata.category', message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    if (meta.applicableTo !== undefined) {
      if (!Array.isArray(meta.applicableTo)) {
        errors.push({ field: 'rule_definition.metadata.applicableTo', message: 'applicableTo must be an array' });
      } else {
        const validVendorTypes = ['PHYSICAL_PERSON', 'COMPANY'];
        meta.applicableTo.forEach((vt: unknown) => {
          if (!validVendorTypes.includes(vt as string)) {
            errors.push({ field: 'rule_definition.metadata.applicableTo', message: `Invalid vendor type: ${vt}` });
          }
        });
      }
    }

    if (meta.applicableToBuyingType !== undefined) {
      if (!Array.isArray(meta.applicableToBuyingType)) {
        errors.push({ field: 'rule_definition.metadata.applicableToBuyingType', message: 'applicableToBuyingType must be an array' });
      } else {
        const validBuyingTypes = ['BRANCH', 'MOBILE_BUYING'];
        meta.applicableToBuyingType.forEach((bt: unknown) => {
          if (!validBuyingTypes.includes(bt as string)) {
            errors.push({ field: 'rule_definition.metadata.applicableToBuyingType', message: `Invalid buying type: ${bt}` });
          }
        });
      }
    }
  }
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

  if (!req.rule_definition) {
    errors.push({ field: 'rule_definition', message: 'rule_definition is required' });
    return { valid: false, errors };
  }

  validateRuleDefinition(req.rule_definition, errors);

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

  if (!req.rule_definition) {
    errors.push({ field: 'rule_definition', message: 'rule_definition is required' });
    return { valid: false, errors };
  }

  // For updates, we allow partial rule_definition
  // Validate only the fields that are provided
  const def = req.rule_definition as Record<string, unknown>;

  // If id is provided, validate format
  if (def.id !== undefined && !validateRuleId(def.id as string)) {
    errors.push({ field: 'rule_definition.id', message: 'id must match format XXX-NNN (e.g., VEH-001)' });
  }

  // If name is provided, validate length
  if (def.name !== undefined) {
    if (typeof def.name !== 'string' || def.name.length < 3 || def.name.length > 100) {
      errors.push({ field: 'rule_definition.name', message: 'name must be a string between 3 and 100 characters' });
    }
  }

  // If source is provided, validate it
  if (def.source !== undefined) {
    validateDataSource(def.source, 'rule_definition.source', errors);
  }

  // If target is provided, validate it
  if (def.target !== undefined) {
    validateDataSource(def.target, 'rule_definition.target', errors);
  }

  // If comparison is provided, validate it
  if (def.comparison !== undefined) {
    validateComparison(def.comparison, errors);
  }

  // If severity is provided, validate it
  if (def.severity !== undefined && !VALID_SEVERITIES.includes(def.severity as SeverityType)) {
    errors.push({ field: 'rule_definition.severity', message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
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

  // Validate each rule definition in the import
  importData.rules.forEach((rule, i) => {
    const ruleErrors: ValidationError[] = [];
    validateRuleDefinition(rule, ruleErrors);
    ruleErrors.forEach(err => {
      errors.push({ field: `rules[${i}].${err.field.replace('rule_definition.', '')}`, message: err.message });
    });
  });

  return { valid: errors.length === 0, errors };
}
