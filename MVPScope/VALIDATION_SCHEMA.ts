/**
 * SecureDealAI MVP - Validation Schema
 * Defines validation rules for data input phase of Vehicle Purchase Management.
 */

// Types

export type ValidationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type ValidationStatus = 'GREEN' | 'ORANGE' | 'RED';
export type MatchType = 'EXACT' | 'FUZZY' | 'TOLERANCE' | 'REGEX';
export type DataSource = 'MANUAL' | 'OCR' | 'ARES' | 'ADIS' | 'CEBIA' | 'DOLOZKY';
export type VendorType = 'PHYSICAL_PERSON' | 'COMPANY';
export type DocumentType = 'ORV' | 'OP' | 'VTP';

export type TransformType =
  | 'UPPERCASE'
  | 'LOWERCASE'
  | 'TRIM'
  | 'REMOVE_SPACES'
  | 'NORMALIZE_DATE'
  | 'EXTRACT_NUMBER'
  | 'FORMAT_RC'
  | 'ADDRESS_NORMALIZE'
  | 'NAME_CONCAT';

// Interfaces

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  sourceEntity: 'vehicle' | 'vendor' | 'cross';
  sourceField: string;
  targetSource: DataSource;
  targetField: string;
  matchType: MatchType;
  threshold?: number;
  transforms: TransformType[];
  severity: ValidationSeverity;
  blockOnFail: boolean;
  applicableTo?: VendorType[];
  requiresDocument?: DocumentType;
  enabled: boolean;
}

export interface ValidationResult {
  ruleId: string;
  field: string;
  manualValue: string | null;
  ocrValue: string | null;
  matchType: MatchType;
  similarity?: number;
  threshold?: number;
  result: 'MATCH' | 'MISMATCH' | 'SKIPPED' | 'ERROR';
  status: ValidationStatus;
  message?: string;
}

export interface ValidationEngineConfig {
  executionOrder: string[];
  earlyStopOnCritical: boolean;
  parallelGroups: string[][];
  cache: Record<string, { ttl: number }>;
  retry: { maxAttempts: number; backoffMs: number[] };
  fallback: Record<string, ValidationStatus>;
}

// Vehicle Validation Rules

export const VEHICLE_RULES: ValidationRule[] = [
  {
    id: 'VEH-001',
    name: 'VIN Match',
    description: 'VIN must match exactly between manual input and OCR',
    sourceEntity: 'vehicle',
    sourceField: 'vin',
    targetSource: 'OCR',
    targetField: 'vin',
    matchType: 'EXACT',
    transforms: ['REMOVE_SPACES', 'UPPERCASE'],
    severity: 'CRITICAL',
    blockOnFail: true,
    requiresDocument: 'ORV',
    enabled: true,
  },
  {
    id: 'VEH-002',
    name: 'SPZ Match',
    description: 'Registration plate must match exactly',
    sourceEntity: 'vehicle',
    sourceField: 'spz',
    targetSource: 'OCR',
    targetField: 'registrationPlateNumber',
    matchType: 'EXACT',
    transforms: ['REMOVE_SPACES', 'UPPERCASE'],
    severity: 'CRITICAL',
    blockOnFail: true,
    requiresDocument: 'ORV',
    enabled: true,
  },
  {
    id: 'VEH-003',
    name: 'Owner Name Match',
    description: 'Owner name from ORV must match exactly',
    sourceEntity: 'vehicle',
    sourceField: 'majitel',
    targetSource: 'OCR',
    targetField: 'keeperName',
    matchType: 'EXACT',
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'CRITICAL',
    blockOnFail: true,
    requiresDocument: 'ORV',
    enabled: true,
  },
  {
    id: 'VEH-004',
    name: 'Brand Match',
    description: 'Vehicle brand similarity check',
    sourceEntity: 'vehicle',
    sourceField: 'znacka',
    targetSource: 'OCR',
    targetField: 'make',
    matchType: 'FUZZY',
    threshold: 0.8,
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'WARNING',
    blockOnFail: false,
    requiresDocument: 'ORV',
    enabled: true,
  },
  {
    id: 'VEH-005',
    name: 'Model Match',
    description: 'Vehicle model similarity check',
    sourceEntity: 'vehicle',
    sourceField: 'model',
    targetSource: 'OCR',
    targetField: 'model',
    matchType: 'FUZZY',
    threshold: 0.7,
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'WARNING',
    blockOnFail: false,
    requiresDocument: 'ORV',
    enabled: true,
  },
  {
    id: 'VEH-006',
    name: 'First Registration Date',
    description: 'First registration date match',
    sourceEntity: 'vehicle',
    sourceField: 'datum_1_registrace',
    targetSource: 'OCR',
    targetField: 'firstRegistrationDate',
    matchType: 'EXACT',
    transforms: ['NORMALIZE_DATE'],
    severity: 'WARNING',
    blockOnFail: false,
    requiresDocument: 'ORV',
    enabled: true,
  },
  {
    id: 'VEH-007',
    name: 'Engine Power Match',
    description: 'Engine power within 5% tolerance',
    sourceEntity: 'vehicle',
    sourceField: 'vykon_kw',
    targetSource: 'OCR',
    targetField: 'maxPower',
    matchType: 'TOLERANCE',
    threshold: 0.05,
    transforms: ['EXTRACT_NUMBER'],
    severity: 'WARNING',
    blockOnFail: false,
    requiresDocument: 'ORV',
    enabled: true,
  },
];

