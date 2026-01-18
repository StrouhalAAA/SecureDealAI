/**
 * SecureDealAI MVP - MVCR Documents Edge Function
 *
 * Validates ID card documents against the Czech Ministry of Interior
 * Invalid Documents registry (neplatné doklady).
 *
 * Endpoint:
 * - POST /functions/v1/mvcr-documents
 *
 * Request body:
 * {
 *   "buying_opportunity_id": "uuid",
 *   "document_number": "217215163"
 * }
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for DB access
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  checkMvcrDocument,
  MvcrValidationResult,
  MvcrDocumentType,
  isValidDocumentNumberFormat,
} from './mvcr-client.ts';

// =============================================================================
// TYPES
// =============================================================================

interface MvcrValidateRequest {
  buying_opportunity_id: string;
  document_number: string;
  document_type?: number;  // Default: 0 (ID Card)
}

interface MvcrValidateResponse {
  id: string;
  buying_opportunity_id: string;
  document_number: string;
  is_valid: boolean;
  is_invalid_document: boolean;
  check_status: string;
  checked_at: string;
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
  data: MvcrValidateResponse | ErrorResponse,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Validate request body
 */
function validateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: MvcrValidateRequest;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.buying_opportunity_id || typeof req.buying_opportunity_id !== 'string') {
    return { valid: false, error: 'buying_opportunity_id is required and must be a string' };
  }

  if (!req.document_number || typeof req.document_number !== 'string') {
    return { valid: false, error: 'document_number is required and must be a string' };
  }

  // Validate document number format
  const docNumber = req.document_number.trim();
  if (!isValidDocumentNumberFormat(docNumber)) {
    return { valid: false, error: 'Invalid document_number format. Expected 6-12 alphanumeric characters.' };
  }

  return {
    valid: true,
    data: {
      buying_opportunity_id: req.buying_opportunity_id,
      document_number: docNumber,
      document_type: typeof req.document_type === 'number'
        ? req.document_type
        : MvcrDocumentType.ID_CARD,
    },
  };
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

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
    console.error('[MVCR Validate] Error verifying buying opportunity:', error);
    return false;
  }

  return !!data;
}

/**
 * Check if we have a recent cached result
 */
async function getCachedResult(
  supabase: SupabaseClient,
  buyingOpportunityId: string,
  documentNumber: string,
  maxAgeHours = 24
): Promise<{
  id: string;
  is_valid: boolean;
  is_invalid_document: boolean;
  check_status: string;
  mvcr_checked_at: string;
} | null> {
  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('mvcr_document_validations')
    .select('id, is_valid, is_invalid_document, check_status, mvcr_checked_at')
    .eq('buying_opportunity_id', buyingOpportunityId)
    .eq('document_number', documentNumber)
    .gte('mvcr_checked_at', cutoffTime)
    .order('mvcr_checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[MVCR Validate] Error checking cache:', error);
    return null;
  }

  return data;
}

/**
 * Store validation result in database
 */
async function storeValidation(
  supabase: SupabaseClient,
  buyingOpportunityId: string,
  documentNumber: string,
  documentType: number,
  result: MvcrValidationResult
): Promise<string> {
  // Use upsert to handle unique constraint
  const { data, error } = await supabase
    .from('mvcr_document_validations')
    .upsert(
      {
        buying_opportunity_id: buyingOpportunityId,
        document_number: documentNumber,
        document_type: documentType,
        is_valid: result.is_valid,
        is_invalid_document: result.is_invalid_document,
        mvcr_response_raw: result.raw_response ?? null,
        mvcr_checked_at: result.checked_at,
        check_status: result.check_status,
        error_message: result.error_message ?? null,
      },
      {
        onConflict: 'buying_opportunity_id,document_number',
      }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[MVCR Validate] Database insert error:', error);
    throw new Error(`Failed to store validation result: ${error.message}`);
  }

  return data.id;
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
    console.log(`[MVCR Validate] Processing validation for document: ${request.document_number}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[MVCR Validate] Missing Supabase configuration');
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

    // Check cache first (24 hour TTL)
    const cached = await getCachedResult(
      supabase,
      request.buying_opportunity_id,
      request.document_number
    );

    if (cached && cached.check_status === 'SUCCESS') {
      console.log(`[MVCR Validate] Returning cached result from ${cached.mvcr_checked_at}`);
      return jsonResponse({
        id: cached.id,
        buying_opportunity_id: request.buying_opportunity_id,
        document_number: request.document_number,
        is_valid: cached.is_valid,
        is_invalid_document: cached.is_invalid_document,
        check_status: cached.check_status,
        checked_at: cached.mvcr_checked_at,
        created_at: new Date().toISOString(),
      });
    }

    // Call MVCR API
    console.log(`[MVCR Validate] Calling MVCR API for document: ${request.document_number}`);
    const mvcrResult = await checkMvcrDocument({
      document_number: request.document_number,
      document_type: request.document_type,
    });

    // Store result in database
    const recordId = await storeValidation(
      supabase,
      request.buying_opportunity_id,
      request.document_number,
      request.document_type ?? MvcrDocumentType.ID_CARD,
      mvcrResult
    );

    // Log result
    if (mvcrResult.is_invalid_document) {
      console.warn(`[MVCR Validate] ALERT: Document ${request.document_number} found in invalid list!`);
    } else if (mvcrResult.is_valid) {
      console.log(`[MVCR Validate] Document ${request.document_number} is valid`);
    } else {
      console.warn(`[MVCR Validate] Check failed: ${mvcrResult.error_message}`);
    }

    // Return response
    const response: MvcrValidateResponse = {
      id: recordId,
      buying_opportunity_id: request.buying_opportunity_id,
      document_number: request.document_number,
      is_valid: mvcrResult.is_valid,
      is_invalid_document: mvcrResult.is_invalid_document,
      check_status: mvcrResult.check_status,
      checked_at: mvcrResult.checked_at,
      created_at: new Date().toISOString(),
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[MVCR Validate] Error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (message.includes('timeout')) {
      return jsonResponse(
        {
          error: 'External API timeout',
          message: 'MVCR API did not respond in time. Please try again.',
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
