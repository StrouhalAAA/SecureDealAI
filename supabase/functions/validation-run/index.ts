/**
 * SecureDealAI MVP - Validation Run Edge Function
 * Main entry point for validation API
 *
 * Endpoints:
 * - POST /validation-run - Execute validation for a buying opportunity
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for DB access
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ValidateRequest,
  ValidateResponse,
  ErrorResponse,
  ValidationInputData,
  TriggerSource,
} from './types.ts';
import { validate, ValidationEngineResult } from './engine.ts';

// Type alias for Supabase client without strict database types
// This allows flexibility when database types are not generated
// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// =============================================================================
// DATA LOADERS
// =============================================================================

/**
 * Load all data needed for validation from database
 */
async function loadValidationData(
  supabase: AnySupabaseClient,
  buyingOpportunityId: string
): Promise<ValidationInputData> {
  console.log(`[DataLoader] Loading data for buying opportunity: ${buyingOpportunityId}`);

  // Load buying opportunity with related data
  // Note: ocr_extractions uses SPZ-linking (ACBS pattern) without FK,
  // so we query it separately below instead of using PostgREST join syntax
  const { data: opportunity, error: oppError } = await supabase
    .from('buying_opportunities')
    .select(`
      id,
      spz,
      buying_type,
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

  // Query OCR extractions separately by SPZ (ACBS pattern - no FK relationship)
  let ocrExtractions: Array<{ document_type: string; extracted_data: unknown }> = [];
  if (opportunity.spz) {
    const { data: ocrData, error: ocrError } = await supabase
      .from('ocr_extractions')
      .select('document_type, extracted_data')
      .eq('spz', opportunity.spz)
      .eq('ocr_status', 'COMPLETED')
      .order('created_at', { ascending: false });

    if (ocrError) {
      console.warn(`[DataLoader] Failed to load OCR extractions: ${ocrError.message}`);
      // Continue without OCR data - validation can still run with partial data
    } else {
      ocrExtractions = ocrData ?? [];
    }
  }
  const ocrOrv = ocrExtractions.find((e: { document_type: string }) => e.document_type === 'ORV')?.extracted_data;
  const ocrOp = ocrExtractions.find((e: { document_type: string }) => e.document_type === 'OP')?.extracted_data;
  const ocrVtp = ocrExtractions.find((e: { document_type: string }) => e.document_type === 'VTP')?.extracted_data;

  // Extract vehicle and vendor from join results
  // PostgREST returns joined relations as arrays, so we take the first element
  const vehicle = Array.isArray(opportunity.vehicles)
    ? opportunity.vehicles[0]
    : opportunity.vehicles;
  const vendor = Array.isArray(opportunity.vendors)
    ? opportunity.vendors[0]
    : opportunity.vendors;

  // Load ARES data if company vendor
  let aresData = null;
  let adisData = null;

  if (vendor?.vendor_type === 'COMPANY' && vendor?.company_id) {
    const { data: ares } = await supabase
      .from('ares_validations')
      .select('*')
      .eq('ico', vendor.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (ares) {
      aresData = ares.ares_data;
      adisData = ares.adis_data;
    }
  }

  // Load MVCR Invalid Documents data if physical person vendor with document_number
  let mvcrData = null;

  if (vendor?.vendor_type === 'PHYSICAL_PERSON' && vendor?.document_number) {
    const { data: mvcr } = await supabase
      .from('mvcr_document_validations')
      .select('is_valid, is_invalid_document, check_status, mvcr_checked_at')
      .eq('buying_opportunity_id', buyingOpportunityId)
      .eq('document_number', vendor.document_number)
      .order('mvcr_checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mvcr) {
      mvcrData = {
        is_valid: mvcr.is_valid,
        is_invalid_document: mvcr.is_invalid_document,
        check_status: mvcr.check_status,
        checked_at: mvcr.mvcr_checked_at,
      };
    }
  }

  const inputData: ValidationInputData = {
    buying_opportunity: {
      id: opportunity.id,
      spz: opportunity.spz,
      buying_type: opportunity.buying_type ?? 'BRANCH',
    },
    vehicle: vehicle ?? undefined,
    vendor: vendor ?? undefined,
    ocr_orv: ocrOrv ?? undefined,
    ocr_op: ocrOp ?? undefined,
    ocr_vtp: ocrVtp ?? undefined,
    ares: aresData ?? undefined,
    adis: adisData ?? undefined,
    mvcr_invalid_docs: mvcrData ?? undefined,
  };

  console.log(`[DataLoader] Data loaded successfully`);
  console.log(`[DataLoader] - Buying Type: ${inputData.buying_opportunity?.buying_type}`);
  console.log(`[DataLoader] - Vehicle: ${inputData.vehicle ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - Vendor: ${inputData.vendor ? `${inputData.vendor.vendor_type}` : 'no'}`);
  console.log(`[DataLoader] - OCR ORV: ${inputData.ocr_orv ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - OCR OP: ${inputData.ocr_op ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - OCR VTP: ${inputData.ocr_vtp ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - ARES: ${inputData.ares ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - MVCR: ${inputData.mvcr_invalid_docs ? 'yes' : 'no'}`);

  return inputData;
}

/**
 * Find buying opportunity by SPZ or VIN
 */
async function findBuyingOpportunity(
  supabase: AnySupabaseClient,
  spz?: string,
  vin?: string
): Promise<string> {
  if (spz) {
    const { data, error } = await supabase
      .from('buying_opportunities')
      .select('id')
      .eq('spz', spz.toUpperCase().replace(/\s/g, ''))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`Buying opportunity not found for SPZ: ${spz}`);
    }
    return data.id;
  } else if (vin) {
    // VIN is on vehicles table, not buying_opportunities
    const { data, error } = await supabase
      .from('vehicles')
      .select('buying_opportunity_id')
      .eq('vin', vin.toUpperCase().replace(/\s/g, ''))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`Buying opportunity not found for VIN: ${vin}`);
    }
    return data.buying_opportunity_id;
  } else {
    throw new Error('Either spz or vin must be provided');
  }
}

// =============================================================================
// RESULT STORAGE
// =============================================================================

/**
 * Store validation result in database
 */
async function storeValidationResult(
  supabase: AnySupabaseClient,
  buyingOpportunityId: string,
  result: ValidationEngineResult,
  spz?: string,
  vin?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('validation_results')
    .insert({
      buying_opportunity_id: buyingOpportunityId,
      spz: spz ?? null,
      vin: vin ?? null,
      overall_status: result.overallStatus,
      field_validations: result.fieldValidations,
      total_rules_executed: result.statistics.totalRulesExecuted,
      rules_passed: result.statistics.rulesPassed,
      rules_failed: result.statistics.rulesFailed,
      rules_skipped: result.statistics.rulesSkipped,
      critical_issues: result.statistics.criticalIssues,
      warning_issues: result.statistics.warningIssues,
      started_at: new Date(Date.now() - result.durationMs).toISOString(),
      completed_at: new Date().toISOString(),
      rules_snapshot_hash: result.rulesSnapshotHash,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Storage] Failed to store validation result:', error);
    throw new Error(`Failed to store validation result: ${error.message}`);
  }

  return data.id;
}

/**
 * Store audit log entry
 */
async function storeAuditLog(
  supabase: AnySupabaseClient,
  validationResultId: string,
  inputData: ValidationInputData,
  request: Request,
  durationMs: number,
  triggerSource: TriggerSource = 'API'
): Promise<void> {
  const clientIp = request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  // Extract user from JWT if available
  const authHeader = request.headers.get('authorization');
  let triggeredBy = 'anonymous';

  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      triggeredBy = payload.sub ?? payload.email ?? 'authenticated';
    } catch {
      triggeredBy = 'authenticated';
    }
  }

  const { error } = await supabase.from('validation_audit_log').insert({
    validation_result_id: validationResultId,
    triggered_by: triggeredBy,
    trigger_source: triggerSource,
    client_ip: clientIp,
    user_agent: userAgent,
    request_id: requestId,
    input_snapshot: inputData,
    duration_ms: durationMs,
  });

  if (error) {
    console.error('[Audit] Failed to store audit log:', error);
    // Don't throw - audit log failure shouldn't fail the validation
  }
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

/**
 * Handle validation request
 */
async function handleValidationRequest(
  request: Request
): Promise<Response> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: ValidateRequest = await request.json();

    // Validate request
    if (!body.buying_opportunity_id && !body.spz && !body.vin) {
      return createErrorResponse(
        'Missing required parameter: buying_opportunity_id, spz, or vin',
        'MISSING_PARAMETER',
        400
      );
    }

    // Create service client for data access
    // Note: Validation is a backend service operation that needs to read all data
    // regardless of the caller's auth context, so we use service role for all DB operations.
    const serviceClient = createServiceClient();

    // Find buying opportunity ID
    let buyingOpportunityId = body.buying_opportunity_id;

    if (!buyingOpportunityId) {
      buyingOpportunityId = await findBuyingOpportunity(
        serviceClient,
        body.spz,
        body.vin
      );
    }

    console.log(`[Handler] Processing validation for: ${buyingOpportunityId}`);

    // Load validation data
    const inputData = await loadValidationData(serviceClient, buyingOpportunityId);

    // Execute validation
    const result = await validate(inputData);

    // Store result using service client (bypasses RLS)
    const resultId = await storeValidationResult(
      serviceClient,
      buyingOpportunityId,
      result,
      inputData.vehicle?.spz,
      inputData.vehicle?.vin
    );

    // Store audit log
    await storeAuditLog(
      serviceClient,
      resultId,
      inputData,
      request,
      result.durationMs
    );

    // Build response
    const response: ValidateResponse = {
      id: resultId,
      buying_opportunity_id: buyingOpportunityId,
      overall_status: result.overallStatus,
      field_validations: result.fieldValidations,
      statistics: {
        totalRulesExecuted: result.statistics.totalRulesExecuted,
        rulesPassed: result.statistics.rulesPassed,
        rulesFailed: result.statistics.rulesFailed,
        rulesSkipped: result.statistics.rulesSkipped,
        criticalIssues: result.statistics.criticalIssues,
        warningIssues: result.statistics.warningIssues,
      },
      duration_ms: result.durationMs,
      created_at: new Date().toISOString(),
    };

    console.log(`[Handler] Validation complete: ${result.overallStatus} in ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Handler] Validation error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Determine error type
    if (message.includes('not found')) {
      return createErrorResponse(message, 'NOT_FOUND', 404);
    }

    return createErrorResponse(message, 'INTERNAL_ERROR', 500);
  }
}

/**
 * Create error response
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number
): Response {
  const errorResponse: ErrorResponse = {
    error: 'validation_error',
    message,
    code,
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (request: Request) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return createErrorResponse(
      'Method not allowed. Use POST.',
      'METHOD_NOT_ALLOWED',
      405
    );
  }

  return handleValidationRequest(request);
});
