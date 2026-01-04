/**
 * SecureDealAI MVP - Vendor CRUD Edge Function
 *
 * Endpoints:
 * - POST /vendor - Create vendor for buying opportunity
 * - GET /vendor?id={id} - Get by ID
 * - GET /vendor?buying_opportunity_id={id} - Get by buying opportunity
 * - PUT /vendor/{id} - Update vendor data
 * - DELETE /vendor/{id} - Delete vendor
 *
 * Supports both Physical Persons (FO) and Companies (PO)
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

type VendorType = 'PHYSICAL_PERSON' | 'COMPANY';
type DataSource = 'MANUAL' | 'OCR' | 'BC_IMPORT';

interface CreateVendorRequest {
  buying_opportunity_id: string;
  vendor_type: VendorType;
  name: string;

  // FO specific (Physical Person)
  personal_id?: string;          // Rodne cislo (######/####)
  date_of_birth?: string;        // YYYY-MM-DD
  place_of_birth?: string;

  // PO specific (Company)
  company_id?: string;           // ICO (8 digits)
  vat_id?: string;               // DIC (CZxxxxxxxx)

  // Address
  address_street?: string;
  address_city?: string;
  address_postal_code?: string;
  country_code?: string;

  // Contact
  phone?: string;
  email?: string;
  bank_account?: string;

  // ID Document (for FO)
  document_number?: string;
  document_issue_date?: string;
  document_expiry_date?: string;
  issuing_authority?: string;

  // Metadata
  data_source?: DataSource;
}

interface UpdateVendorRequest {
  vendor_type?: VendorType;
  name?: string;

  // FO specific
  personal_id?: string;
  date_of_birth?: string;
  place_of_birth?: string;

  // PO specific
  company_id?: string;
  vat_id?: string;

  // Address
  address_street?: string;
  address_city?: string;
  address_postal_code?: string;
  country_code?: string;

  // Contact
  phone?: string;
  email?: string;
  bank_account?: string;

  // ID Document
  document_number?: string;
  document_issue_date?: string;
  document_expiry_date?: string;
  issuing_authority?: string;

  // Metadata
  data_source?: DataSource;
  validation_status?: string;
}

interface VendorResponse {
  id: string;
  buying_opportunity_id: string;
  vendor_type: VendorType;
  name: string;
  personal_id: string | null;
  company_id: string | null;
  vat_id: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
  country_code: string;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  document_number: string | null;
  document_issue_date: string | null;
  document_expiry_date: string | null;
  issuing_authority: string | null;
  data_source: string;
  validation_status: string | null;
  created_at: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: string[];
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

function errorResponse(message: string, code: string, status: number, details?: string[]): Response {
  const body: ErrorResponse = { error: message, code };
  if (details && details.length > 0) {
    body.details = details;
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate Rodne cislo (Czech personal ID)
 * Format: ######/#### or ######/###
 */
function isValidRodneCislo(rc: string): boolean {
  return /^\d{6}\/\d{3,4}$/.test(rc);
}

/**
 * Validate ICO (Czech company ID)
 * Format: 8 digits
 */
function isValidICO(ico: string): boolean {
  return /^\d{8}$/.test(ico);
}

/**
 * Validate DIC (Czech VAT ID)
 * Format: CZ + 8-10 digits
 */
function isValidDIC(dic: string): boolean {
  return /^CZ\d{8,10}$/.test(dic);
}

/**
 * Validate date format
 * Format: YYYY-MM-DD
 */
function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Validate vendor input data
 */
function validateVendor(data: CreateVendorRequest): string[] {
  const errors: string[] = [];

  // Required fields
  if (!data.buying_opportunity_id) {
    errors.push('buying_opportunity_id is required');
  } else {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.buying_opportunity_id)) {
      errors.push('buying_opportunity_id must be a valid UUID');
    }
  }

  if (!data.vendor_type) {
    errors.push('vendor_type is required');
  } else if (!['PHYSICAL_PERSON', 'COMPANY'].includes(data.vendor_type)) {
    errors.push('vendor_type must be one of: PHYSICAL_PERSON, COMPANY');
  }

  if (!data.name) {
    errors.push('name is required');
  }

  // Vendor type specific validation
  if (data.vendor_type === 'PHYSICAL_PERSON') {
    if (!data.personal_id) {
      errors.push('personal_id is required for PHYSICAL_PERSON');
    } else if (!isValidRodneCislo(data.personal_id)) {
      errors.push('Invalid personal_id format (expected ######/#### or ######/###)');
    }
  }

  if (data.vendor_type === 'COMPANY') {
    if (!data.company_id) {
      errors.push('company_id is required for COMPANY');
    } else if (!isValidICO(data.company_id)) {
      errors.push('Invalid company_id format (expected 8 digits)');
    }

    if (data.vat_id && !isValidDIC(data.vat_id)) {
      errors.push('Invalid vat_id format (expected CZxxxxxxxx)');
    }
  }

  // Date format validations
  if (data.date_of_birth && !isValidDateFormat(data.date_of_birth)) {
    errors.push('date_of_birth must be in YYYY-MM-DD format');
  }

  if (data.document_issue_date && !isValidDateFormat(data.document_issue_date)) {
    errors.push('document_issue_date must be in YYYY-MM-DD format');
  }

  if (data.document_expiry_date && !isValidDateFormat(data.document_expiry_date)) {
    errors.push('document_expiry_date must be in YYYY-MM-DD format');
  }

  // Data source validation
  if (data.data_source && !['MANUAL', 'OCR', 'BC_IMPORT'].includes(data.data_source)) {
    errors.push('data_source must be one of: MANUAL, OCR, BC_IMPORT');
  }

  return errors;
}