// Vendor Validation Rules - Individual (FO)

export const VENDOR_FO_RULES: ValidationRule[] = [
  {
    id: 'VND-001',
    name: 'Full Name Match',
    description: 'Vendor name must match ID card',
    sourceEntity: 'vendor',
    sourceField: 'name',
    targetSource: 'OCR',
    targetField: 'fullName',
    matchType: 'EXACT',
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: true,
  },
  {
    id: 'VND-002',
    name: 'Personal ID Match',
    description: 'Personal ID (RČ) must match exactly',
    sourceEntity: 'vendor',
    sourceField: 'personal_id',
    targetSource: 'OCR',
    targetField: 'personalNumber',
    matchType: 'EXACT',
    transforms: ['FORMAT_RC'],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: true,
  },
  {
    id: 'VND-003',
    name: 'Street Address Match',
    description: 'Street address similarity check',
    sourceEntity: 'vendor',
    sourceField: 'address_street',
    targetSource: 'OCR',
    targetField: 'permanentStay',
    matchType: 'FUZZY',
    threshold: 0.6,
    transforms: ['UPPERCASE', 'TRIM', 'ADDRESS_NORMALIZE'],
    severity: 'WARNING',
    blockOnFail: false,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: true,
  },
  {
    id: 'VND-004',
    name: 'City Match',
    description: 'City similarity check',
    sourceEntity: 'vendor',
    sourceField: 'address_city',
    targetSource: 'OCR',
    targetField: 'permanentStay',
    matchType: 'FUZZY',
    threshold: 0.8,
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'WARNING',
    blockOnFail: false,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: true,
  },
  {
    id: 'VND-005',
    name: 'Postal Code Match',
    description: 'Postal code exact match',
    sourceEntity: 'vendor',
    sourceField: 'address_postal_code',
    targetSource: 'OCR',
    targetField: 'permanentStay',
    matchType: 'EXACT',
    transforms: ['REMOVE_SPACES'],
    severity: 'WARNING',
    blockOnFail: false,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: true,
  },
  {
    id: 'VND-006',
    name: 'Date of Birth',
    description: 'Date of birth from ID card',
    sourceEntity: 'vendor',
    sourceField: 'date_of_birth',
    targetSource: 'OCR',
    targetField: 'dateOfBirth',
    matchType: 'EXACT',
    transforms: ['NORMALIZE_DATE'],
    severity: 'INFO',
    blockOnFail: false,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: true,
  },
];

// Vendor Validation Rules - Company (PO)

