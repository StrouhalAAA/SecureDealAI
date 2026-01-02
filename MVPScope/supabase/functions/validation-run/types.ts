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
  | 'buying_opportunity'  // Context entity for buying_type conditions
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
export type BuyingType = 'BRANCH' | 'MOBILE_BUYING';  // BRANCH = default (MVP), MOBILE_BUYING = Phase 2
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

/** Document group keys for logical grouping of document types */
export type DocumentGroupKey = 'VTP' | 'ORV' | 'OP';

export interface RuleMetadata {
  category?: 'vehicle' | 'vendor_fo' | 'vendor_po' | 'cross' | 'external';
  phase?: 'mvp' | 'phase2' | 'future';
  /** @deprecated Use requiresDocuments or requiresDocumentGroup instead */
  requiresDocument?: 'ORV' | 'OP' | 'VTP' | null;
  /** Document Type IDs required for this rule. All must be present. */
  requiresDocuments?: number[];
  /** Document group - rule applies if ANY document in the group is present */
  requiresDocumentGroup?: DocumentGroupKey;
  applicableTo?: VendorType[];           // Filter by vendor type (PHYSICAL_PERSON, COMPANY)
  applicableToBuyingType?: BuyingType[]; // Filter by buying type (BRANCH, MOBILE_BUYING)
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
  // Core vehicle identification
  vin?: string;                        // E. IDENTIFIKAČNÍ ČÍSLO (VIN)
  registrationPlateNumber?: string;    // A. REGISTRAČNÍ ZNAČKA
  firstRegistrationDate?: string;      // B. DATUM PRVNÍ REGISTRACE (YYYY-MM-DD)

  // Keeper/operator info
  keeperName?: string;                 // C.1.1./C.1.2. PROVOZOVATEL
  keeperAddress?: string;              // C.1.3. ADRESA POBYTU/SÍDLO

  // Vehicle specs
  make?: string;                       // D.1. TOVÁRNÍ ZNAČKA
  model?: string;                      // D.3. OBCHODNÍ OZNAČENÍ
  makeTypeVariantVersion?: string;     // D.1. + D.2. TYP, VARIANTA, VERZE

  // Technical specs
  fuelType?: string;                   // P.3. PALIVO
  engineCcm?: number;                  // P.1. ZDVIHOVÝ OBJEM [cm³]
  maxPower?: string;                   // P.2. MAX. VÝKON [kW] / OT. (e.g., "228/5700")
  seats?: number;                      // S.1. POČET MÍST K SEZENÍ
  color?: string;                      // R. BARVA
  vehicleType?: string;                // J. DRUH VOZIDLA
  maxSpeed?: number;                   // T. NEJVYŠŠÍ RYCHLOST [km/h]

  // Document info
  orvDocumentNumber?: string;          // Document serial number
}

export interface OcrOpData {
  // Personal identity (front side)
  firstName?: string;                  // JMÉNO / GIVEN NAMES
  lastName?: string;                   // PŘÍJMENÍ / SURNAME
  fullName?: string;                   // Derived: firstName + lastName
  dateOfBirth?: string;                // DATUM NAROZENÍ (YYYY-MM-DD)
  placeOfBirth?: string;               // MÍSTO NAROZENÍ / PLACE OF BIRTH
  nationality?: string;                // STÁTNÍ OBČANSTVÍ / NATIONALITY
  sex?: string;                        // POHLAVÍ / SEX (M/F)

  // Back side info
  personalNumber?: string;             // RODNÉ ČÍSLO / PERSONAL NO. (######/####)
  permanentStay?: string;              // TRVALÝ POBYT / PERMANENT STAY
  issuingAuthority?: string;           // VYDAL / AUTHORITY

  // Document info
  documentNumber?: string;             // ČÍSLO DOKLADU / DOCUMENT NO.
  dateOfIssue?: string;                // DATUM VYDÁNÍ (YYYY-MM-DD)
  dateOfExpiry?: string;               // PLATNOST DO (YYYY-MM-DD)
}

