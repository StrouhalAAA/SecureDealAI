/**
 * SecureDealAI MVP - Get Document URL Edge Function
 *
 * Generates time-limited signed URLs for document preview.
 * Includes authorization check to ensure user can only access their own documents.
 *
 * Endpoint:
 * - POST /get-document-url
 *
 * Request:
 * {
 *   "spz": "5L94454",
 *   "document_type": "ORV" | "VTP" | "OP"
 * }
 *
 * Response:
 * {
 *   "url": "https://...signed-url...",
 *   "expires_in": 900
 * }
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for storage operations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

type DocumentType = "ORV" | "VTP" | "OP";

interface GetDocumentUrlRequest {
  spz: string;
  document_type: DocumentType;
}

interface GetDocumentUrlResponse {
  url: string;
  expires_in: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes
const STORAGE_BUCKET = "documents";
const ALLOWED_DOCUMENT_TYPES: DocumentType[] = ["ORV", "VTP", "OP"];

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
    throw new Error("Missing required environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function createSupabaseUserClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required environment variables");
  }

  // Get the authorization header from the request
  const authHeader = req.headers.get("Authorization");

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
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
// AUTHORIZATION
// =============================================================================

async function verifyUserAccess(
  userClient: SupabaseClient,
  spz: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return { authorized: false, error: "User not authenticated" };
    }

    // Check if user has access to this buying opportunity
    // This query will respect RLS policies
    const { data, error } = await userClient
      .from("buying_opportunities")
      .select("id")
      .eq("spz", spz)
      .maybeSingle();

    if (error) {
      console.error("[Auth] Query error:", error);
      return { authorized: false, error: "Failed to verify access" };
    }

    if (!data) {
      return {
        authorized: false,
        error: "Buying opportunity not found or access denied",
      };
    }

    return { authorized: true };
  } catch (error) {
    console.error("[Auth] Unexpected error:", error);
    return { authorized: false, error: "Authorization check failed" };
  }
}

// =============================================================================
// DOCUMENT URL GENERATION
// =============================================================================

async function getLatestDocumentPath(
  supabase: SupabaseClient,
  spz: string,
  documentType: DocumentType
): Promise<string | null> {
  // Query ocr_extractions to get the latest document path for this SPZ and type
  const { data, error } = await supabase
    .from("ocr_extractions")
    .select("document_file_path")
    .eq("spz", spz)
    .eq("document_type", documentType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Database] Query error:", error);
    return null;
  }

  return data?.document_file_path || null;
}

async function generateSignedUrl(
  supabase: SupabaseClient,
  filePath: string
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    console.error("[Storage] Signed URL error:", error);
    return { error: error.message };
  }

  return { url: data.signedUrl };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

async function handleGetDocumentUrl(req: Request): Promise<Response> {
  // Parse request body
  let body: GetDocumentUrlRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", "INVALID_REQUEST", 400);
  }

  // Validate request
  const { spz, document_type } = body;

  if (!spz || typeof spz !== "string") {
    return errorResponse("spz is required", "VALIDATION_ERROR", 400);
  }

  if (!document_type || !ALLOWED_DOCUMENT_TYPES.includes(document_type)) {
    return errorResponse(
      `document_type must be one of: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`,
      "VALIDATION_ERROR",
      400
    );
  }

  // Normalize SPZ
  const normalizedSpz = spz.toUpperCase().replace(/\s/g, "");

  // Create clients
  let serviceClient: SupabaseClient;
  let userClient: SupabaseClient;
  try {
    serviceClient = createSupabaseServiceClient();
    userClient = createSupabaseUserClient(req);
  } catch (error) {
    console.error("[Init] Client error:", error);
    return errorResponse("Server configuration error", "CONFIG_ERROR", 500);
  }

  // Verify user has access to this buying opportunity
  const authResult = await verifyUserAccess(userClient, normalizedSpz);

  if (!authResult.authorized) {
    return errorResponse(
      authResult.error || "Access denied",
      "UNAUTHORIZED",
      403
    );
  }

  // Get the document file path
  const filePath = await getLatestDocumentPath(
    serviceClient,
    normalizedSpz,
    document_type
  );

  if (!filePath) {
    return errorResponse("Document not found", "NOT_FOUND", 404);
  }

  // Generate signed URL
  const urlResult = await generateSignedUrl(serviceClient, filePath);

  if (!urlResult.url) {
    return errorResponse(
      urlResult.error || "Failed to generate URL",
      "STORAGE_ERROR",
      500
    );
  }

  const response: GetDocumentUrlResponse = {
    url: urlResult.url,
    expires_in: SIGNED_URL_EXPIRY_SECONDS,
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
    return await handleGetDocumentUrl(req);
  } catch (error) {
    console.error("[Server] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
});