export const VENDOR_PO_RULES: ValidationRule[] = [
  {
    id: 'ARES-001',
    name: 'Company Existence',
    description: 'Company must exist in ARES registry',
    sourceEntity: 'vendor',
    sourceField: 'company_id',
    targetSource: 'ARES',
    targetField: 'ico',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['COMPANY'],
    enabled: true,
  },
  {
    id: 'ARES-002',
    name: 'Company Name Match',
    description: 'Company name similarity check',
    sourceEntity: 'vendor',
    sourceField: 'name',
    targetSource: 'ARES',
    targetField: 'obchodniJmeno',
    matchType: 'FUZZY',
    threshold: 0.8,
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'WARNING',
    blockOnFail: false,
    applicableTo: ['COMPANY'],
    enabled: true,
  },
  {
    id: 'ARES-003',
    name: 'VAT ID Match',
    description: 'VAT ID must match ARES record',
    sourceEntity: 'vendor',
    sourceField: 'vat_id',
    targetSource: 'ARES',
    targetField: 'dic',
    matchType: 'EXACT',
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['COMPANY'],
    enabled: true,
  },
  {
    id: 'ARES-004',
    name: 'Company Age Check',
    description: 'Company should be at least 1 year old',
    sourceEntity: 'vendor',
    sourceField: 'company_id',
    targetSource: 'ARES',
    targetField: 'datumVzniku',
    matchType: 'TOLERANCE',
    threshold: 365,
    transforms: [],
    severity: 'WARNING',
    blockOnFail: false,
    applicableTo: ['COMPANY'],
    enabled: true,
  },
  {
    id: 'DPH-001',
    name: 'VAT Payer Status',
    description: 'Company must be active VAT payer',
    sourceEntity: 'vendor',
    sourceField: 'vat_id',
    targetSource: 'ADIS',
    targetField: 'statusPlatce',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['COMPANY'],
    enabled: true,
  },
  {
    id: 'DPH-002',
    name: 'Unreliable VAT Payer Check',
    description: 'Company must not be unreliable VAT payer',
    sourceEntity: 'vendor',
    sourceField: 'vat_id',
    targetSource: 'ADIS',
    targetField: 'nespolehlivyPlatce',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['COMPANY'],
    enabled: true,
  },
  {
    id: 'DPH-003',
    name: 'Bank Account Registration',
    description: 'Bank account should be registered in VAT registry',
    sourceEntity: 'vendor',
    sourceField: 'bank_account',
    targetSource: 'ADIS',
    targetField: 'seznamUctu',
    matchType: 'EXACT',
    transforms: ['REMOVE_SPACES'],
    severity: 'WARNING',
    blockOnFail: false,
    applicableTo: ['COMPANY'],
    enabled: true,
  },
];

// Cross-Entity Validation Rules

export const CROSS_RULES: ValidationRule[] = [
  {
    id: 'XV-001',
    name: 'Vehicle Owner = Vendor',
    description: 'Vehicle owner from ORV must match vendor name',
    sourceEntity: 'cross',
    sourceField: 'vehicles.majitel',
    targetSource: 'MANUAL',
    targetField: 'vendors.name',
    matchType: 'FUZZY',
    threshold: 0.95,
    transforms: ['UPPERCASE', 'TRIM'],
    severity: 'CRITICAL',
    blockOnFail: true,
    enabled: true,
  },
];

// Phase 2 Rules (disabled)

export const DOLOZKY_RULES: ValidationRule[] = [
  {
    id: 'DOL-001',
    name: 'ID Card Validity',
    description: 'Check if ID card is valid via Doložky.cz',
    sourceEntity: 'vendor',
    sourceField: 'document_number',
    targetSource: 'DOLOZKY',
    targetField: 'isValid',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: false,
  },
  {
    id: 'DOL-002',
    name: 'ID Card Expiry',
    description: 'Check if ID card is not expired',
    sourceEntity: 'vendor',
    sourceField: 'document_expiry_date',
    targetSource: 'DOLOZKY',
    targetField: 'expiryDate',
    matchType: 'TOLERANCE',
    threshold: 0,
    transforms: ['NORMALIZE_DATE'],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: false,
  },
  {
    id: 'DOL-003',
    name: 'Personal Data Cross-validation',
    description: 'Verify OCR data matches Doložky.cz record',
    sourceEntity: 'vendor',
    sourceField: 'personal_id',
    targetSource: 'DOLOZKY',
    targetField: 'personalData',
    matchType: 'EXACT',
    transforms: ['FORMAT_RC'],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['PHYSICAL_PERSON'],
    requiresDocument: 'OP',
    enabled: false,
  },
];

