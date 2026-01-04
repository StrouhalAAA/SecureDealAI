/**
 * SecureDealAI MVP - ARES Validate Edge Function
 *
 * Comprehensive ARES/ADIS validation of company vendors, including:
 * - Company existence check (ARES)
 * - Company name verification (fuzzy matching)
 * - VAT ID (DIČ) validation
 * - Company age check
 * - DPH (VAT) payer status verification (ADIS)
 * - Unreliable payer detection
 * - Bank account registration check
 *
 * Endpoint:
 * - POST /functions/v1/ares-validate
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for DB access
 * - ARES_API_URL - (Optional) ARES API base URL
 * - ADIS_API_URL - (Optional) ADIS API base URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchFromAres, transformAresResponse, AresCompanyData } from '../ares-lookup/ares-client.ts';
import { checkDphStatus, transformAdisResponse, DphStatus } from './adis-client.ts';
import {
  runValidations,
  calculateOverallStatus,
  AresValidationResult,
  OverallStatus,
} from './validator.ts';

// =============================================================================
// TYPES
// =============================================================================

interface AresValidateRequest {
  buying_opportunity_id: string;
  ico: string;
  dic?: string;
  bank_account?: string;
  company_name?: string;
}

interface AresValidateResponse {
  id: string;
  buying_opportunity_id: string;
  overall_status: OverallStatus;
  validation_results: AresValidationResult[];
  ares_data: AresCompanyData | null;
  dph_status: DphStatus | null;
  created_at: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function jsonResponse(
  data: AresValidateResponse | ErrorResponse,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate IČO format (8 digits, with modulo 11 checksum)
 */
