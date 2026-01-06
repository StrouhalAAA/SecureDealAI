/**
 * SecureDealAI MVP - Vehicle CRUD Edge Function
 *
 * Endpoints:
 * - POST /vehicle - Create vehicle for buying opportunity
 * - GET /vehicle?id={id} - Get by ID
 * - GET /vehicle?buying_opportunity_id={id} - Get by buying opportunity
 * - GET /vehicle?spz={spz} - Get by SPZ
 * - PUT /vehicle/{id} - Update vehicle data
 * - DELETE /vehicle/{id} - Delete vehicle
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

type DataSource = 'MANUAL' | 'OCR' | 'BC_IMPORT';

// Phase 7.1: Fraud detection fields
interface FraudDetectionFields {
  tachometer_km?: number;
  datum_posledni_preregistrace?: string;
}

// Phase 7.2: OCR-extractable fields
interface OCRExtractableFields {
  barva?: string;
  palivo?: string;
  objem_motoru?: number;
  pocet_mist?: number;
  max_rychlost?: number;
  kategorie_vozidla?: string;
}

// Phase 7.3: Extended VTP fields
interface ExtendedVTPFields {
  karoserie?: string;
  cislo_motoru?: string;
  provozni_hmotnost?: number;
  povolena_hmotnost?: number;
  delka?: number;
  sirka?: number;
  vyska?: number;
  rozvor?: number;
  emise_co2?: string;
  spotreba_paliva?: string;
  emisni_norma?: string;
  datum_stk?: string;
  stk_platnost?: string;
}

interface CreateVehicleRequest extends FraudDetectionFields, OCRExtractableFields, ExtendedVTPFields {
  buying_opportunity_id: string;
  spz: string;
  vin?: string;
  znacka?: string;
  model?: string;
  rok_vyroby?: number;
  datum_1_registrace?: string;
  majitel?: string;
  motor?: string;
  vykon_kw?: number;
  data_source?: DataSource;
}

interface UpdateVehicleRequest extends FraudDetectionFields, OCRExtractableFields, ExtendedVTPFields {
  spz?: string;
  vin?: string;
  znacka?: string;
  model?: string;
  rok_vyroby?: number;
  datum_1_registrace?: string;
  majitel?: string;
  motor?: string;
  vykon_kw?: number;
  data_source?: DataSource;
  validation_status?: string;
}

interface VehicleResponse extends FraudDetectionFields, OCRExtractableFields, ExtendedVTPFields {
  id: string;
  buying_opportunity_id: string;
  spz: string;
  vin: string | null;
  znacka: string | null;
  model: string | null;
  rok_vyroby: number | null;
  datum_1_registrace: string | null;
  majitel: string | null;
  motor: string | null;
  vykon_kw: number | null;
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
// VALIDATION CONSTANTS
// =============================================================================

const FUEL_TYPES = ['BA', 'NM', 'EL', 'LPG', 'CNG', 'H', 'HYBRID', 'BA/LPG', 'BA/CNG', 'EL/BA', 'EL/NM'];
const VEHICLE_CATEGORIES = ['M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

// Numeric field validation ranges
const NUMERIC_FIELD_RANGES: { name: string; min: number; max: number }[] = [
  { name: 'tachometer_km', min: 0, max: 2000000 },
  { name: 'objem_motoru', min: 0, max: 20000 },
  { name: 'pocet_mist', min: 1, max: 100 },
  { name: 'max_rychlost', min: 0, max: 500 },
  { name: 'vykon_kw', min: 0, max: 2000 },
  { name: 'provozni_hmotnost', min: 0, max: 100000 },
  { name: 'povolena_hmotnost', min: 0, max: 100000 },
  { name: 'delka', min: 0, max: 30000 },
  { name: 'sirka', min: 0, max: 5000 },
  { name: 'vyska', min: 0, max: 5000 },
  { name: 'rozvor', min: 0, max: 10000 },
];

// All vehicle columns for SELECT queries (Phase 7 extended)
const VEHICLE_COLUMNS = [
  // Metadata
  'id', 'buying_opportunity_id', 'created_at',
  // Original fields
  'spz', 'vin', 'znacka', 'model', 'rok_vyroby', 'datum_1_registrace',
  'majitel', 'motor', 'vykon_kw', 'data_source', 'validation_status',
  // Phase 7.1: Fraud detection
  'tachometer_km', 'datum_posledni_preregistrace',
  // Phase 7.2: OCR-extractable
  'barva', 'palivo', 'objem_motoru', 'pocet_mist', 'max_rychlost', 'kategorie_vozidla',
  // Phase 7.3: Extended VTP
  'karoserie', 'cislo_motoru', 'provozni_hmotnost', 'povolena_hmotnost',
  'delka', 'sirka', 'vyska', 'rozvor',
  'emise_co2', 'spotreba_paliva', 'emisni_norma',
  'datum_stk', 'stk_platnost',
];

// Columns that can be inserted/updated (excludes id, created_at)
const UPDATABLE_COLUMNS = VEHICLE_COLUMNS.filter(col => col !== 'id' && col !== 'created_at');
const INSERTABLE_COLUMNS = UPDATABLE_COLUMNS.filter(col => col !== 'buying_opportunity_id' || true);

// =============================================================================
// VALIDATION
// =============================================================================

function validateVehicle(data: CreateVehicleRequest): string[] {
  const errors: string[] = [];

  if (!data.buying_opportunity_id) {
    errors.push('buying_opportunity_id is required');
  } else {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.buying_opportunity_id)) {
      errors.push('buying_opportunity_id must be a valid UUID');
    }
  }

  if (!data.spz) {
    errors.push('spz is required');
  }

  if (data.vin && data.vin.length !== 17) {
    errors.push('VIN must be exactly 17 characters');
  }

  if (data.rok_vyroby !== undefined && data.rok_vyroby !== null) {
    const currentYear = new Date().getFullYear();
    if (data.rok_vyroby < 1900 || data.rok_vyroby > currentYear + 1) {
      errors.push(`rok_vyroby must be between 1900 and ${currentYear + 1}`);
    }
  }

  if (data.datum_1_registrace) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.datum_1_registrace)) {
      errors.push('datum_1_registrace must be in YYYY-MM-DD format');
    }
  }

  if (data.data_source && !['MANUAL', 'OCR', 'BC_IMPORT'].includes(data.data_source)) {
    errors.push('data_source must be one of: MANUAL, OCR, BC_IMPORT');
  }

  // Phase 7.1: Fraud detection validation
  if (data.datum_posledni_preregistrace) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.datum_posledni_preregistrace)) {
      errors.push('datum_posledni_preregistrace must be in YYYY-MM-DD format');
    }
  }

  // Phase 7.2: OCR field validation
  if (data.palivo !== undefined && data.palivo !== null) {
    if (!FUEL_TYPES.includes(data.palivo.toUpperCase())) {
      errors.push(`palivo must be one of: ${FUEL_TYPES.join(', ')}`);
    }
  }

  if (data.kategorie_vozidla !== undefined && data.kategorie_vozidla !== null) {
    if (!VEHICLE_CATEGORIES.includes(data.kategorie_vozidla.toUpperCase())) {
      errors.push(`kategorie_vozidla must be one of: ${VEHICLE_CATEGORIES.join(', ')}`);
    }
  }

  // Phase 7.3: STK date validation
  if (data.datum_stk) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.datum_stk)) {
      errors.push('datum_stk must be in YYYY-MM-DD format');
    }
  }

  if (data.stk_platnost) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.stk_platnost)) {
      errors.push('stk_platnost must be in YYYY-MM-DD format');
    }
  }

  // Numeric field range validation (Phase 7.1, 7.2, 7.3)
  for (const { name, min, max } of NUMERIC_FIELD_RANGES) {
    const value = (data as unknown as Record<string, unknown>)[name];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < min || value > max) {
        errors.push(`${name} must be a number between ${min} and ${max}`);
      }
    }
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
  let body: CreateVehicleRequest;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_JSON', 400);
  }

  // Validate input
  const validationErrors = validateVehicle(body);
  if (validationErrors.length > 0) {
    return errorResponse('Validation failed', 'VALIDATION_ERROR', 400, validationErrors);
  }

  // Normalize SPZ: uppercase and remove spaces
  const normalizedSpz = body.spz.toUpperCase().replace(/\s/g, '');

  // Normalize VIN: uppercase and remove spaces (if provided)
  const normalizedVin = body.vin ? body.vin.toUpperCase().replace(/\s/g, '') : null;

  // Prepare insert data - dynamically include all Phase 7 fields
  const insertData: Record<string, unknown> = {
    buying_opportunity_id: body.buying_opportunity_id,
    spz: normalizedSpz,
    vin: normalizedVin,
    data_source: body.data_source || 'MANUAL',
  };

  // Original fields
  if (body.znacka !== undefined) insertData.znacka = body.znacka;
  if (body.model !== undefined) insertData.model = body.model;
  if (body.rok_vyroby !== undefined) insertData.rok_vyroby = body.rok_vyroby;
  if (body.datum_1_registrace !== undefined) insertData.datum_1_registrace = body.datum_1_registrace;
  if (body.majitel !== undefined) insertData.majitel = body.majitel;
  if (body.motor !== undefined) insertData.motor = body.motor;
  if (body.vykon_kw !== undefined) insertData.vykon_kw = body.vykon_kw;

  // Phase 7.1: Fraud detection fields
  if (body.tachometer_km !== undefined) insertData.tachometer_km = body.tachometer_km;
  if (body.datum_posledni_preregistrace !== undefined) insertData.datum_posledni_preregistrace = body.datum_posledni_preregistrace;

  // Phase 7.2: OCR-extractable fields
  if (body.barva !== undefined) insertData.barva = body.barva;
  if (body.palivo !== undefined) insertData.palivo = body.palivo?.toUpperCase();
  if (body.objem_motoru !== undefined) insertData.objem_motoru = body.objem_motoru;
  if (body.pocet_mist !== undefined) insertData.pocet_mist = body.pocet_mist;
  if (body.max_rychlost !== undefined) insertData.max_rychlost = body.max_rychlost;
  if (body.kategorie_vozidla !== undefined) insertData.kategorie_vozidla = body.kategorie_vozidla?.toUpperCase();

  // Phase 7.3: Extended VTP fields
  if (body.karoserie !== undefined) insertData.karoserie = body.karoserie;
  if (body.cislo_motoru !== undefined) insertData.cislo_motoru = body.cislo_motoru;
  if (body.provozni_hmotnost !== undefined) insertData.provozni_hmotnost = body.provozni_hmotnost;
  if (body.povolena_hmotnost !== undefined) insertData.povolena_hmotnost = body.povolena_hmotnost;
  if (body.delka !== undefined) insertData.delka = body.delka;
  if (body.sirka !== undefined) insertData.sirka = body.sirka;
  if (body.vyska !== undefined) insertData.vyska = body.vyska;
  if (body.rozvor !== undefined) insertData.rozvor = body.rozvor;
  if (body.emise_co2 !== undefined) insertData.emise_co2 = body.emise_co2;
  if (body.spotreba_paliva !== undefined) insertData.spotreba_paliva = body.spotreba_paliva;
  if (body.emisni_norma !== undefined) insertData.emisni_norma = body.emisni_norma;
  if (body.datum_stk !== undefined) insertData.datum_stk = body.datum_stk;
  if (body.stk_platnost !== undefined) insertData.stk_platnost = body.stk_platnost;

  const { data, error } = await supabase
    .from('vehicles')
    .insert(insertData)
    .select(VEHICLE_COLUMNS.join(', '))
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

    // Handle unique constraint violation (vehicle already exists for this buying opportunity)
    if (error.code === '23505') {
      return errorResponse(
        'Vehicle already exists for this buying opportunity',
        'DUPLICATE_VEHICLE',
        409
      );
    }

    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  return jsonResponse(data, 201);
}

// =============================================================================
// HANDLER: GET (by ID, buying_opportunity_id, or SPZ)
// =============================================================================

async function handleGet(
  url: URL,
  supabase: SupabaseClient
): Promise<Response> {
  const id = url.searchParams.get('id');
  const buyingOpportunityId = url.searchParams.get('buying_opportunity_id');
  const spz = url.searchParams.get('spz');

  if (!id && !buyingOpportunityId && !spz) {
    return errorResponse(
      'Either id, buying_opportunity_id, or spz query parameter is required',
      'MISSING_PARAMETER',
      400
    );
  }

  let query = supabase
    .from('vehicles')
    .select(VEHICLE_COLUMNS.join(', '));

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
  } else if (spz) {
    // Normalize SPZ for lookup
    const normalizedSpz = spz.toUpperCase().replace(/\s/g, '');
    query = query.eq('spz', normalizedSpz);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[Get] Database error:', error);

    if (error.code === 'PGRST116') {
      return errorResponse('Vehicle not found', 'NOT_FOUND', 404);
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
  // Extract ID from path: /vehicle/{id}
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'vehicle') {
    return errorResponse('ID is required in URL path', 'MISSING_ID', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return errorResponse('Invalid ID format', 'INVALID_ID', 400);
  }

  let body: UpdateVehicleRequest;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_JSON', 400);
  }

  // Validate specific fields if provided
  const errors: string[] = [];

  if (body.vin !== undefined && body.vin !== null && body.vin.length !== 17) {
    errors.push('VIN must be exactly 17 characters');
  }

  if (body.rok_vyroby !== undefined && body.rok_vyroby !== null) {
    const currentYear = new Date().getFullYear();
    if (body.rok_vyroby < 1900 || body.rok_vyroby > currentYear + 1) {
      errors.push(`rok_vyroby must be between 1900 and ${currentYear + 1}`);
    }
  }

  if (body.datum_1_registrace) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.datum_1_registrace)) {
      errors.push('datum_1_registrace must be in YYYY-MM-DD format');
    }
  }

  if (body.data_source && !['MANUAL', 'OCR', 'BC_IMPORT'].includes(body.data_source)) {
    errors.push('data_source must be one of: MANUAL, OCR, BC_IMPORT');
  }

  // Phase 7.1: Fraud detection validation
  if (body.datum_posledni_preregistrace) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.datum_posledni_preregistrace)) {
      errors.push('datum_posledni_preregistrace must be in YYYY-MM-DD format');
    }
  }

  // Phase 7.2: OCR field validation
  if (body.palivo !== undefined && body.palivo !== null) {
    if (!FUEL_TYPES.includes(body.palivo.toUpperCase())) {
      errors.push(`palivo must be one of: ${FUEL_TYPES.join(', ')}`);
    }
  }

  if (body.kategorie_vozidla !== undefined && body.kategorie_vozidla !== null) {
    if (!VEHICLE_CATEGORIES.includes(body.kategorie_vozidla.toUpperCase())) {
      errors.push(`kategorie_vozidla must be one of: ${VEHICLE_CATEGORIES.join(', ')}`);
    }
  }

  // Phase 7.3: STK date validation
  if (body.datum_stk) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.datum_stk)) {
      errors.push('datum_stk must be in YYYY-MM-DD format');
    }
  }

  if (body.stk_platnost) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.stk_platnost)) {
      errors.push('stk_platnost must be in YYYY-MM-DD format');
    }
  }

  // Numeric field range validation
  for (const { name, min, max } of NUMERIC_FIELD_RANGES) {
    const value = (body as Record<string, unknown>)[name];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < min || value > max) {
        errors.push(`${name} must be a number between ${min} and ${max}`);
      }
    }
  }

  if (errors.length > 0) {
    return errorResponse('Validation failed', 'VALIDATION_ERROR', 400, errors);
  }

  // Build update object with normalized values
  const updateData: Record<string, unknown> = {};

  // Original fields
  if (body.spz !== undefined) {
    updateData.spz = body.spz.toUpperCase().replace(/\s/g, '');
  }
  if (body.vin !== undefined) {
    updateData.vin = body.vin ? body.vin.toUpperCase().replace(/\s/g, '') : null;
  }
  if (body.znacka !== undefined) updateData.znacka = body.znacka;
  if (body.model !== undefined) updateData.model = body.model;
  if (body.rok_vyroby !== undefined) updateData.rok_vyroby = body.rok_vyroby;
  if (body.datum_1_registrace !== undefined) updateData.datum_1_registrace = body.datum_1_registrace;
  if (body.majitel !== undefined) updateData.majitel = body.majitel;
  if (body.motor !== undefined) updateData.motor = body.motor;
  if (body.vykon_kw !== undefined) updateData.vykon_kw = body.vykon_kw;
  if (body.data_source !== undefined) updateData.data_source = body.data_source;
  if (body.validation_status !== undefined) updateData.validation_status = body.validation_status;

  // Phase 7.1: Fraud detection fields
  if (body.tachometer_km !== undefined) updateData.tachometer_km = body.tachometer_km;
  if (body.datum_posledni_preregistrace !== undefined) updateData.datum_posledni_preregistrace = body.datum_posledni_preregistrace;

  // Phase 7.2: OCR-extractable fields
  if (body.barva !== undefined) updateData.barva = body.barva;
  if (body.palivo !== undefined) updateData.palivo = body.palivo?.toUpperCase();
  if (body.objem_motoru !== undefined) updateData.objem_motoru = body.objem_motoru;
  if (body.pocet_mist !== undefined) updateData.pocet_mist = body.pocet_mist;
  if (body.max_rychlost !== undefined) updateData.max_rychlost = body.max_rychlost;
  if (body.kategorie_vozidla !== undefined) updateData.kategorie_vozidla = body.kategorie_vozidla?.toUpperCase();

  // Phase 7.3: Extended VTP fields
  if (body.karoserie !== undefined) updateData.karoserie = body.karoserie;
  if (body.cislo_motoru !== undefined) updateData.cislo_motoru = body.cislo_motoru;
  if (body.provozni_hmotnost !== undefined) updateData.provozni_hmotnost = body.provozni_hmotnost;
  if (body.povolena_hmotnost !== undefined) updateData.povolena_hmotnost = body.povolena_hmotnost;
  if (body.delka !== undefined) updateData.delka = body.delka;
  if (body.sirka !== undefined) updateData.sirka = body.sirka;
  if (body.vyska !== undefined) updateData.vyska = body.vyska;
  if (body.rozvor !== undefined) updateData.rozvor = body.rozvor;
  if (body.emise_co2 !== undefined) updateData.emise_co2 = body.emise_co2;
  if (body.spotreba_paliva !== undefined) updateData.spotreba_paliva = body.spotreba_paliva;
  if (body.emisni_norma !== undefined) updateData.emisni_norma = body.emisni_norma;
  if (body.datum_stk !== undefined) updateData.datum_stk = body.datum_stk;
  if (body.stk_platnost !== undefined) updateData.stk_platnost = body.stk_platnost;

  if (Object.keys(updateData).length === 0) {
    return errorResponse('No fields to update', 'NO_FIELDS', 400);
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update(updateData)
    .eq('id', id)
    .select(VEHICLE_COLUMNS.join(', '))
    .single();

  if (error) {
    console.error('[Update] Database error:', error);

    if (error.code === 'PGRST116') {
      return errorResponse('Vehicle not found', 'NOT_FOUND', 404);
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
  // Extract ID from path: /vehicle/{id}
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'vehicle') {
    return errorResponse('ID is required in URL path', 'MISSING_ID', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return errorResponse('Invalid ID format', 'INVALID_ID', 400);
  }

  // First check if the record exists
  const { data: existing, error: fetchError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return errorResponse('Vehicle not found', 'NOT_FOUND', 404);
  }

  // Delete the record
  const { error } = await supabase
    .from('vehicles')
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
