/**
 * SecureDealAI MVP - ARES Lookup Edge Function
 *
 * Provides instant IČO lookup via ARES API for auto-filling vendor forms.
 * Includes caching to reduce API calls.
 *
 * Endpoint:
 * - GET /functions/v1/ares-lookup/{ico}
 *
 * Response:
 * - 200: Company found (includes company data)
 * - 400: Invalid IČO format
 * - 404: Company not found in ARES
 * - 503: ARES API unavailable
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for DB access
 * - ARES_API_URL - (Optional) ARES API base URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchFromAres, transformAresResponse, AresCompanyData } from './ares-client.ts';

// =============================================================================
// TYPES
// =============================================================================

interface AresLookupSuccessResponse {
  found: true;
  data: AresCompanyData;
  fetched_at: string;
  cached: boolean;
}

interface AresLookupNotFoundResponse {
  found: false;
  ico: string;
  message: string;
}

interface AresLookupErrorResponse {
  error: string;
  message: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_TTL_HOURS = 24;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function jsonResponse(
  data: AresLookupSuccessResponse | AresLookupNotFoundResponse | AresLookupErrorResponse,
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

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Check cache for recent ARES data
 */
async function checkCache(
  supabase: SupabaseClient,
  ico: string
): Promise<{ data: AresCompanyData; fetched_at: string } | null> {
  const cacheExpiry = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('ares_validations')
    .select('ares_data, ares_fetched_at')
    .eq('ico', ico)
    .gte('ares_fetched_at', cacheExpiry)
    .order('ares_fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Cache] Error checking cache:', error);
    return null;
  }

  if (data?.ares_data) {
    return {
      data: data.ares_data as AresCompanyData,
      fetched_at: data.ares_fetched_at,
    };
  }

  return null;
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

  // Only allow GET
  if (req.method !== 'GET') {
    return jsonResponse(
      {
        error: 'Method not allowed',
        message: 'Only GET requests are supported',
      },
      405
    );
  }

  try {
    // Extract IČO from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const ico = pathParts[pathParts.length - 1];

    // Validate IČO format
    if (!ico || ico === 'ares-lookup') {
      return jsonResponse(
        {
          found: false,
          ico: '',
          message: 'IČO is required in URL path: /ares-lookup/{ico}',
        },
        400
      );
    }

    if (!/^\d{8}$/.test(ico)) {
      return jsonResponse(
        {
          found: false,
          ico,
          message: 'Invalid IČO format. Expected 8 digits.',
        },
        400
      );
    }

    // Validate IČO checksum
    if (!isValidICO(ico)) {
      return jsonResponse(
        {
          found: false,
          ico,
          message: 'Invalid IČO checksum. Please verify the company ID.',
        },
        400
      );
    }

    // Initialize Supabase client (service role for cache access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ARES Lookup] Missing Supabase configuration');
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

    // Check cache first
    const cached = await checkCache(supabase, ico);

    if (cached) {
      console.log(`[ARES Lookup] Cache hit for IČO: ${ico}`);
      return jsonResponse({
        found: true,
        data: cached.data,
        fetched_at: cached.fetched_at,
        cached: true,
      });
    }

    // Fetch from ARES API
    console.log(`[ARES Lookup] Fetching from ARES for IČO: ${ico}`);
    const aresData = await fetchFromAres(ico);

    if (!aresData) {
      return jsonResponse(
        {
          found: false,
          ico,
          message: 'Company not found in ARES registry.',
        },
        404
      );
    }

    // Transform response
    const transformedData = transformAresResponse(aresData);
    const fetchedAt = new Date().toISOString();

    // Return response (cache storage is handled separately during validation)
    return jsonResponse({
      found: true,
      data: transformedData,
      fetched_at: fetchedAt,
      cached: false,
    });
  } catch (error) {
    console.error('[ARES Lookup] Error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (message.includes('timeout')) {
      return jsonResponse(
        {
          error: 'ARES timeout',
          message: 'ARES API did not respond in time. Please try again.',
        },
        503
      );
    }

    if (message.includes('ARES API error')) {
      return jsonResponse(
        {
          error: 'ARES unavailable',
          message: 'ARES API is currently unavailable. Please try again later.',
        },
        503
      );
    }

    return jsonResponse(
      {
        error: 'ARES lookup failed',
        message,
      },
      503
    );
  }
});