// =============================================================================
// HANDLER: CREATE
// =============================================================================

async function handleCreate(
  req: Request,
  supabase: SupabaseClient
): Promise<Response> {
  let body: CreateVendorRequest;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_JSON', 400);
  }

  // Validate input
  const validationErrors = validateVendor(body);
  if (validationErrors.length > 0) {
    return errorResponse('Validation failed', 'VALIDATION_ERROR', 400, validationErrors);
  }

  // Prepare insert data
  const insertData: Record<string, unknown> = {
    buying_opportunity_id: body.buying_opportunity_id,
    vendor_type: body.vendor_type,
    name: body.name,
    personal_id: body.personal_id || null,
    company_id: body.company_id || null,
    vat_id: body.vat_id || null,
    date_of_birth: body.date_of_birth || null,
    place_of_birth: body.place_of_birth || null,
    address_street: body.address_street || null,
    address_city: body.address_city || null,
    address_postal_code: body.address_postal_code || null,
    country_code: body.country_code || 'CZ',
    phone: body.phone || null,
    email: body.email || null,
    bank_account: body.bank_account || null,
    document_number: body.document_number || null,
    document_issue_date: body.document_issue_date || null,
    document_expiry_date: body.document_expiry_date || null,
    issuing_authority: body.issuing_authority || null,
    data_source: body.data_source || 'MANUAL',
  };

  const { data, error } = await supabase
    .from('vendors')
    .insert(insertData)
    .select(`
      id, buying_opportunity_id, vendor_type, name,
      personal_id, company_id, vat_id,
      date_of_birth, place_of_birth,
      address_street, address_city, address_postal_code, country_code,
      phone, email, bank_account,
      document_number, document_issue_date, document_expiry_date, issuing_authority,
      data_source, validation_status, created_at
    `)
    .single();

  if (error) {
    console.error('[Create] Database error:', error);

    // Handle foreign key violation (buying_opportunity_id doesn't exist)
    if (error.code === '23503') {
      return errorResponse(
        'Buying opportunity not found',
        'BUYING_OPPORTUNITY_NOT_FOUND',
        404
      );
    }

    // Handle unique constraint violation (vendor already exists for this buying opportunity)
    if (error.code === '23505') {
      return errorResponse(
        'Vendor already exists for this buying opportunity',
        'DUPLICATE_VENDOR',
        409
      );
    }

    // Handle check constraint violation (vendor_id_check)
    if (error.code === '23514') {
      return errorResponse(
        'Vendor type validation failed: PHYSICAL_PERSON requires personal_id, COMPANY requires company_id',
        'CONSTRAINT_VIOLATION',
        400
      );
    }

    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  return jsonResponse(data, 201);
}

// =============================================================================
// HANDLER: GET (by ID or buying_opportunity_id)
// =============================================================================

async function handleGet(
  url: URL,
  supabase: SupabaseClient
): Promise<Response> {
  const id = url.searchParams.get('id');
  const buyingOpportunityId = url.searchParams.get('buying_opportunity_id');

  if (!id && !buyingOpportunityId) {
    return errorResponse(
      'Either id or buying_opportunity_id query parameter is required',
      'MISSING_PARAMETER',
      400
    );
  }

  const selectFields = `
    id, buying_opportunity_id, vendor_type, name,
    personal_id, company_id, vat_id,
    date_of_birth, place_of_birth,
    address_street, address_city, address_postal_code, country_code,
    phone, email, bank_account,
    document_number, document_issue_date, document_expiry_date, issuing_authority,
    data_source, validation_status, created_at
  `;

  let query = supabase.from('vendors').select(selectFields);

  if (id) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse('Invalid ID format', 'INVALID_ID', 400);
    }
    query = query.eq('id', id);
  } else if (buyingOpportunityId) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(buyingOpportunityId)) {
      return errorResponse('Invalid buying_opportunity_id format', 'INVALID_ID', 400);
    }
    query = query.eq('buying_opportunity_id', buyingOpportunityId);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[Get] Database error:', error);

    if (error.code === 'PGRST116') {
      return errorResponse('Vendor not found', 'NOT_FOUND', 404);
    }

    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  return jsonResponse(data);
}

// =============================================================================
// HANDLER: UPDATE
// =============================================================================

