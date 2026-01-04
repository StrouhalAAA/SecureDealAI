/**
 * SecureDealAI MVP - Validation Preview Engine
 * Lightweight validation logic for real-time preview during data entry.
 *
 * Key differences from validation-run/engine.ts:
 * - NO database writes (validation_results, audit_log)
 * - Uses cached ARES/ADIS data by default
 * - Returns summarized results optimized for sidebar display
 * - Includes document status tracking
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ValidationInputData,
  ValidationStatus,
  FieldValidationResult,
  VendorType,
} from '../validation-run/types.ts';
import { validate, ValidationEngineResult } from '../validation-run/engine.ts';

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface ValidationPreviewRequest {
  buying_opportunity_id: string;
  categories?: ('vehicle' | 'vendor' | 'cross')[];
  use_cached_external?: boolean;
}

export interface DocumentStatus {
  type: 'ORV' | 'VTP' | 'OP';
  required: boolean;
  uploaded: boolean;
  ocr_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;
  ocr_fields_extracted?: number;
}

export interface CategoryResult {
  status: ValidationStatus | 'INCOMPLETE';
  fields_checked: number;
  fields_passed: number;
  fields_missing: number;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  rule_id: string;
  field: string;
  status: 'MATCH' | 'MISMATCH' | 'MISSING';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message_cs: string;
  similarity?: number;
  source_value?: string;
  target_value?: string;
}

export interface AresResult {
  company_found: boolean;
  company_active: boolean;
  company_name?: string;
  vat_payer?: boolean;
  unreliable_vat_payer?: boolean;
  checked_at?: string;
}

export interface ValidationPreviewResponse {
  preview_status: ValidationStatus | 'INCOMPLETE';

  documents: {
    uploaded: number;
    required: number;
    items: DocumentStatus[];
  };

  categories: {
    vehicle?: CategoryResult | null;
    vendor?: CategoryResult | null;
    ares?: AresResult | null;
  };

  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };

  is_preview: true;
  cached_at?: string;
}

// =============================================================================
// DATA LOADING (Read-only, no writes)
// =============================================================================

interface LoadedData {
  opportunity: {
    id: string;
    spz: string;
    status: string;
  };
  vehicle: Record<string, unknown> | null;
  vendor: Record<string, unknown> | null;
  ocrExtractions: Array<{
    document_type: string;
    ocr_status: string;
    extracted_data: Record<string, unknown> | null;
    created_at: string;
  }>;
  aresValidation: {
    ares_data: Record<string, unknown> | null;
    adis_data: Record<string, unknown> | null;
    created_at: string;
  } | null;
}

/**
 * Load all data needed for preview validation (read-only)
 */
