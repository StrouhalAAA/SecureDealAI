/**
 * SecureDealAI - Verify Access Code Edge Function
 * Authentication entry point for internal users
 *
 * This function validates access codes and issues JWT tokens for authenticated sessions.
 * It is the ONLY Edge Function with verify_jwt = false (open endpoint).
 *
 * Features:
 * - SHA-256 code hashing for secure comparison
 * - IP-based rate limiting (5 attempts / 15 min lockout)
 * - JWT token generation with 24-hour expiry
 * - Support for multiple valid access codes
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for DB access
 * - ACCESS_CODE_HASH - SHA-256 hash(es) of valid access code(s), comma-separated
 * - JWT_SECRET - Secret for signing JWT tokens
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// CONFIGURATION
// =============================================================================

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// JWT configuration
const JWT_EXPIRY_HOURS = 24;

// =============================================================================
// TYPES
// =============================================================================

interface VerifyRequest {
  code: string;
}

interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  retry_after?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Hash a string using SHA-256
 */
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a signed JWT token
 */
async function createJWT(secret: string, codeId: string): Promise<{ token: string; expiresAt: Date }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + JWT_EXPIRY_HOURS * 60 * 60) * 1000);

  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload = {
    iss: "securedealai",
    sub: "internal-user",
    iat: now,
    exp: now + JWT_EXPIRY_HOURS * 60 * 60,
    access_type: "internal",
    code_id: codeId,
    // Supabase requires these for RLS
    role: "authenticated",
    aud: "authenticated"
  };

  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encodedHeader = base64url(headerBytes.buffer.slice(headerBytes.byteOffset, headerBytes.byteOffset + headerBytes.byteLength));
  const encodedPayload = base64url(payloadBytes.buffer.slice(payloadBytes.byteOffset, payloadBytes.byteOffset + payloadBytes.byteLength));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signatureInput)
  );

  const signatureArray = new Uint8Array(signature);
  const encodedSignature = base64url(signatureArray.buffer.slice(signatureArray.byteOffset, signatureArray.byteOffset + signatureArray.byteLength));

  return {
    token: `${encodedHeader}.${encodedPayload}.${encodedSignature}`,
    expiresAt
  };
}

/**
 * Check rate limit for IP address
 */
// deno-lint-ignore no-explicit-any
async function checkRateLimit(
  supabase: any,
  ipAddress: string
): Promise<RateLimitResult> {
  const cutoffTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

  const { data: attempts, error } = await supabase
    .from("access_code_attempts")
    .select("id, success")
    .eq("ip_address", ipAddress)
    .gte("attempted_at", cutoffTime)
    .eq("success", false);

  if (error) {
    console.error("Rate limit check error:", error);
    // On error, allow the request but log it
    return { allowed: true, attempts: 0 };
  }

  const failedAttempts = attempts?.length || 0;

  if (failedAttempts >= MAX_ATTEMPTS) {
    // Calculate retry time based on oldest attempt in window
    const retryAfter = LOCKOUT_MINUTES * 60; // Full lockout period
    return { allowed: false, attempts: failedAttempts, retry_after: retryAfter };
  }

  return { allowed: true, attempts: failedAttempts };
}

/**
 * Record an access attempt
 */
// deno-lint-ignore no-explicit-any
async function recordAttempt(
  supabase: any,
  ipAddress: string,
  success: boolean,
  codeId?: string
): Promise<void> {
  const { error } = await supabase
    .from("access_code_attempts")
    .insert({
      ip_address: ipAddress,
      success,
      code_identifier: success ? codeId : null
    });

  if (error) {
    console.error("Failed to record attempt:", error);
  }
}

/**
 * Get client IP from request headers
 */
function getClientIP(req: Request): string {
  // Supabase Edge Functions provide these headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback
  return "unknown";
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED", message: "Only POST is allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessCodeHash = Deno.env.get("ACCESS_CODE_HASH");
    const jwtSecret = Deno.env.get("JWT_SECRET");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ success: false, error: "SERVER_ERROR", message: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!accessCodeHash || !jwtSecret) {
      console.error("Missing auth configuration: ACCESS_CODE_HASH or JWT_SECRET");
      return new Response(
        JSON.stringify({ success: false, error: "SERVER_ERROR", message: "Auth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Get client IP for rate limiting
    const clientIP = getClientIP(req);

    // Check rate limit
    const rateLimit = await checkRateLimit(supabase, clientIP);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "RATE_LIMITED",
          message: `Too many failed attempts. Try again in ${Math.ceil((rateLimit.retry_after || 900) / 60)} minutes.`,
          retry_after: rateLimit.retry_after
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: VerifyRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_REQUEST", message: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input
    if (!body.code || typeof body.code !== "string" || body.code.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_REQUEST", message: "Code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided code and compare
    const providedCodeHash = await sha256(body.code.trim());

    // Support multiple codes (comma-separated hashes in env var)
    const validHashes = accessCodeHash.split(",").map(h => h.trim().toLowerCase());
    const isValid = validHashes.includes(providedCodeHash.toLowerCase());

    if (!isValid) {
      // Record failed attempt
      await recordAttempt(supabase, clientIP, false);

      const remainingAttempts = MAX_ATTEMPTS - rateLimit.attempts - 1;
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_CODE",
          message: remainingAttempts > 0
            ? `Invalid access code. ${remainingAttempts} attempts remaining.`
            : "Invalid access code. You will be temporarily locked out."
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valid code - create JWT
    const codeId = providedCodeHash.substring(0, 8); // Short identifier for audit
    const { token, expiresAt } = await createJWT(jwtSecret, codeId);

    // Record successful attempt
    await recordAttempt(supabase, clientIP, true, codeId);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Verify access code error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "SERVER_ERROR", message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
