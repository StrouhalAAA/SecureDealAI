/**
 * SecureDealAI MVP - Validation Engine Types
 * Deno/TypeScript types for dynamic validation rules
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';
export type ValidationStatus = 'GREEN' | 'ORANGE' | 'RED';
export type ValidationResult = 'MATCH' | 'MISMATCH' | 'MISSING' | 'SKIPPED' | 'ERROR';

export type EntityType =
  | 'vehicle'
  | 'vendor'
  | 'ocr_orv'
  | 'ocr_op'
  | 'ocr_vtp'
  | 'ares'
  | 'adis'
  | 'cebia'
  | 'dolozky';

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

export type ComparisonType =
  | 'EXACT'
  | 'FUZZY'
  | 'CONTAINS'
  | 'REGEX'
  | 'NUMERIC_TOLERANCE'
  | 'DATE_TOLERANCE'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'IN_LIST';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'IN'
  | 'NOT_IN'
  | 'GREATER_THAN'
  | 'LESS_THAN';

export type VendorType = 'PHYSICAL_PERSON' | 'COMPANY';
export type TriggerSource = 'API' | 'UI' | 'BATCH' | 'SCHEDULER' | 'WEBHOOK';

// =============================================================================
// RULE DEFINITION TYPES
// =============================================================================

export interface DataSource {
  entity: EntityType;
  field: string;
  transforms?: TransformType[];
}

export interface ComparisonConfig {
  type: ComparisonType;
  caseSensitive?: boolean;
  threshold?: number;          // For FUZZY (0-1)
  tolerance?: number;          // For NUMERIC/DATE_TOLERANCE
  toleranceType?: 'absolute' | 'percentage';
  pattern?: string;            // For REGEX
  allowedValues?: string[];    // For IN_LIST
}

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

export interface LocalizedMessage {
  cs: string;
  en: string;
  sk?: string;
  pl?: string;
}

export interface RuleMetadata {
  category?: 'vehicle' | 'vendor_fo' | 'vendor_po' | 'cross' | 'external';
  phase?: 'mvp' | 'phase2' | 'future';
  requiresDocument?: 'ORV' | 'OP' | 'VTP' | null;
  applicableTo?: VendorType[];
  priority?: number;
  tags?: string[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  source: DataSource;
  target: DataSource;
  comparison: ComparisonConfig;
  severity: Severity;
  blockOnFail?: boolean;
  conditions?: ConditionGroup;
  errorMessage?: LocalizedMessage;
  metadata?: RuleMetadata;
}

// Database representation
export interface ValidationRuleRow {
  id: string;                    // UUID
  rule_id: string;               // VEH-001
  rule_definition: ValidationRule;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  schema_version: string;
  activated_at: string | null;
}

// =============================================================================
// INPUT DATA TYPES
// =============================================================================

export interface VehicleData {
  vin?: string;
  spz?: string;
  znacka?: string;
  model?: string;
  majitel?: string;
  datum_1_registrace?: string;
  vykon_kw?: number;
  barva?: string;
}

export interface VendorData {
  vendor_type: VendorType;
  name?: string;
  personal_id?: string;          // RČ for FO
  company_id?: string;           // IČO for PO
  vat_id?: string;               // DIČ
  date_of_birth?: string;
  address_street?: string;
  address_city?: string;
  address_postal_code?: string;
  bank_account?: string;
  document_number?: string;
  document_expiry_date?: string;
}

export interface OcrOrvData {
  vin?: string;
  registrationPlateNumber?: string;
  make?: string;
  model?: string;
  keeperName?: string;
  firstRegistrationDate?: string;
  maxPower?: number;
  color?: string;
}

export interface OcrOpData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  personalNumber?: string;
  dateOfBirth?: string;
  permanentStay?: string;
}

export interface AresData {
  ico?: string;
  obchodniJmeno?: string;
  dic?: string;
  datumVzniku?: string;
  sidlo?: string;
}

export interface AdisData {
  statusPlatce?: string;
  nespolehlivyPlatce?: boolean;
  seznamUctu?: string[];
}

export interface CebiaData {
  exekuce?: boolean;
  zastava?: boolean;
  kradene?: boolean;
  exekuceOsoba?: boolean;
  insolvence?: boolean;
}

export interface DolozkyData {
  isValid?: boolean;
  expiryDate?: string;
  personalData?: string;
}

export interface ValidationInputData {
  vehicle?: VehicleData;
  vendor?: VendorData;
  ocr_orv?: OcrOrvData;
  ocr_op?: OcrOpData;
  ocr_vtp?: Record<string, unknown>;
  ares?: AresData;
  adis?: AdisData;
  cebia?: CebiaData;
  dolozky?: DolozkyData;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface FieldValidationResult {
  ruleId: string;
  ruleName: string;
  field: string;
  sourceValue: string | number | null;
  targetValue: string | number | null;
  normalizedSource: string | number | null;
  normalizedTarget: string | number | null;
  result: ValidationResult;
  severity: Severity;
  status: ValidationStatus;
  similarity?: number;          // For FUZZY matches
  message?: string;
  errorMessage?: LocalizedMessage;
}

export interface ValidationStatistics {
  totalRulesExecuted: number;
  rulesPassed: number;
  rulesFailed: number;
  rulesSkipped: number;
  criticalIssues: number;
  warningIssues: number;
}

export interface ValidationRunResult {
  id: string;
  buyingOpportunityId: string;
  spz?: string;
  vin?: string;
  overallStatus: ValidationStatus;
  fieldValidations: FieldValidationResult[];
  statistics: ValidationStatistics;
  rulesSnapshotHash: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface ValidateRequest {
  buying_opportunity_id?: string;
  spz?: string;
  vin?: string;
}

export interface ValidateResponse {
  id: string;
  buying_opportunity_id: string;
  overall_status: ValidationStatus;
  field_validations: FieldValidationResult[];
  statistics: ValidationStatistics;
  duration_ms: number;
  created_at: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: unknown;
}

// =============================================================================
// AUDIT TYPES
// =============================================================================

export interface AuditLogEntry {
  validationResultId: string;
  triggeredBy: string;
  triggeredAt: string;
  triggerSource: TriggerSource;
  clientIp?: string;
  userAgent?: string;
  requestId?: string;
  inputSnapshot: ValidationInputData;
  durationMs: number;
  externalCallsCount: number;
  cacheHits: number;
  errorOccurred: boolean;
  errorDetails?: unknown;
}

// =============================================================================
// ENGINE CONFIG
// =============================================================================

export interface EngineConfig {
  earlyStopOnCritical: boolean;
  maxParallelRules: number;
  defaultLanguage: 'cs' | 'en';
  enableCaching: boolean;
  cacheTtlSeconds: Record<EntityType, number>;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  earlyStopOnCritical: true,
  maxParallelRules: 5,
  defaultLanguage: 'cs',
  enableCaching: true,
  cacheTtlSeconds: {
    vehicle: 0,
    vendor: 0,
    ocr_orv: 604800,    // 7 days
    ocr_op: 604800,
    ocr_vtp: 604800,
    ares: 86400,        // 1 day
    adis: 14400,        // 4 hours
    cebia: 86400,
    dolozky: 86400,
  },
};