export const CEBIA_RULES: ValidationRule[] = [
  {
    id: 'CEB-001',
    name: 'Vehicle Execution Check',
    description: 'Check if vehicle has no active execution',
    sourceEntity: 'vehicle',
    sourceField: 'vin',
    targetSource: 'CEBIA',
    targetField: 'exekuce',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    enabled: false,
  },
  {
    id: 'CEB-002',
    name: 'Vehicle Lien Check',
    description: 'Check if vehicle has no active lien',
    sourceEntity: 'vehicle',
    sourceField: 'vin',
    targetSource: 'CEBIA',
    targetField: 'zastava',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    enabled: false,
  },
  {
    id: 'CEB-003',
    name: 'Stolen Vehicle Check',
    description: 'Check if vehicle is not reported stolen',
    sourceEntity: 'vehicle',
    sourceField: 'vin',
    targetSource: 'CEBIA',
    targetField: 'kradene',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    enabled: false,
  },
  {
    id: 'CEB-004',
    name: 'Person Execution Check',
    description: 'Check if person has no active execution',
    sourceEntity: 'vendor',
    sourceField: 'personal_id',
    targetSource: 'CEBIA',
    targetField: 'exekuceOsoba',
    matchType: 'EXACT',
    transforms: ['FORMAT_RC'],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['PHYSICAL_PERSON'],
    enabled: false,
  },
  {
    id: 'CEB-005',
    name: 'Person Insolvency Check',
    description: 'Check if person is not in insolvency',
    sourceEntity: 'vendor',
    sourceField: 'personal_id',
    targetSource: 'CEBIA',
    targetField: 'insolvence',
    matchType: 'EXACT',
    transforms: ['FORMAT_RC'],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['PHYSICAL_PERSON'],
    enabled: false,
  },
  {
    id: 'CEB-006',
    name: 'Company Insolvency Check',
    description: 'Check if company is not in insolvency',
    sourceEntity: 'vendor',
    sourceField: 'company_id',
    targetSource: 'CEBIA',
    targetField: 'insolvence',
    matchType: 'EXACT',
    transforms: [],
    severity: 'CRITICAL',
    blockOnFail: true,
    applicableTo: ['COMPANY'],
    enabled: false,
  },
];

// Configuration

export const CONFIG: ValidationEngineConfig = {
  executionOrder: [
    // Critical checks first
    'VEH-001', 'VEH-002', 'VEH-003',
    'VND-001', 'VND-002',
    'ARES-001', 'ARES-003',
    'DPH-001', 'DPH-002',
    'XV-001',
    // Warning checks
    'VEH-004', 'VEH-005', 'VEH-006', 'VEH-007',
    'VND-003', 'VND-004', 'VND-005',
    'ARES-002', 'ARES-004',
    'DPH-003',
    // Info checks
    'VND-006',
  ],
  earlyStopOnCritical: true,
  parallelGroups: [
    ['VEH-001', 'VEH-002', 'VEH-003', 'VEH-004', 'VEH-005'],
    ['VND-001', 'VND-002', 'VND-003', 'VND-004', 'VND-005'],
    ['ARES-001', 'ARES-002', 'ARES-003', 'ARES-004'],
    ['DPH-001', 'DPH-002', 'DPH-003'],
  ],
  cache: {
    ares: { ttl: 86400 },
    adis: { ttl: 14400 },
    ocr: { ttl: 604800 },
    dolozky: { ttl: 86400 },
    cebia: { ttl: 86400 },
  },
  retry: {
    maxAttempts: 3,
    backoffMs: [1000, 2000, 4000],
  },
  fallback: {
    ares: 'ORANGE',
    adis: 'ORANGE',
    ocr: 'RED',
    dolozky: 'ORANGE',
    cebia: 'ORANGE',
  },
};

// Status determination

export function determineStatus(results: ValidationResult[]): ValidationStatus {
  const hasCriticalFailure = results.some(
    (r) => r.status === 'RED' && r.result === 'MISMATCH'
  );
  if (hasCriticalFailure) return 'RED';

  const hasWarning = results.some(
    (r) => r.status === 'ORANGE' && r.result === 'MISMATCH'
  );
  if (hasWarning) return 'ORANGE';

  return 'GREEN';
}

// Export all rules

export const ALL_RULES = {
  vehicle: VEHICLE_RULES,
  vendorFO: VENDOR_FO_RULES,
  vendorPO: VENDOR_PO_RULES,
  cross: CROSS_RULES,
  dolozky: DOLOZKY_RULES,
  cebia: CEBIA_RULES,
};

export default { rules: ALL_RULES, config: CONFIG, determineStatus };
