/**
 * SecureDealAI MVP - Document Upload Edge Function
 *
 * Endpoint:
 * - POST /document-upload - Upload document (ORV, VTP, OP) to Supabase Storage
 *
 * Request (multipart/form-data):
 * - file: Document file (PDF, JPEG, PNG) - required
 * - spz: License plate (links to buying opportunity) - optional (placeholder generated if not provided)
 * - document_type: ORV, VTP, or OP - required
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for storage operations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// TYPES
// =============================================================================

type DocumentType = 'ORV' | 'VTP' | 'OP';

interface DocumentUploadResponse {
  id: string;
  spz: string;
  document_type: DocumentType;
  document_file_path: string;
  ocr_status: 'PENDING';
  created_at: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
  errors?: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

const ALLOWED_DOCUMENT_TYPES: DocumentType[] = ['ORV', 'VTP', 'OP'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const STORAGE_BUCKET = 'documents';

// =============================================================================
// JWT VALIDATION
// =============================================================================

/**
 * Validates JWT token from Authorization header.
 * Since verify_jwt = false in config.toml (to allow OPTIONS preflight),
 * we must manually validate JWT for POST requests.
 */
async function validateJWT(authHeader: string | null): Promise<{ valid: boolean; error?: string }> {
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token || token === authHeader) {
    return { valid: false, error: 'Invalid Authorization header format' };
  }

  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) {
    console.error('[JWT] Missing JWT_SECRET environment variable');
    return { valid: false, error: 'Server configuration error' };
  }

  try {
    // Decode and verify JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const signatureInput = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode signature from base64url
    const signatureBytes = base64urlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(signatureInput)
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Decode payload and check expiration
    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true };
  } catch (err) {
    console.error('[JWT] Validation error:', err);
    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * Decode base64url to Uint8Array
 */
function base64urlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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

function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
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

function errorResponse(message: string, code: string, status: number, errors?: string[]): Response {
  const body: ErrorResponse = { error: message, code };
  if (errors && errors.length > 0) {
    body.errors = errors;
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// VALIDATION
// =============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  file?: File;
  spz?: string;
  documentType?: DocumentType;
}

async function validateRequest(req: Request): Promise<ValidationResult> {
  const errors: string[] = [];
  let file: File | undefined;
  let spz: string | undefined;
  let documentType: DocumentType | undefined;

  try {
    const formData = await req.formData();

    // Extract fields
    const fileField = formData.get('file');
    const spzField = formData.get('spz');
    const documentTypeField = formData.get('document_type');

    // Validate file
    if (!fileField) {
      errors.push('file is required');
    } else if (!(fileField instanceof File)) {
      errors.push('file must be a valid file');
    } else {
      file = fileField;

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(`Invalid file type "${file.type}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File too large (${Math.round(file.size / 1024 / 1024 * 100) / 100} MB). Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB`);
      }

      if (file.size === 0) {
        errors.push('File is empty');
      }
    }

    // Validate SPZ (optional - generate placeholder if not provided)
    if (spzField && typeof spzField === 'string' && spzField.trim()) {
      // Normalize SPZ: uppercase and remove spaces
      spz = spzField.toUpperCase().replace(/\s/g, '');

      if (spz.length < 1 || spz.length > 20) {
        errors.push('spz must be between 1 and 20 characters');
      }
    } else {
      // Generate placeholder SPZ for OCR-first flow
      // Use base36 encoding to keep within VARCHAR(20) limit (results in ~10-11 chars)
      spz = `P${Date.now().toString(36).toUpperCase()}`;
    }

    // Validate document type
    if (!documentTypeField || typeof documentTypeField !== 'string') {
      errors.push('document_type is required');
    } else {
      const normalizedType = documentTypeField.toUpperCase() as DocumentType;

      if (!ALLOWED_DOCUMENT_TYPES.includes(normalizedType)) {
        errors.push(`document_type must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`);
      } else {
        documentType = normalizedType;
      }
    }

  } catch (parseError) {
    errors.push('Invalid multipart form data');
    console.error('[Validation] Parse error:', parseError);
  }

  return {
    isValid: errors.length === 0,
    errors,
    file,
    spz,
    documentType,
  };
}

// =============================================================================
// FILE STORAGE
// =============================================================================

interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

async function uploadToStorage(
  supabase: SupabaseClient,
  file: File,
  spz: string,
  documentType: DocumentType
): Promise<UploadResult> {
  // Generate file path: {spz}/{document_type}/{timestamp}.{extension}
  const timestamp = Date.now();
  const extension = getFileExtension(file.name, file.type);
  const filePath = `${spz}/${documentType.toLowerCase()}/${timestamp}.${extension}`;

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[Storage] Upload error:', error);
      return { success: false, error: error.message };
    }

    // Store the file path only - URLs will be generated on demand via signed URLs
    return {
      success: true,
      filePath: data.path,
    };
  } catch (error) {
    console.error('[Storage] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown storage error';
    return { success: false, error: message };
  }
}

