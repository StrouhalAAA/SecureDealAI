// supabase/functions/rules/types.ts

/**
 * Transform types for data normalization
 * Must match VALIDATION_RULES_SCHEMA.json definitions
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
 * Source/Target entity types (from VALIDATION_RULES_SCHEMA.json)
 */
export type EntityType =
  | 'buying_opportunity'
  | 'vehicle'
  | 'vendor'
  | 'ocr_orv'
  | 'ocr_op'
  | 'ocr_vtp'
  | 'ares'
  | 'adis'
  | 'cebia'
  | 'dolozky';

/**
 * Vendor type filter
 */
export type VendorType = 'PHYSICAL_PERSON' | 'COMPANY';

/**
 * Buying type filter
 */
export type BuyingType = 'BRANCH' | 'MOBILE_BUYING';

/**
 * Category types for rules
 */
export type CategoryType = 'vehicle' | 'vendor_fo' | 'vendor_po' | 'cross' | 'external';

/**
 * Phase types for implementation
 */
export type PhaseType = 'mvp' | 'phase2' | 'future';

/**
 * Data source definition (source/target in rule_definition)
 */
export interface DataSource {
  entity: EntityType;
  field: string;
  transforms?: TransformType[];
}

/**
 * Comparison configuration
 */
export interface ComparisonConfig {
  type: ComparatorType;
  caseSensitive?: boolean;
  threshold?: number;          // For FUZZY (0.0-1.0)
  tolerance?: number;          // For NUMERIC_TOLERANCE or DATE_TOLERANCE
  toleranceType?: 'absolute' | 'percentage';
  pattern?: string;            // For REGEX
  allowedValues?: string[];    // For IN_LIST
}

/**
 * Localized message (cs/en required)
 */
export interface LocalizedMessage {
  cs: string;
  en: string;
  sk?: string;
  pl?: string;
}

/**
 * Condition for conditional rule application
 */
export interface Condition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'EXISTS' | 'NOT_EXISTS' | 'IN' | 'NOT_IN' | 'GREATER_THAN' | 'LESS_THAN';
  value: unknown;
}

/**
 * Condition group for combining conditions
 */
export interface ConditionGroup {
  operator?: 'AND' | 'OR';
  conditions: Condition[];
}

/**
 * Metadata for the rule
 */
export interface RuleMetadata {
  category?: CategoryType;
  phase?: PhaseType;
  requiresDocument?: 'ORV' | 'OP' | 'VTP' | null;
  requiresDocuments?: number[];
  requiresDocumentGroup?: 'VTP' | 'ORV' | 'OP';
  applicableTo?: VendorType[];
  applicableToBuyingType?: BuyingType[];
  priority?: number;
  tags?: string[];
}

/**
 * Complete rule definition stored in rule_definition JSONB
 * Matches VALIDATION_RULES_SCHEMA.json
 */
export interface RuleDefinition {
  id: string;                     // Rule ID (e.g., VEH-001)
  name: string;                   // Human-readable name
  description?: string;
  enabled: boolean;
  source: DataSource;
  target: DataSource;
  comparison: ComparisonConfig;
  severity: SeverityType;
  blockOnFail?: boolean;
  conditions?: ConditionGroup;
  errorMessage?: LocalizedMessage;
  metadata?: RuleMetadata;
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
  schema_version?: string;
  previous_version_id?: string;
  created_at: string;
  updated_at: string | null;
  created_by?: string;
  updated_by?: string | null;
  activated_by?: string | null;
  activated_at?: string | null;
  deactivated_by?: string | null;
  deactivated_at?: string | null;
}

/**
 * Transform item for list view
 */
export interface TransformItem {
  type: string;
  params?: Record<string, unknown>;
}

/**
 * API response for listing rules (summary view)
 * Includes flattened fields from rule_definition for table display
 */
export interface RuleListItem {
  id: string;
  rule_id: string;
  rule_name: string;        // Renamed from 'name' to match frontend expectation
  description?: string;
  severity: SeverityType;
  category?: CategoryType;
  phase?: PhaseType;
  enabled: boolean;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  created_at: string;
  updated_at: string | null;
  // Flattened fields for table display
  source_entity: string;
  source_field: string;
  target_entity: string;
  target_field: string;
  comparator: string;
  comparator_params?: Record<string, unknown>;
  transform?: TransformItem[];
  error_message?: string;
}

/**
 * API response for single rule (full view)
 */
export interface RuleResponse {
  id: string;
  rule_id: string;
  rule_definition: RuleDefinition;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  schema_version?: string;
  created_by?: string;
  created_at: string;
  updated_by?: string | null;
  updated_at: string | null;
  activated_by?: string | null;
  activated_at?: string | null;
}

/**
 * Request body for creating a rule
 * Accepts the rule_definition as per API spec
 */
export interface CreateRuleRequest {
  rule_definition: RuleDefinition;
}

/**
 * Request body for updating a rule
 */
export interface UpdateRuleRequest {
  rule_definition: Partial<RuleDefinition>;
  change_reason?: string;
}

/**
 * Query parameters for listing rules
 */
export interface ListRulesQuery {
  status?: 'active' | 'draft' | 'all';
  category?: CategoryType;
  severity?: SeverityType;
  phase?: PhaseType;
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  rules: T[];
  total_count: number;
  page?: number;
  limit?: number;
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
  errors: number;
  details: Array<{
    rule_id: string;
    status: 'imported' | 'skipped' | 'error';
    id?: string;
    reason?: string;
    error?: string;
  }>;
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
