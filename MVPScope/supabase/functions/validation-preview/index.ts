/**
 * SecureDealAI MVP - Validation Preview Edge Function
 * Lightweight endpoint for real-time validation preview during data entry.
 *
 * Key differences from validation-run:
 * - Does NOT write results to database
 * - Uses cached external API data by default
 * - Returns summarized results optimized for sidebar display
 * - Designed for frequent calls during wizard flow
 *
 * Endpoint:
 * - POST /validation-preview - Get real-time validation preview
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_ANON_KEY - Supabase anonymous key
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { runPreviewValidation, ValidationPreviewRequest } from './preview-engine.ts';

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =============================================================================
// ERROR RESPONSE HELPER
// =============================================================================

interface ErrorResponse {
  error: string;
  message: string;
  code: string;
}

function createErrorResponse(
  message: string,
  code: string,
  status: number
): Response {
  const errorResponse: ErrorResponse = {
    error: 'validation_preview_error',
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
    return createErrorResponse(
      'Method not allowed. Use POST.',
      'METHOD_NOT_ALLOWED',
      405
    );
  }

  try {
    // Create Supabase client with user's auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') || '' },
      },
      auth: {
        persistSession: false,
      },
    });

    // Parse request body
    const body = await req.json();
    const {
      buying_opportunity_id,
      categories,
      use_cached_external = true,
    } = body as ValidationPreviewRequest;

    // Validate required parameters
    if (!buying_opportunity_id) {
      return createErrorResponse(
        'buying_opportunity_id is required',
        'MISSING_PARAMETER',
        400
      );
    }

    console.log(`[Preview] Running preview validation for: ${buying_opportunity_id}`);

    // Run preview validation (NO database writes)
    const result = await runPreviewValidation(supabase, {
      buying_opportunity_id,
      categories,
      use_cached_external,
    });

    console.log(`[Preview] Complete: ${result.preview_status} (${result.summary.passed} passed, ${result.summary.warnings} warnings, ${result.summary.failed} failed)`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Preview] Error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Determine error type for appropriate status code
    if (message.includes('not found')) {
      return createErrorResponse(message, 'NOT_FOUND', 404);
    }

    return createErrorResponse(message, 'INTERNAL_ERROR', 500);
  }
});
