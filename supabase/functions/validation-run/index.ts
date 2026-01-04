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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ValidateRequest,
  ValidateResponse,
  ErrorResponse,
  ValidationInputData,
  TriggerSource,
} from './types.ts';
import { validate, ValidationEngineResult } from './engine.ts';

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

function createSupabaseClient(authHeader: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
    },
  });
}

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
  supabase: ReturnType<typeof createClient>,
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
      vin,
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

  // Load ARES data if company vendor
  let aresData = null;
  let adisData = null;

  if (opportunity.vendors?.vendor_type === 'COMPANY' && opportunity.vendors?.company_id) {
    const { data: ares } = await supabase
      .from('ares_validations')
      .select('*')
      .eq('ico', opportunity.vendors.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (ares) {
      aresData = ares.ares_data;
      adisData = ares.adis_data;
    }
  }

  const inputData: ValidationInputData = {
    vehicle: opportunity.vehicles ?? undefined,
    vendor: opportunity.vendors ?? undefined,
    ocr_orv: ocrOrv ?? undefined,
    ocr_op: ocrOp ?? undefined,
    ocr_vtp: ocrVtp ?? undefined,
    ares: aresData ?? undefined,
    adis: adisData ?? undefined,
  };

  console.log(`[DataLoader] Data loaded successfully`);
  console.log(`[DataLoader] - Vehicle: ${inputData.vehicle ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - Vendor: ${inputData.vendor ? `${inputData.vendor.vendor_type}` : 'no'}`);
  console.log(`[DataLoader] - OCR ORV: ${inputData.ocr_orv ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - OCR OP: ${inputData.ocr_op ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - OCR VTP: ${inputData.ocr_vtp ? 'yes' : 'no'}`);
  console.log(`[DataLoader] - ARES: ${inputData.ares ? 'yes' : 'no'}`);

  return inputData;
}

/**
 * Find buying opportunity by SPZ or VIN
 */
async function findBuyingOpportunity(
  supabase: ReturnType<typeof createClient>,
  spz?: string,
  vin?: string
): Promise<string> {
  let query = supabase.from('buying_opportunities').select('id');

  if (spz) {
    query = query.eq('spz', spz.toUpperCase().replace(/\s/g, ''));
  } else if (vin) {
    query = query.eq('vin', vin.toUpperCase().replace(/\s/g, ''));
  } else {
    throw new Error('Either spz or vin must be provided');
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).single();

  if (error || !data) {
    throw new Error(`Buying opportunity not found for ${spz ? `SPZ: ${spz}` : `VIN: ${vin}`}`);
  }

  return data.id;
}

// =============================================================================
// RESULT STORAGE
// =============================================================================

/**
 * Store validation result in database
 */
async function storeValidationResult(
  supabase: ReturnType<typeof createClient>,
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
  supabase: ReturnType<typeof createClient>,
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

    // Create Supabase clients
    const authHeader = request.headers.get('authorization');
    const supabase = createSupabaseClient(authHeader);
    const serviceClient = createServiceClient();

    // Find buying opportunity ID
    let buyingOpportunityId = body.buying_opportunity_id;

    if (!buyingOpportunityId) {
      buyingOpportunityId = await findBuyingOpportunity(
        supabase,
        body.spz,
        body.vin
      );
    }

    console.log(`[Handler] Processing validation for: ${buyingOpportunityId}`);

    // Load validation data
    const inputData = await loadValidationData(supabase, buyingOpportunityId);

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
