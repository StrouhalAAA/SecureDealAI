/**
 * SecureDealAI MVP - Buying Opportunity CRUD Edge Function
 *
 * Endpoints:
 * - POST /buying-opportunity - Create new buying opportunity
 * - GET /buying-opportunity?id={id} - Get by ID
 * - GET /buying-opportunity?spz={spz} - Get by SPZ
 * - GET /buying-opportunity/list - List all (paginated)
 * - PUT /buying-opportunity/{id} - Update status
 * - DELETE /buying-opportunity/{id} - Delete (soft or hard)
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_ANON_KEY - Supabase anon key for authenticated requests
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// TYPES
// =============================================================================

type BuyingOpportunityStatus = 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED';

interface CreateBuyingOpportunityRequest {
  spz: string;
}

interface UpdateBuyingOpportunityRequest {
  status: BuyingOpportunityStatus;
}

interface BuyingOpportunityResponse {
  id: string;
  spz: string;
  status: BuyingOpportunityStatus;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  data: BuyingOpportunityResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createSupabaseClient(authHeader: string | null): SupabaseClient {
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

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, code: string, status: number): Response {
  const body: ErrorResponse = { error: message, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// HANDLER: CREATE
// =============================================================================

async function handleCreate(
  req: Request,
  supabase: SupabaseClient
): Promise<Response> {
  let body: CreateBuyingOpportunityRequest;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_JSON', 400);
  }

  const { spz } = body;

  if (!spz || typeof spz !== 'string') {
    return errorResponse('SPZ is required', 'MISSING_SPZ', 400);
  }

  // Normalize SPZ: uppercase and remove spaces
  const normalizedSpz = spz.toUpperCase().replace(/\s/g, '');

  if (normalizedSpz.length < 1 || normalizedSpz.length > 20) {
    return errorResponse('SPZ must be between 1 and 20 characters', 'INVALID_SPZ', 400);
  }

  const { data, error } = await supabase
    .from('buying_opportunities')
    .insert({ spz: normalizedSpz, status: 'DRAFT' })
    .select('id, spz, status, created_at, updated_at')
    .single();

  if (error) {
    console.error('[Create] Database error:', error);

    // Handle duplicate key error
    if (error.code === '23505') {
      return errorResponse(
        `Buying opportunity with SPZ "${normalizedSpz}" already exists`,
        'DUPLICATE_SPZ',
        409
      );
    }

    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  return jsonResponse(data, 201);
}

// =============================================================================
// HANDLER: GET (by ID or SPZ)
// =============================================================================

async function handleGet(
  url: URL,
  supabase: SupabaseClient
): Promise<Response> {
  const id = url.searchParams.get('id');
  const spz = url.searchParams.get('spz');

  if (!id && !spz) {
    return errorResponse('Either id or spz query parameter is required', 'MISSING_PARAMETER', 400);
  }

  let query = supabase
    .from('buying_opportunities')
    .select('id, spz, status, created_at, updated_at');

  if (id) {
    query = query.eq('id', id);
  } else if (spz) {
    // Normalize SPZ for lookup
    const normalizedSpz = spz.toUpperCase().replace(/\s/g, '');
    query = query.eq('spz', normalizedSpz);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[Get] Database error:', error);

    if (error.code === 'PGRST116') {
      return errorResponse('Buying opportunity not found', 'NOT_FOUND', 404);
    }

    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  return jsonResponse(data);
}

// =============================================================================
// HANDLER: LIST (paginated)
// =============================================================================

async function handleList(
  url: URL,
  supabase: SupabaseClient
): Promise<Response> {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const status = url.searchParams.get('status');
  const offset = (page - 1) * limit;

  // Build query for data
  let dataQuery = supabase
    .from('buying_opportunities')
    .select('id, spz, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Build query for count
  let countQuery = supabase
    .from('buying_opportunities')
    .select('*', { count: 'exact', head: true });

  // Apply status filter if provided
  if (status) {
    const validStatuses = ['DRAFT', 'PENDING', 'VALIDATED', 'REJECTED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return errorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        'INVALID_STATUS',
        400
      );
    }
    dataQuery = dataQuery.eq('status', status.toUpperCase());
    countQuery = countQuery.eq('status', status.toUpperCase());
  }

  // Execute both queries
  const [dataResult, countResult] = await Promise.all([
    dataQuery,
    countQuery,
  ]);

  if (dataResult.error) {
    console.error('[List] Database error:', dataResult.error);
    return errorResponse(dataResult.error.message, 'DATABASE_ERROR', 500);
  }

  const response: ListResponse = {
    data: dataResult.data ?? [],
    pagination: {
      page,
      limit,
      total: countResult.count ?? 0,
    },
  };

  return jsonResponse(response);
}

// =============================================================================
// HANDLER: UPDATE
// =============================================================================

async function handleUpdate(
  req: Request,
  url: URL,
  supabase: SupabaseClient
): Promise<Response> {
  // Extract ID from path: /buying-opportunity/{id}
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'buying-opportunity') {
    return errorResponse('ID is required in URL path', 'MISSING_ID', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return errorResponse('Invalid ID format', 'INVALID_ID', 400);
  }

  let body: UpdateBuyingOpportunityRequest;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_JSON', 400);
  }

  const { status } = body;

  if (!status) {
    return errorResponse('Status is required', 'MISSING_STATUS', 400);
  }

  const validStatuses: BuyingOpportunityStatus[] = ['DRAFT', 'PENDING', 'VALIDATED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    return errorResponse(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      'INVALID_STATUS',
      400
    );
  }

  const { data, error } = await supabase
    .from('buying_opportunities')
    .update({ status })
    .eq('id', id)
    .select('id, spz, status, created_at, updated_at')
    .single();

  if (error) {
    console.error('[Update] Database error:', error);

    if (error.code === 'PGRST116') {
      return errorResponse('Buying opportunity not found', 'NOT_FOUND', 404);
    }

    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  return jsonResponse(data);
}

// =============================================================================
// HANDLER: DELETE
// =============================================================================

async function handleDelete(
  url: URL,
  supabase: SupabaseClient
): Promise<Response> {
  // Extract ID from path: /buying-opportunity/{id}
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'buying-opportunity') {
    return errorResponse('ID is required in URL path', 'MISSING_ID', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return errorResponse('Invalid ID format', 'INVALID_ID', 400);
  }

  // First check if the record exists
  const { data: existing, error: fetchError } = await supabase
    .from('buying_opportunities')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return errorResponse('Buying opportunity not found', 'NOT_FOUND', 404);
  }

  // Delete the record (cascade will handle related records)
  const { error } = await supabase
    .from('buying_opportunities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Delete] Database error:', error);
    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  // Return 204 No Content on successful deletion
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// =============================================================================
// MAIN ROUTER
// =============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;
    const authHeader = req.headers.get('authorization');

    // Check for authentication
    if (!authHeader) {
      return errorResponse('Authorization header is required', 'UNAUTHORIZED', 401);
    }

    const supabase = createSupabaseClient(authHeader);

    // Route handling
    // Check if path ends with /list for listing
    if (method === 'GET' && url.pathname.endsWith('/list')) {
      return await handleList(url, supabase);
    }

    // Standard CRUD operations
    switch (method) {
      case 'POST':
        return await handleCreate(req, supabase);

      case 'GET':
        return await handleGet(url, supabase);

      case 'PUT':
        return await handleUpdate(req, url, supabase);

      case 'DELETE':
        return await handleDelete(url, supabase);

      default:
        return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
    }
  } catch (error) {
    console.error('[Router] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 'INTERNAL_ERROR', 500);
  }
});
