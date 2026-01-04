/**
 * SecureDealAI MVP - OCR Extract Edge Function
 *
 * Endpoint:
 * - POST /ocr-extract - Process uploaded document through Mistral OCR API
 *
 * Request:
 * {
 *   "ocr_extraction_id": "uuid" // ID from document-upload response
 * }
 *
 * Response:
 * {
 *   "id": "uuid",
 *   "spz": "5L94454",
 *   "document_type": "ORV" | "OP" | "VTP",
 *   "ocr_status": "COMPLETED" | "FAILED",
 *   "extracted_data": {...},
 *   "extraction_confidence": 85,
 *   "completed_at": "2025-01-03T12:00:00Z"
 * }
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for database operations
 * - MISTRAL_API_KEY - Mistral API key for OCR
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractDocumentWithRetry, type ExtractionResult } from "./mistral-client.ts";
import {
  transformExtractedData,
  calculateConfidence,
} from "./transformer.ts";
import type { DocumentType } from "./schemas/index.ts";

// =============================================================================
// TYPES
// =============================================================================

interface OcrExtractRequest {
  ocr_extraction_id: string;
}

interface OcrExtractionRecord {
  id: string;
  spz: string;
  document_type: DocumentType;
  document_file_url: string;
  ocr_status: string;
  extracted_data: Record<string, unknown> | null;
  extraction_confidence: number | null;
  completed_at: string | null;
  errors: Record<string, unknown> | null;
  created_at: string;
}

interface OcrExtractResponse {
  id: string;
  spz: string;
  document_type: DocumentType;
  ocr_status: "COMPLETED" | "FAILED";
  extracted_data: Record<string, unknown> | null;
  extraction_confidence: number;
  completed_at: string | null;
  raw_markdown?: string;
  pages_processed?: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  message: string,
  code: string,
  status: number
): Response {
  const body: ErrorResponse = { error: message, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

async function fetchOcrExtraction(
  supabase: SupabaseClient,
  id: string
): Promise<OcrExtractionRecord | null> {
  const { data, error } = await supabase
    .from("ocr_extractions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[Database] Fetch error:", error);
    return null;
  }

  return data as OcrExtractionRecord;
}

async function updateOcrExtractionStatus(
  supabase: SupabaseClient,
  id: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from("ocr_extractions")
    .update({ ocr_status: status })
    .eq("id", id);

  if (error) {
    console.error("[Database] Status update error:", error);
  }
}

async function updateOcrExtractionSuccess(
  supabase: SupabaseClient,
  id: string,
  extractedData: Record<string, unknown>,
  confidence: number
): Promise<OcrExtractionRecord | null> {
  const { data, error } = await supabase
    .from("ocr_extractions")
    .update({
      ocr_status: "COMPLETED",
      extracted_data: extractedData,
      extraction_confidence: confidence,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Database] Success update error:", error);
    return null;
  }

  return data as OcrExtractionRecord;
}

async function updateOcrExtractionFailed(
  supabase: SupabaseClient,
  id: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from("ocr_extractions")
    .update({
      ocr_status: "FAILED",
      errors: { message: errorMessage, timestamp: new Date().toISOString() },
    })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failure update error:", error);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

async function handleOcrExtract(req: Request): Promise<Response> {
  // Parse request body
  let body: OcrExtractRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", "INVALID_REQUEST", 400);
  }

  // Validate request
  const { ocr_extraction_id } = body;
  if (!ocr_extraction_id) {
    return errorResponse(
      "ocr_extraction_id is required",
      "VALIDATION_ERROR",
      400
    );
  }

  // UUID validation
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(ocr_extraction_id)) {
    return errorResponse(
      "ocr_extraction_id must be a valid UUID",
      "VALIDATION_ERROR",
      400
    );
  }

  // Create Supabase client
  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[Init] Supabase client error:", error);
    return errorResponse("Server configuration error", "CONFIG_ERROR", 500);
  }

  // Fetch OCR extraction record
  const ocrRecord = await fetchOcrExtraction(supabase, ocr_extraction_id);

  if (!ocrRecord) {
    return errorResponse("OCR extraction not found", "NOT_FOUND", 404);
  }

  // Check if already processed
  if (ocrRecord.ocr_status === "COMPLETED") {
    return jsonResponse({
      id: ocrRecord.id,
      spz: ocrRecord.spz,
      document_type: ocrRecord.document_type,
      ocr_status: ocrRecord.ocr_status,
      extracted_data: ocrRecord.extracted_data,
      extraction_confidence: ocrRecord.extraction_confidence || 0,
      completed_at: ocrRecord.completed_at,
    } as OcrExtractResponse);
  }

  // Check if already processing
  if (ocrRecord.ocr_status === "PROCESSING") {
    return errorResponse(
      "OCR extraction already in progress",
      "ALREADY_PROCESSING",
      409
    );
  }

  // Update status to PROCESSING
  await updateOcrExtractionStatus(supabase, ocr_extraction_id, "PROCESSING");

  console.log(
    `[OCR] Starting extraction for ${ocrRecord.document_type}: ${ocrRecord.document_file_url}`
  );

  // Call Mistral OCR API with retry
  let extractionResult: ExtractionResult;
  try {
    extractionResult = await extractDocumentWithRetry(
      ocrRecord.document_file_url,
      ocrRecord.document_type
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown OCR error";
    console.error("[OCR] Extraction failed:", errorMessage);

    await updateOcrExtractionFailed(supabase, ocr_extraction_id, errorMessage);

    return errorResponse(
      `OCR extraction failed: ${errorMessage}`,
      "OCR_ERROR",
      500
    );
  }

  // Check extraction success
  if (!extractionResult.success) {
    console.error("[OCR] Extraction unsuccessful:", extractionResult.error);

    await updateOcrExtractionFailed(
      supabase,
      ocr_extraction_id,
      extractionResult.error || "Unknown error"
    );

    return errorResponse(
      `OCR extraction failed: ${extractionResult.error}`,
      "OCR_ERROR",
      500
    );
  }

  // Transform extracted data
  const transformedData = transformExtractedData(
    ocrRecord.document_type,
    extractionResult.data
  );

  // Calculate confidence
  const confidence = calculateConfidence(
    ocrRecord.document_type,
    transformedData as Record<string, unknown>
  );

  console.log(
    `[OCR] Extraction successful - Confidence: ${confidence}%, Pages: ${extractionResult.pagesProcessed}`
  );

  // Update database with results
  const updatedRecord = await updateOcrExtractionSuccess(
    supabase,
    ocr_extraction_id,
    transformedData as Record<string, unknown>,
    confidence
  );

  if (!updatedRecord) {
    return errorResponse(
      "Failed to save extraction results",
      "DATABASE_ERROR",
      500
    );
  }

  // Build response
  const response: OcrExtractResponse = {
    id: updatedRecord.id,
    spz: updatedRecord.spz,
    document_type: updatedRecord.document_type,
    ocr_status: "COMPLETED",
    extracted_data: updatedRecord.extracted_data,
    extraction_confidence: confidence,
    completed_at: updatedRecord.completed_at,
    pages_processed: extractionResult.pagesProcessed,
  };

  return jsonResponse(response);
}

// =============================================================================
// MAIN SERVER
// =============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405);
  }

  try {
    return await handleOcrExtract(req);
  } catch (error) {
    console.error("[Server] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
});
