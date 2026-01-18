/**
 * SecureDealAI - Health Check Edge Function
 *
 * Provides API health status for monitoring and load balancers.
 * This endpoint is publicly accessible (no authentication required).
 *
 * Endpoint:
 * - GET /functions/v1/health
 *
 * Response:
 * - 200: Service healthy
 * - 503: Service degraded (database unreachable)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// CONSTANTS
// =============================================================================

const VERSION = '1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// =============================================================================
// TYPES
// =============================================================================

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  database: 'connected' | 'disconnected';
  services: {
    supabase: 'ok' | 'error';
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function jsonResponse(data: HealthResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Check database connectivity by executing a simple query
 */
async function checkDatabaseConnection(supabaseUrl: string, serviceRoleKey: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Simple query to verify connection - select 1 from any table or use RPC
    const { error } = await supabase.from('buying_opportunities').select('id').limit(1);

    // If table doesn't exist or no rows, that's fine - we just need the connection to work
    // Only return false for actual connection errors
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "The result contains 0 rows" which is acceptable
      console.error('[Health] Database query error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Health] Database connection error:', err);
    return false;
  }
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
    return new Response(
      JSON.stringify({ error: 'Method not allowed', message: 'Only GET requests are supported' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const timestamp = new Date().toISOString();

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Check if configuration is available
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[Health] Missing Supabase configuration');
    return jsonResponse(
      {
        status: 'degraded',
        timestamp,
        version: VERSION,
        database: 'disconnected',
        services: {
          supabase: 'error',
        },
      },
      503
    );
  }

  // Check database connection
  const dbConnected = await checkDatabaseConnection(supabaseUrl, serviceRoleKey);

  if (!dbConnected) {
    return jsonResponse(
      {
        status: 'degraded',
        timestamp,
        version: VERSION,
        database: 'disconnected',
        services: {
          supabase: 'error',
        },
      },
      503
    );
  }

  // All checks passed
  return jsonResponse({
    status: 'ok',
    timestamp,
    version: VERSION,
    database: 'connected',
    services: {
      supabase: 'ok',
    },
  });
});
