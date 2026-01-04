/**
 * Tests for verify-access-code Edge Function
 *
 * Run with:
 * deno test --allow-env --allow-net supabase/functions/tests/verify-access-code.test.ts
 *
 * Required environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - TEST_ACCESS_CODE: A valid access code for testing
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

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
  const json = await res.json();
  assertEquals(json.success, false);
  assertEquals(json.error, "INVALID_REQUEST");
});

Deno.test("POST with empty code returns 400", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "" })
  });

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.success, false);
  assertEquals(json.error, "INVALID_REQUEST");
});

Deno.test("GET method returns 405", async () => {
  const res = await fetch(BASE_URL, { method: "GET" });
  assertEquals(res.status, 405);
  const json = await res.json();
  assertEquals(json.error, "METHOD_NOT_ALLOWED");
});

Deno.test("OPTIONS returns CORS headers", async () => {
  const res = await fetch(BASE_URL, { method: "OPTIONS" });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
});

Deno.test("Invalid JSON returns 400", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json"
  });

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.success, false);
  assertEquals(json.error, "INVALID_REQUEST");
});