async function handleUpdate(
  req: Request,
  url: URL,
  supabase: SupabaseClient
): Promise<Response> {
  // Extract ID from path: /vendor/{id}
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'vendor') {
    return errorResponse('ID is required in URL path', 'MISSING_ID', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return errorResponse('Invalid ID format', 'INVALID_ID', 400);
  }

  let body: UpdateVendorRequest;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_JSON', 400);
  }

  // Validate specific fields if provided
  const errors: string[] = [];

  if (body.vendor_type && !['PHYSICAL_PERSON', 'COMPANY'].includes(body.vendor_type)) {
    errors.push('vendor_type must be one of: PHYSICAL_PERSON, COMPANY');
  }

  if (body.personal_id && !isValidRodneCislo(body.personal_id)) {
    errors.push('Invalid personal_id format (expected ######/#### or ######/###)');
  }

  if (body.company_id && !isValidICO(body.company_id)) {
    errors.push('Invalid company_id format (expected 8 digits)');
  }

  if (body.vat_id && !isValidDIC(body.vat_id)) {
    errors.push('Invalid vat_id format (expected CZxxxxxxxx)');
  }

  if (body.date_of_birth && !isValidDateFormat(body.date_of_birth)) {
    errors.push('date_of_birth must be in YYYY-MM-DD format');
  }

  if (body.document_issue_date && !isValidDateFormat(body.document_issue_date)) {
    errors.push('document_issue_date must be in YYYY-MM-DD format');
  }

  if (body.document_expiry_date && !isValidDateFormat(body.document_expiry_date)) {
    errors.push('document_expiry_date must be in YYYY-MM-DD format');
  }

  if (body.data_source && !['MANUAL', 'OCR', 'BC_IMPORT'].includes(body.data_source)) {
    errors.push('data_source must be one of: MANUAL, OCR, BC_IMPORT');
  }

  if (errors.length > 0) {
    return errorResponse('Validation failed', 'VALIDATION_ERROR', 400, errors);
  }

  // Build update object
  const updateData: Record<string, unknown> = {};

  if (body.vendor_type !== undefined) {
    updateData.vendor_type = body.vendor_type;
  }
  if (body.name !== undefined) {
    updateData.name = body.name;
  }
  if (body.personal_id !== undefined) {
    updateData.personal_id = body.personal_id;
  }
  if (body.company_id !== undefined) {
    updateData.company_id = body.company_id;
  }
  if (body.vat_id !== undefined) {
    updateData.vat_id = body.vat_id;
  }
  if (body.date_of_birth !== undefined) {
    updateData.date_of_birth = body.date_of_birth;
  }
  if (body.place_of_birth !== undefined) {
    updateData.place_of_birth = body.place_of_birth;
  }
  if (body.address_street !== undefined) {
    updateData.address_street = body.address_street;
  }
  if (body.address_city !== undefined) {
    updateData.address_city = body.address_city;
  }
  if (body.address_postal_code !== undefined) {
    updateData.address_postal_code = body.address_postal_code;
  }
  if (body.country_code !== undefined) {
    updateData.country_code = body.country_code;
  }
  if (body.phone !== undefined) {
    updateData.phone = body.phone;
  }
  if (body.email !== undefined) {
    updateData.email = body.email;
  }
  if (body.bank_account !== undefined) {
    updateData.bank_account = body.bank_account;
  }
  if (body.document_number !== undefined) {
    updateData.document_number = body.document_number;
  }
  if (body.document_issue_date !== undefined) {
    updateData.document_issue_date = body.document_issue_date;
  }
  if (body.document_expiry_date !== undefined) {
    updateData.document_expiry_date = body.document_expiry_date;
  }
  if (body.issuing_authority !== undefined) {
    updateData.issuing_authority = body.issuing_authority;
  }
  if (body.data_source !== undefined) {
    updateData.data_source = body.data_source;
  }
  if (body.validation_status !== undefined) {
    updateData.validation_status = body.validation_status;
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse('No fields to update', 'NO_FIELDS', 400);
  }

  const selectFields = `
    id, buying_opportunity_id, vendor_type, name,
    personal_id, company_id, vat_id,
    date_of_birth, place_of_birth,
    address_street, address_city, address_postal_code, country_code,
    phone, email, bank_account,
    document_number, document_issue_date, document_expiry_date, issuing_authority,
    data_source, validation_status, created_at
  `;

  const { data, error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .select(selectFields)
    .single();

  if (error) {
    console.error('[Update] Database error:', error);

    if (error.code === 'PGRST116') {
      return errorResponse('Vendor not found', 'NOT_FOUND', 404);
    }

    // Handle check constraint violation (vendor_id_check)
    if (error.code === '23514') {
      return errorResponse(
        'Vendor type validation failed: PHYSICAL_PERSON requires personal_id, COMPANY requires company_id',
        'CONSTRAINT_VIOLATION',
        400
      );
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
  // Extract ID from path: /vendor/{id}
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'vendor') {
    return errorResponse('ID is required in URL path', 'MISSING_ID', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return errorResponse('Invalid ID format', 'INVALID_ID', 400);
  }

  // First check if the record exists
  const { data: existing, error: fetchError } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return errorResponse('Vendor not found', 'NOT_FOUND', 404);
  }

  // Delete the record
  const { error } = await supabase
    .from('vendors')
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