function isValidICO(ico: string): boolean {
  if (!/^\d{8}$/.test(ico)) {
    return false;
  }

  // Czech IČO checksum validation (modulo 11)
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += parseInt(ico[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let checkDigit: number;

  if (remainder === 0) {
    checkDigit = 1;
  } else if (remainder === 1) {
    checkDigit = 0;
  } else {
    checkDigit = 11 - remainder;
  }

  return parseInt(ico[7], 10) === checkDigit;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: AresValidateRequest;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.buying_opportunity_id || typeof req.buying_opportunity_id !== 'string') {
    return { valid: false, error: 'buying_opportunity_id is required and must be a string' };
  }

  if (!req.ico || typeof req.ico !== 'string') {
    return { valid: false, error: 'ico is required and must be a string' };
  }

  // Validate IČO format
  const icoClean = req.ico.replace(/\s+/g, '');
  if (!/^\d{8}$/.test(icoClean)) {
    return { valid: false, error: 'Invalid IČO format. Expected 8 digits.' };
  }

  if (!isValidICO(icoClean)) {
    return { valid: false, error: 'Invalid IČO checksum. Please verify the company ID.' };
  }

  return {
    valid: true,
    data: {
      buying_opportunity_id: req.buying_opportunity_id,
      ico: icoClean,
      dic: typeof req.dic === 'string' ? req.dic : undefined,
      bank_account: typeof req.bank_account === 'string' ? req.bank_account : undefined,
      company_name: typeof req.company_name === 'string' ? req.company_name : undefined,
    },
  };
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Store validation results in database
 */
async function storeValidation(
  supabase: SupabaseClient,
  buyingOpportunityId: string,
  ico: string,
  dic: string | undefined,
  bankAccount: string | undefined,
  aresData: AresCompanyData | null,
  dphStatus: DphStatus | null,
  validationResults: AresValidationResult[],
  overallStatus: OverallStatus
): Promise<string> {
  const { data, error } = await supabase
    .from('ares_validations')
    .insert({
      buying_opportunity_id: buyingOpportunityId,
      ico,
      dic,
      bank_account: bankAccount,
      ares_data: aresData,
      ares_fetched_at: aresData ? new Date().toISOString() : null,
      dph_status: dphStatus,
      dph_bank_accounts: dphStatus?.registered_accounts || null,
      dph_fetched_at: dphStatus ? new Date().toISOString() : null,
      validation_results: validationResults,
      overall_status: overallStatus,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ARES Validate] Database insert error:', error);
    throw new Error(`Failed to store validation results: ${error.message}`);
  }

  return data.id;
}

/**
 * Verify buying opportunity exists
 */
async function verifyBuyingOpportunity(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('buying_opportunities')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[ARES Validate] Error verifying buying opportunity:', error);
    return false;
  }

  return !!data;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return jsonResponse(
      {
        error: 'Method not allowed',
        message: 'Only POST requests are supported',
      },
      405
    );
  }

  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        },
        400
      );
    }

    const validation = validateRequest(body);
    if (!validation.valid || !validation.data) {
      return jsonResponse(
        {
          error: 'Validation error',
          message: validation.error || 'Invalid request',
        },
        400
      );
    }

    const request = validation.data;
    console.log(`[ARES Validate] Processing validation for IČO: ${request.ico}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ARES Validate] Missing Supabase configuration');
      return jsonResponse(
        {
          error: 'Configuration error',
          message: 'Server configuration is incomplete',
        },
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify buying opportunity exists
    const boExists = await verifyBuyingOpportunity(supabase, request.buying_opportunity_id);
    if (!boExists) {
      return jsonResponse(
        {
          error: 'Not found',
          message: `Buying opportunity ${request.buying_opportunity_id} not found`,
        },
        404
      );
    }

    // Step 1: Fetch ARES data
    console.log(`[ARES Validate] Fetching ARES data for IČO: ${request.ico}`);
    let aresData: AresCompanyData | null = null;
    try {
      const aresRaw = await fetchFromAres(request.ico);
      if (aresRaw) {
        aresData = transformAresResponse(aresRaw);
      }
    } catch (error) {
      console.error('[ARES Validate] ARES fetch error:', error);
      // Continue with null ARES data - the validation will handle this
    }

    // Step 2: Fetch ADIS (DPH) data if we have a DIČ
    console.log(`[ARES Validate] Checking DPH status`);
    let dphStatus: DphStatus | null = null;

    // Use DIČ from request, or from ARES data
    const dicToCheck = request.dic || aresData?.dic;

    if (dicToCheck) {
      try {
        const adisRaw = await checkDphStatus(dicToCheck);
        dphStatus = transformAdisResponse(adisRaw);
      } catch (error) {
        console.error('[ARES Validate] ADIS fetch error:', error);
        // Continue with null DPH status - the validation will mark it as SKIP
      }
    }

    // Step 3: Run validations
    console.log(`[ARES Validate] Running validation rules`);
    const validationResults = runValidations({
      ico: request.ico,
      dic: request.dic,
      bank_account: request.bank_account,
      company_name: request.company_name,
      ares_data: aresData,
      dph_status: dphStatus,
    });

    // Step 4: Calculate overall status
    const overallStatus = calculateOverallStatus(validationResults);
    console.log(`[ARES Validate] Overall status: ${overallStatus}`);

    // Step 5: Store results in database
    const recordId = await storeValidation(
      supabase,
      request.buying_opportunity_id,
      request.ico,
      request.dic,
      request.bank_account,
      aresData,
      dphStatus,
      validationResults,
      overallStatus
    );

    // Return response
    const response: AresValidateResponse = {
      id: recordId,
      buying_opportunity_id: request.buying_opportunity_id,
      overall_status: overallStatus,
      validation_results: validationResults,
      ares_data: aresData,
      dph_status: dphStatus,
      created_at: new Date().toISOString(),
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[ARES Validate] Error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (message.includes('timeout')) {
      return jsonResponse(
        {
          error: 'External API timeout',
          message: 'External API did not respond in time. Please try again.',
        },
        503
      );
    }

    return jsonResponse(
      {
        error: 'Validation failed',
        message,
      },
      500
    );
  }
});