async function loadPreviewData(
  supabase: SupabaseClient,
  buyingOpportunityId: string,
  _useCachedExternal: boolean
): Promise<LoadedData> {
  console.log(`[PreviewLoader] Loading data for: ${buyingOpportunityId}`);

  // Load buying opportunity with related data
  const { data: opportunity, error: oppError } = await supabase
    .from('buying_opportunities')
    .select(`
      id,
      spz,
      status,
      vehicles (*),
      vendors (*)
    `)
    .eq('id', buyingOpportunityId)
    .single();

  if (oppError) {
    throw new Error(`Failed to load buying opportunity: ${oppError.message}`);
  }

  if (!opportunity) {
    throw new Error(`Buying opportunity not found: ${buyingOpportunityId}`);
  }

  // Load OCR extractions by SPZ (ACBS pattern)
  const { data: ocrExtractions } = await supabase
    .from('ocr_extractions')
    .select('document_type, ocr_status, extracted_data, created_at')
    .eq('spz', opportunity.spz)
    .order('created_at', { ascending: false });

  // Load ARES validation if vendor is a company
  let aresValidation = null;
  if (opportunity.vendors?.vendor_type === 'COMPANY' && opportunity.vendors?.company_id) {
    const { data: ares } = await supabase
      .from('ares_validations')
      .select('ares_data, adis_data, created_at')
      .eq('buying_opportunity_id', buyingOpportunityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    aresValidation = ares;
  }

  return {
    opportunity: {
      id: opportunity.id,
      spz: opportunity.spz,
      status: opportunity.status,
    },
    vehicle: opportunity.vehicles,
    vendor: opportunity.vendors,
    ocrExtractions: ocrExtractions || [],
    aresValidation,
  };
}

// =============================================================================
// DOCUMENT STATUS CALCULATION
// =============================================================================

/**
 * Calculate document upload and OCR status
 */
function calculateDocumentStatus(
  ocrExtractions: LoadedData['ocrExtractions'],
  vendorType: VendorType | null
): { uploaded: number; required: number; items: DocumentStatus[] } {
  // Define required documents based on vendor type
  const requiredDocs: Array<{ type: 'ORV' | 'VTP' | 'OP'; required: boolean }> = [
    { type: 'ORV', required: true },  // Malý technický průkaz - always required
    { type: 'VTP', required: true },  // Velký technický průkaz - always required
  ];

  // OP is required only for PHYSICAL_PERSON vendors
  if (vendorType === 'PHYSICAL_PERSON') {
    requiredDocs.push({ type: 'OP', required: true });
  }

  const items: DocumentStatus[] = requiredDocs.map(doc => {
    const extraction = ocrExtractions.find(e => e.document_type === doc.type);
    const extractedData = extraction?.extracted_data as Record<string, unknown> | null;

    return {
      type: doc.type,
      required: doc.required,
      uploaded: !!extraction,
      ocr_status: extraction?.ocr_status as DocumentStatus['ocr_status'] || null,
      ocr_fields_extracted: extractedData
        ? Object.keys(extractedData).filter(k => extractedData[k] != null).length
        : undefined,
    };
  });

  const uploaded = items.filter(d => d.uploaded).length;
  const required = items.filter(d => d.required).length;

  return { uploaded, required, items };
}

// =============================================================================
// VALIDATION RESULT PROCESSING
// =============================================================================

/**
 * Convert field validation to issue format for sidebar
 */
function fieldToIssue(field: FieldValidationResult): ValidationIssue {
  // Get Czech error message or generate default
  const messageCz = field.errorMessage?.cs ||
    field.message ||
    `${field.field}: ${field.result}`;

  return {
    rule_id: field.ruleId,
    field: field.field,
    status: field.result as 'MATCH' | 'MISMATCH' | 'MISSING',
    severity: field.severity,
    message_cs: messageCz,
    similarity: field.similarity,
    source_value: field.sourceValue?.toString(),
    target_value: field.targetValue?.toString(),
  };
}

/**
 * Group validation results by category
 */
function groupResultsByCategory(
  results: FieldValidationResult[],
  requestedCategories?: ('vehicle' | 'vendor' | 'cross')[]
): Record<string, FieldValidationResult[]> {
  const groups: Record<string, FieldValidationResult[]> = {
    vehicle: [],
    vendor: [],
    cross: [],
  };

  for (const result of results) {
    // Skip skipped rules
    if (result.result === 'SKIPPED') continue;

    // Determine category from rule ID prefix
    const ruleId = result.ruleId.toUpperCase();
    let category: 'vehicle' | 'vendor' | 'cross' = 'cross';

    if (ruleId.startsWith('VEH-')) {
      category = 'vehicle';
    } else if (ruleId.startsWith('VEN-') || ruleId.startsWith('FO-') || ruleId.startsWith('PO-')) {
      category = 'vendor';
    } else if (ruleId.startsWith('ARES-') || ruleId.startsWith('ADIS-')) {
      category = 'vendor'; // ARES/ADIS are vendor-related
    }

    // Only include if category was requested (or no filter)
    if (!requestedCategories || requestedCategories.includes(category)) {
      groups[category].push(result);
    }
  }

  return groups;
}

/**
 * Calculate category result from field validations
 */
function calculateCategoryResult(
  results: FieldValidationResult[]
): CategoryResult | null {
  if (results.length === 0) {
    return null;
  }

  const fieldsChecked = results.length;
  const fieldsPassed = results.filter(r => r.result === 'MATCH').length;
  const fieldsMissing = results.filter(r => r.result === 'MISSING').length;
  const fieldsFailed = results.filter(r => r.result === 'MISMATCH').length;

  // Collect issues (non-MATCH results)
  const issues = results
    .filter(r => r.result !== 'MATCH' && r.result !== 'SKIPPED')
    .map(fieldToIssue);

  // Determine status
  let status: ValidationStatus | 'INCOMPLETE' = 'GREEN';

  // RED: Any CRITICAL MISMATCH
  const hasCriticalMismatch = results.some(
    r => r.severity === 'CRITICAL' && r.result === 'MISMATCH'
  );
  if (hasCriticalMismatch) {
    status = 'RED';
  }
  // ORANGE: WARNING MISMATCH or CRITICAL MISSING
  else if (
    results.some(r => r.severity === 'WARNING' && r.result === 'MISMATCH') ||
    results.some(r => r.severity === 'CRITICAL' && r.result === 'MISSING')
  ) {
    status = 'ORANGE';
  }

  return {
    status,
    fields_checked: fieldsChecked,
    fields_passed: fieldsPassed,
    fields_missing: fieldsMissing,
    issues,
  };
}

// =============================================================================
// ARES RESULT EXTRACTION
// =============================================================================

/**
 * Extract ARES validation result for sidebar display
 */
function extractAresResult(
  aresValidation: LoadedData['aresValidation']
): AresResult | null {
  if (!aresValidation?.ares_data) {
    return null;
  }

  const aresData = aresValidation.ares_data as {
    ico?: string;
    obchodniJmeno?: string;
    datumVzniku?: string;
    datumZaniku?: string;
    dic?: string;
  };

  const adisData = aresValidation.adis_data as {
    statusPlatce?: string;
    nespolehlivyPlatce?: boolean;
  } | null;

  // Company is active if no end date
  const companyActive = !aresData.datumZaniku;

  return {
    company_found: true,
    company_active: companyActive,
    company_name: aresData.obchodniJmeno,
    vat_payer: adisData?.statusPlatce === 'AKTIVNI' || !!aresData.dic,
    unreliable_vat_payer: adisData?.nespolehlivyPlatce ?? false,
    checked_at: aresValidation.created_at,
  };
}

// =============================================================================
// MAIN PREVIEW FUNCTION
// =============================================================================

/**
 * Run preview validation without database writes
 */
export async function runPreviewValidation(
  supabase: SupabaseClient,
  request: ValidationPreviewRequest
): Promise<ValidationPreviewResponse> {
  const startTime = performance.now();

  // Load all data
  const loadedData = await loadPreviewData(
    supabase,
    request.buying_opportunity_id,
    request.use_cached_external ?? true
  );

  // Build input data for validation engine
  const ocrOrv = loadedData.ocrExtractions.find(e => e.document_type === 'ORV')?.extracted_data;
  const ocrOp = loadedData.ocrExtractions.find(e => e.document_type === 'OP')?.extracted_data;
  const ocrVtp = loadedData.ocrExtractions.find(e => e.document_type === 'VTP')?.extracted_data;

  const inputData: ValidationInputData = {
    buying_opportunity: {
      id: loadedData.opportunity.id,
      spz: loadedData.opportunity.spz,
      buying_type: 'BRANCH', // Default for MVP
    },
    vehicle: loadedData.vehicle as ValidationInputData['vehicle'],
    vendor: loadedData.vendor as ValidationInputData['vendor'],
    ocr_orv: ocrOrv as ValidationInputData['ocr_orv'],
    ocr_op: ocrOp as ValidationInputData['ocr_op'],
    ocr_vtp: ocrVtp as ValidationInputData['ocr_vtp'],
    ares: loadedData.aresValidation?.ares_data as ValidationInputData['ares'],
    adis: loadedData.aresValidation?.adis_data as ValidationInputData['adis'],
  };

  // Calculate document status
  const vendorType = loadedData.vendor?.vendor_type as VendorType | null;
  const documentStatus = calculateDocumentStatus(loadedData.ocrExtractions, vendorType);

  // Check if we have minimum data for validation
  const hasVehicleData = !!loadedData.vehicle;
  const hasVendorData = !!loadedData.vendor;
  const hasAnyData = hasVehicleData || hasVendorData;

  // If no data at all, return INCOMPLETE status
  if (!hasAnyData) {
    return {
      preview_status: 'INCOMPLETE',
      documents: documentStatus,
      categories: {
        vehicle: null,
        vendor: null,
        ares: null,
      },
      summary: {
        passed: 0,
        warnings: 0,
        failed: 0,
      },
      is_preview: true,
    };
  }

  // Run validation engine (reuse from validation-run)
  let engineResult: ValidationEngineResult;
  try {
    engineResult = await validate(inputData);
  } catch (error) {
    console.error('[PreviewEngine] Validation error:', error);
    // Return INCOMPLETE on error
    return {
      preview_status: 'INCOMPLETE',
      documents: documentStatus,
      categories: {
        vehicle: hasVehicleData ? { status: 'INCOMPLETE', fields_checked: 0, fields_passed: 0, fields_missing: 0, issues: [] } : null,
        vendor: hasVendorData ? { status: 'INCOMPLETE', fields_checked: 0, fields_passed: 0, fields_missing: 0, issues: [] } : null,
        ares: null,
      },
      summary: {
        passed: 0,
        warnings: 0,
        failed: 0,
      },
      is_preview: true,
    };
  }

  // Group results by category
  const groupedResults = groupResultsByCategory(
    engineResult.fieldValidations,
    request.categories
  );

  // Calculate category results
  const vehicleResult = calculateCategoryResult(groupedResults.vehicle);
  const vendorResult = calculateCategoryResult(groupedResults.vendor);

  // Extract ARES result for companies
  const aresResult = vendorType === 'COMPANY'
    ? extractAresResult(loadedData.aresValidation)
    : null;

  // Calculate summary
  const allResults = engineResult.fieldValidations.filter(r => r.result !== 'SKIPPED');
  const summary = {
    passed: allResults.filter(r => r.result === 'MATCH').length,
    warnings: allResults.filter(r =>
      (r.severity === 'WARNING' && r.result === 'MISMATCH') ||
      (r.severity === 'CRITICAL' && r.result === 'MISSING')
    ).length,
    failed: allResults.filter(r => r.severity === 'CRITICAL' && r.result === 'MISMATCH').length,
  };

  // Determine overall preview status
  let previewStatus: ValidationStatus | 'INCOMPLETE' = engineResult.overallStatus;

  // Override to INCOMPLETE if missing required documents
  if (documentStatus.uploaded < documentStatus.required) {
    previewStatus = 'INCOMPLETE';
  }

  const durationMs = Math.round(performance.now() - startTime);
  console.log(`[PreviewEngine] Validation complete in ${durationMs}ms`);

  return {
    preview_status: previewStatus,
    documents: documentStatus,
    categories: {
      vehicle: vehicleResult,
      vendor: vendorResult,
      ares: aresResult,
    },
    summary,
    is_preview: true,
    cached_at: loadedData.aresValidation?.created_at,
  };
}
