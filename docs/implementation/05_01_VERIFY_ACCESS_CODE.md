# Task 5.1: Verify Access Code Edge Function

> **Phase**: 5 - Access Code Authentication
> **Status**: [ ] Pending
> **Priority**: Critical
> **Depends On**: None
> **Estimated Effort**: 2 hours

---

## Objective

Create a Supabase Edge Function that validates access codes and returns signed JWT tokens for authenticated sessions.

**This is the entry point for authentication** - it's the only Edge Function that remains open (`verify_jwt = false`).

---

## Prerequisites

- [ ] None - this task can start immediately

---

## Architecture Reference

See: [05_00_ACCESS_CODE_ARCHITECTURE.md](./05_00_ACCESS_CODE_ARCHITECTURE.md)

---

## API Specification

### Endpoint
```
POST /functions/v1/verify-access-code
```

### Request
```typescript
interface VerifyAccessCodeRequest {
  code: string;  // The access code entered by user
}
```

### Response (Success - 200)
```typescript
interface VerifyAccessCodeResponse {
  success: true;
  token: string;        // JWT token
  expires_at: string;   // ISO timestamp (24 hours from now)
}
```

### Response (Error - 401)
```typescript
interface VerifyAccessCodeError {
  success: false;
  error: "INVALID_CODE" | "RATE_LIMITED";
  message: string;
  retry_after?: number;  // Seconds until retry allowed (for rate limit)
}
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p supabase/functions/verify-access-code
```

### Step 2: Create Database Migration for Rate Limiting

Create file: `supabase/migrations/012_access_code_attempts.sql`

```sql
-- Track access code attempts for rate limiting
CREATE TABLE IF NOT EXISTS access_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false,
  code_identifier TEXT  -- Hash identifier of code used (for audit, only on success)
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_access_code_attempts_ip_time
  ON access_code_attempts(ip_address, attempted_at DESC);

-- Auto-cleanup old attempts (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_access_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM access_code_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- RLS: Only service role can access this table
ALTER TABLE access_code_attempts ENABLE ROW LEVEL SECURITY;

-- No policies for anon or authenticated - only service role can access
COMMENT ON TABLE access_code_attempts IS 'Rate limiting for access code attempts. Only accessible via service role.';
```

### Step 3: Implement the Edge Function

Create file: `supabase/functions/verify-access-code/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// JWT configuration
const JWT_EXPIRY_HOURS = 24;

interface VerifyRequest {
  code: string;
}

interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  retry_after?: number;
}

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

  const encodedHeader = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64url(new TextEncoder().encode(JSON.stringify(payload)));

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

  const encodedSignature = base64url(new Uint8Array(signature));

  return {
    token: `${encodedHeader}.${encodedPayload}.${encodedSignature}`,
    expiresAt
  };
}

/**
 * Check rate limit for IP address
 */
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
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
async function recordAttempt(
  supabase: ReturnType<typeof createClient>,
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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
```

### Step 4: Update config.toml

Add to `supabase/config.toml`:

```toml
[functions.verify-access-code]
verify_jwt = false  # This endpoint must be open - it's the entry point
```

### Step 5: Set Environment Secrets

```bash
# Generate a secure access code (e.g., "SecureDeal2026!")
# Then hash it: echo -n "SecureDeal2026!" | sha256sum
# Result: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069

# Set secrets in Supabase
supabase secrets set ACCESS_CODE_HASH="your_sha256_hash_here"
supabase secrets set JWT_SECRET="your_32_plus_char_random_string"
```

### Step 6: Deploy

```bash
# Apply migration
supabase db push

# Deploy function
supabase functions deploy verify-access-code
```

---

## Test Cases

### Manual Testing

```bash
# Test with invalid code
curl -X POST "https://[project].supabase.co/functions/v1/verify-access-code" \
  -H "Content-Type: application/json" \
  -d '{"code": "wrongcode"}'

# Expected: 401 with INVALID_CODE error

# Test with valid code (replace with your actual code)
curl -X POST "https://[project].supabase.co/functions/v1/verify-access-code" \
  -H "Content-Type: application/json" \
  -d '{"code": "SecureDeal2026!"}'

# Expected: 200 with token

# Test rate limiting (run 6 times with wrong code)
for i in {1..6}; do
  curl -X POST "https://[project].supabase.co/functions/v1/verify-access-code" \
    -H "Content-Type: application/json" \
    -d '{"code": "wrong"}'
  echo ""
done

# Expected: 429 RATE_LIMITED on 6th attempt
```

### Automated Tests

Create file: `supabase/functions/tests/verify-access-code.test.ts`

```typescript
import { assertEquals, assertExists } from "@std/assert";

const BASE_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/verify-access-code";
const VALID_CODE = Deno.env.get("TEST_ACCESS_CODE") || "TestCode123";

Deno.test("POST with valid code returns JWT", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: VALID_CODE })
  });

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.success, true);
  assertExists(json.token);
  assertExists(json.expires_at);
});

Deno.test("POST with invalid code returns 401", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "definitely_wrong_code_12345" })
  });

  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.success, false);
  assertEquals(json.error, "INVALID_CODE");
});

Deno.test("POST without code returns 400", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  assertEquals(res.status, 400);
});

Deno.test("GET method returns 405", async () => {
  const res = await fetch(BASE_URL, { method: "GET" });
  assertEquals(res.status, 405);
});
```

---

## Validation Criteria

- [ ] Function created at `supabase/functions/verify-access-code/index.ts`
- [ ] Migration created for `access_code_attempts` table
- [ ] `config.toml` updated with `verify_jwt = false` for this function
- [ ] Environment secrets set (`ACCESS_CODE_HASH`, `JWT_SECRET`)
- [ ] Invalid codes return 401
- [ ] Valid codes return 200 with JWT token
- [ ] Rate limiting blocks after 5 failed attempts
- [ ] JWT contains required claims (sub, exp, role: authenticated)
- [ ] Function deployed and accessible

---

## Completion Checklist

- [ ] Migration file created and applied
- [ ] Function implemented with all error handling
- [ ] Environment secrets configured
- [ ] Function deployed
- [ ] Manual tests passing
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`

---

## Troubleshooting

### "Auth not configured" error
- Ensure `ACCESS_CODE_HASH` and `JWT_SECRET` are set in Supabase secrets
- Run `supabase secrets list` to verify

### Token not working with other endpoints
- Verify JWT_SECRET matches in verify-access-code and Supabase JWT verification
- Check token has `role: "authenticated"` and `aud: "authenticated"` claims

### Rate limiting not working
- Check `access_code_attempts` table exists
- Verify RLS is not blocking service role access