function getFileExtension(filename: string, mimeType: string): string {
  // Try to get from filename first
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase();
    if (['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      return ext;
    }
  }

  // Fallback to mime type
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return 'bin';
  }
}

async function deleteFromStorage(
  supabase: SupabaseClient,
  filePath: string
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('[Storage] Rollback delete error:', error);
    }
  } catch (error) {
    console.error('[Storage] Rollback unexpected error:', error);
  }
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

interface CreateRecordResult {
  success: boolean;
  record?: DocumentUploadResponse;
  error?: string;
}

async function createOcrExtractionRecord(
  supabase: SupabaseClient,
  spz: string,
  documentType: DocumentType,
  documentFilePath: string
): Promise<CreateRecordResult> {
  try {
    const { data, error } = await supabase
      .from('ocr_extractions')
      .insert({
        spz,
        document_type: documentType,
        document_file_path: documentFilePath,
        ocr_status: 'PENDING',
        ocr_provider: 'MISTRAL',
      })
      .select('id, spz, document_type, document_file_path, ocr_status, created_at')
      .single();

    if (error) {
      console.error('[Database] Insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, record: data as DocumentUploadResponse };
  } catch (error) {
    console.error('[Database] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return { success: false, error: message };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

async function handleUpload(req: Request): Promise<Response> {
  // Validate request
  const validation = await validateRequest(req);

  if (!validation.isValid) {
    return errorResponse(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      validation.errors
    );
  }

  const { file, spz, documentType } = validation;

  // Create Supabase client
  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error('[Init] Supabase client error:', error);
    return errorResponse('Server configuration error', 'CONFIG_ERROR', 500);
  }

  // Upload to storage
  const uploadResult = await uploadToStorage(supabase, file!, spz!, documentType!);

  if (!uploadResult.success) {
    return errorResponse(
      uploadResult.error || 'Storage upload failed',
      'STORAGE_ERROR',
      500
    );
  }

  // Create database record with file path (not URL - URLs generated on demand)
  const recordResult = await createOcrExtractionRecord(
    supabase,
    spz!,
    documentType!,
    uploadResult.filePath!
  );

  if (!recordResult.success) {
    // Rollback: delete uploaded file
    await deleteFromStorage(supabase, uploadResult.filePath!);

    return errorResponse(
      recordResult.error || 'Database record creation failed',
      'DATABASE_ERROR',
      500
    );
  }

  return jsonResponse(recordResult.record, 201);
}

// =============================================================================
// MAIN SERVER
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
    return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  // Validate JWT for POST requests (since verify_jwt = false in config.toml)
  const jwtResult = await validateJWT(req.headers.get('Authorization'));
  if (!jwtResult.valid) {
    return errorResponse(jwtResult.error || 'Unauthorized', 'UNAUTHORIZED', 401);
  }

  try {
    return await handleUpload(req);
  } catch (error) {
    console.error('[Server] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 'INTERNAL_ERROR', 500);
  }
});