/**
 * OCR VTP Data - Technical Certificate Part II (Technický průkaz)
 * CRITICAL: Contains owner IČO required for ARES validation
 */
export interface OcrVtpData {
  // Basic Registration
  registrationPlateNumber?: string;    // A. Registrační značka vozidla
  firstRegistrationDate?: string;      // B. Datum první registrace (YYYY-MM-DD)
  firstRegistrationDateCZ?: string;    // Datum první registrace v ČR (YYYY-MM-DD)
  vtpDocumentNumber?: string;          // Document serial number (e.g., "UJ 41A767")

  // Owner Info - CRITICAL for ARES validation
  ownerName?: string;                  // C.2.1./C.2.2. Vlastník
  ownerIco?: string;                   // RČ/IČ - Company ID for ARES validation
  ownerAddress?: string;               // C.2.3. Adresa pobytu/sídlo

  // Vehicle Identity
  vin?: string;                        // E. Identifikační číslo vozidla (VIN)
  make?: string;                       // D.1. Tovární značka
  type?: string;                       // D.2. Typ
  variant?: string;                    // Varianta
  version?: string;                    // Verze
  commercialName?: string;             // D.3. Obchodní označení
  manufacturer?: string;               // 3. Výrobce vozidla

  // Technical Specs
  vehicleCategory?: string;            // J. Kategorie vozidla (e.g., "M1")
  bodyType?: string;                   // 2. Karoserie (e.g., "AC KOMBI")
  vehicleType?: string;                // J. Druh vozidla (e.g., "OSOBNÍ AUTOMOBIL")
  engineType?: string;                 // 5. Typ motoru
  color?: string;                      // R. Barva
  fuelType?: string;                   // P.3. Palivo
  engineCcm?: number;                  // P.1. Zdvih. objem [cm³]
  maxPowerKw?: number;                 // P.2. Max. výkon [kW]
  maxPowerRpm?: number;                // P.4. ot. [min⁻¹]

  // Dimensions (mm)
  length?: number;                     // 12. Celková délka
  width?: number;                      // 13. Celková šířka
  height?: number;                     // 14. Celková výška
  wheelbase?: number;                  // M. Rozvor

  // Weights (kg)
  operatingWeight?: number;            // G. Provozní hmotnost
  maxPermittedWeight?: number;         // F.2. Povolená hmotnost
  trailerWeightBraked?: number;        // O.1. Hmotnost přívěsu brzděného
  trailerWeightUnbraked?: number;      // O.2. Hmotnost přívěsu nebrzděného
  combinedWeight?: number;             // F.3. Hmotnost soupravy

  // Performance
  maxSpeed?: number;                   // T. Nejvyšší rychlost [km/h]
  seats?: number;                      // S.1. Počet míst k sezení
  standingPlaces?: number;             // S.2. Počet míst k stání

  // Environmental
  co2Emissions?: string;               // V.7 CO₂ [g/km] (e.g., "232/155/183")
  fuelConsumption?: string;            // 25. Spotřeba paliva (e.g., "10.0/6.7/7.9")
  emissionStandard?: string;           // Předpis EHS/ES/EU

  // Technical Inspection
  lastInspectionDate?: string;         // OSVĚDČENÍ O TECHNICKÉ ZPŮSOBILOSTI (YYYY-MM-DD)
  nextInspectionDue?: string;          // Platí do (YYYY-MM-DD)
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

export interface BuyingOpportunityData {
  id?: string;
  spz?: string;
  buying_type: BuyingType;   // BRANCH (default), MOBILE_BUYING
  status?: string;
}

export interface ValidationInputData {
  buying_opportunity?: BuyingOpportunityData;  // Context for rule conditions
  vehicle?: VehicleData;
  vendor?: VendorData;
  ocr_orv?: OcrOrvData;
  ocr_op?: OcrOpData;
  ocr_vtp?: OcrVtpData;    // VTP contains owner IČO for ARES validation
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
    buying_opportunity: 0,  // No caching - always fresh
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
