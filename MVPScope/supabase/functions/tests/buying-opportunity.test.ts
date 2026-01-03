/**
 * Tests for Buying Opportunity CRUD Edge Function
 *
 * Run with: deno test --allow-env --allow-net tests/buying-opportunity.test.ts
 */

import { assertEquals, assertExists } from "@std/assert";
import { getTestClient, generateTestSpz, cleanupTestData } from "./test-utils.ts";

// =============================================================================
// UNIT TESTS - SPZ Validation
// =============================================================================

Deno.test("SPZ normalization - removes spaces and converts to uppercase", () => {
  const normalize = (spz: string) => spz.toUpperCase().replace(/\s/g, '');

  assertEquals(normalize("5L9 4454"), "5L94454");
  assertEquals(normalize("5l94454"), "5L94454");
  assertEquals(normalize("  5L 94454  "), "5L94454");
});

Deno.test("SPZ validation - accepts valid SPZ formats", () => {
  const isValidLength = (spz: string) => spz.length >= 1 && spz.length <= 20;

  assertEquals(isValidLength("5L94454"), true);
  assertEquals(isValidLength("ABC123"), true);
  assertEquals(isValidLength("A"), true);
  assertEquals(isValidLength(""), false);
});

// =============================================================================
// INTEGRATION TESTS - Buying Opportunity CRUD (require running Supabase)
// =============================================================================

const SUPABASE_AVAILABLE = Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_ANON_KEY");
const BASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const API_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Helper to make authenticated requests
async function apiRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const url = `${BASE_URL}/functions/v1/buying-opportunity${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "apikey": API_KEY,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return await fetch(url, options);
}

Deno.test({
  name: "POST /buying-opportunity - Create with valid SPZ returns 201",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const testSpz = generateTestSpz();

    try {
      const response = await apiRequest("POST", "", { spz: testSpz });

      assertEquals(response.status, 201);

      const data = await response.json();
      assertExists(data.id);
      assertEquals(data.spz, testSpz);
      assertEquals(data.status, "DRAFT");
      assertExists(data.created_at);
    } finally {
      await cleanupTestData(testSpz);
    }
  },
});

Deno.test({
  name: "POST /buying-opportunity - Duplicate SPZ returns 409",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const testSpz = generateTestSpz();

    try {
      // Create first opportunity
      await apiRequest("POST", "", { spz: testSpz });

      // Attempt to create duplicate
      const response = await apiRequest("POST", "", { spz: testSpz });

      assertEquals(response.status, 409);

      const data = await response.json();
      assertEquals(data.code, "DUPLICATE_SPZ");
    } finally {
      await cleanupTestData(testSpz);
    }
  },
});

Deno.test({
  name: "POST /buying-opportunity - Missing SPZ returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await apiRequest("POST", "", {});

    assertEquals(response.status, 400);

    const data = await response.json();
    assertEquals(data.code, "MISSING_SPZ");
  },
});

Deno.test({
  name: "POST /buying-opportunity - Empty SPZ returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await apiRequest("POST", "", { spz: "" });

    assertEquals(response.status, 400);
    assertEquals((await response.json()).code, "MISSING_SPZ");
  },
});

Deno.test({
  name: "GET /buying-opportunity - Retrieves by ID",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const testSpz = generateTestSpz();

    try {
      // Create opportunity first
      const createResponse = await apiRequest("POST", "", { spz: testSpz });
      const created = await createResponse.json();

      // Retrieve by ID
      const getResponse = await apiRequest("GET", `?id=${created.id}`);

      assertEquals(getResponse.status, 200);

      const data = await getResponse.json();
      assertEquals(data.id, created.id);
      assertEquals(data.spz, testSpz);
    } finally {
      await cleanupTestData(testSpz);
    }
  },
});

Deno.test({
  name: "GET /buying-opportunity - Retrieves by SPZ",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const testSpz = generateTestSpz();

    try {
      // Create opportunity first
      await apiRequest("POST", "", { spz: testSpz });

      // Retrieve by SPZ
      const getResponse = await apiRequest("GET", `?spz=${testSpz}`);

      assertEquals(getResponse.status, 200);

      const data = await getResponse.json();
      assertEquals(data.spz, testSpz);
    } finally {
      await cleanupTestData(testSpz);
    }
  },
});

Deno.test({
  name: "GET /buying-opportunity - Non-existent ID returns 404",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await apiRequest("GET", `?id=${fakeId}`);

    assertEquals(response.status, 404);
    assertEquals((await response.json()).code, "NOT_FOUND");
  },
});

Deno.test({
  name: "GET /buying-opportunity/list - Returns paginated results",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await apiRequest("GET", "/list?page=1&limit=10");

    assertEquals(response.status, 200);

    const data = await response.json();
    assertExists(data.data);
    assertExists(data.pagination);
    assertEquals(data.pagination.page, 1);
    assertEquals(data.pagination.limit, 10);
  },
});

Deno.test({
  name: "GET /buying-opportunity/list - Filters by status",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await apiRequest("GET", "/list?status=DRAFT");

    assertEquals(response.status, 200);

    const data = await response.json();
    // All returned items should have DRAFT status
    for (const item of data.data) {
      assertEquals(item.status, "DRAFT");
    }
  },
});

Deno.test({
  name: "PUT /buying-opportunity/{id} - Updates status",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const testSpz = generateTestSpz();

    try {
      // Create opportunity first
      const createResponse = await apiRequest("POST", "", { spz: testSpz });
      const created = await createResponse.json();

      // Update status
      const updateResponse = await apiRequest("PUT", `/${created.id}`, { status: "PENDING" });

      assertEquals(updateResponse.status, 200);

      const data = await updateResponse.json();
      assertEquals(data.status, "PENDING");
    } finally {
      await cleanupTestData(testSpz);
    }
  },
});

Deno.test({
  name: "PUT /buying-opportunity/{id} - Invalid status returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const testSpz = generateTestSpz();

    try {
      const createResponse = await apiRequest("POST", "", { spz: testSpz });
      const created = await createResponse.json();

      const response = await apiRequest("PUT", `/${created.id}`, { status: "INVALID" });

      assertEquals(response.status, 400);
      assertEquals((await response.json()).code, "INVALID_STATUS");
    } finally {
      await cleanupTestData(testSpz);
    }
  },
});

Deno.test({
  name: "DELETE /buying-opportunity/{id} - Deletes successfully",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const testSpz = generateTestSpz();

    // Create opportunity
    const createResponse = await apiRequest("POST", "", { spz: testSpz });
    const created = await createResponse.json();

    // Delete it
    const deleteResponse = await apiRequest("DELETE", `/${created.id}`);

    assertEquals(deleteResponse.status, 204);

    // Verify it's gone
    const getResponse = await apiRequest("GET", `?id=${created.id}`);
    assertEquals(getResponse.status, 404);
  },
});

Deno.test({
  name: "DELETE /buying-opportunity/{id} - Non-existent ID returns 404",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await apiRequest("DELETE", `/${fakeId}`);

    assertEquals(response.status, 404);
  },
});

Deno.test({
  name: "Unauthorized request returns 401",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const url = `${BASE_URL}/functions/v1/buying-opportunity/list`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header
      },
    });

    assertEquals(response.status, 401);
  },
});
