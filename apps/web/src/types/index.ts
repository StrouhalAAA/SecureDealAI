// Re-export vehicle types from dedicated module
export type { Vehicle, VehicleFormInput, VehicleOCRData } from './vehicle';
export { FUEL_TYPE_OPTIONS, VEHICLE_CATEGORY_OPTIONS, getFuelTypeLabel, getVehicleCategoryLabel } from './vehicle';

export interface BuyingOpportunity {
  id: string;
  spz: string;
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  buying_opportunity_id: string;
  vendor_type: 'PHYSICAL_PERSON' | 'COMPANY';
  name: string;
  personal_id: string | null;
  company_id: string | null;
  vat_id: string | null;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  date_of_birth: string | null;
  document_number: string | null;
  document_expiry_date: string | null;
  ares_verified: boolean;
  ares_verified_at: string | null;
  data_source?: 'MANUAL' | 'ARES' | 'OCR';
}

export type ValidationStatus = 'GREEN' | 'ORANGE' | 'RED';

export type AresStatusType = 'idle' | 'loading' | 'verified' | 'not_found' | 'warning' | 'error';

export type FieldValidationResult = 'MATCH' | 'MISMATCH' | 'MISSING';

export interface FieldValidation {
  field: string;
  result: FieldValidationResult;
  status: ValidationStatus;
  // New field names from validation engine
  sourceValue?: string | number | null;
  targetValue?: string | number | null;
  normalizedSource?: string | number | null;
  normalizedTarget?: string | number | null;
  // Legacy field names (for backward compatibility)
  manual?: string | null;
  ocr?: string | null;
  expected?: string | null;
  actual?: string | null;
  // Common fields
  similarity?: number | null;
  ruleId?: string;
  ruleName?: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface ValidationIssue {
  field: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  details?: {
    manual?: string;
    ocr?: string;
  };
}

export interface ValidationResult {
  id: string;
  buying_opportunity_id: string;
  overall_status: ValidationStatus;
  attempt_number: number;
  completed_at: string | null;
  duration_ms: number | null;
  field_validations: FieldValidation[];
  issues?: ValidationIssue[];
}

export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type DocumentType = 'ORV' | 'VTP' | 'OP';

export interface OcrExtraction {
  id: string;
  spz: string;
  document_type: DocumentType;
  ocr_status: OcrStatus;
  file_path: string | null;
  extracted_data: Record<string, unknown> | null;
  extraction_confidence: number | null;
  errors: { message?: string; details?: unknown } | null;
  created_at: string;
  updated_at: string;
}

// Validation Sidebar Types
export type PreviewStatus = 'GREEN' | 'ORANGE' | 'RED' | 'INCOMPLETE';

export interface DocumentStatus {
  uploaded: boolean;
  ocr_processed: boolean;
  ocr_fields_extracted?: number;
}

export interface DocumentProgress {
  orv?: DocumentStatus;
  op?: DocumentStatus;
  vtp?: DocumentStatus;
}

export interface CategoryIssue {
  field: string;
  status: PreviewStatus;
  similarity?: number;
}

export interface CategoryResult {
  status: PreviewStatus;
  fields_checked: number;
  fields_passed: number;
  fields_missing: number;
  issues: CategoryIssue[];
}

export interface AresPreview {
  company_found: boolean;
  company_active: boolean;
  vat_payer: boolean;
  unreliable_vat_payer?: boolean;
}

export interface ValidationPreviewCategories {
  documents?: DocumentProgress;
  vehicle?: CategoryResult;
  vendor?: CategoryResult;
  ares?: AresPreview;
}

export interface ValidationPreviewSummary {
  passed: number;
  warnings: number;
  failed: number;
}

export interface ValidationPreviewResponse {
  preview_status: PreviewStatus;
  categories: ValidationPreviewCategories;
  summary: ValidationPreviewSummary;
}
