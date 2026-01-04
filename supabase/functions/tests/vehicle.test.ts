/**
 * Tests for Vehicle CRUD Edge Function
 *
 * Run with: deno test --allow-env --allow-net tests/vehicle.test.ts
 */

import { assertEquals, assertExists } from "@std/assert";
import { getTestClient, generateTestSpz, cleanupTestData } from "./test-utils.ts";

// =============================================================================
// UNIT TESTS - VIN Validation
// =============================================================================

Deno.test("VIN validation - accepts exactly 17 characters", () => {
  const isValidVin = (vin: string) => vin.length === 17;

  assertEquals(isValidVin("YV1PZA3TCL1103985"), true);
  assertEquals(isValidVin("1HGCM82633A004352"), true);
  assertEquals(isValidVin("TOOSHORT"), false);
  assertEquals(isValidVin("TOOLONGVINUMBER123"), false);
  assertEquals(isValidVin(""), false);
});

Deno.test("VIN normalization - uppercase and trim", () => {
  const normalizeVin = (vin: string) => vin.toUpperCase().replace(/\s/g, '');

  assertEquals(normalizeVin("yv1pza3tcl1103985"), "YV1PZA3TCL1103985");
  assertEquals(normalizeVin("YV1 PZA3T CL1103985"), "YV1PZA3TCL1103985");
});

Deno.test("Year validation - reasonable range", () => {
  const currentYear = new Date().getFullYear();
  const isValidYear = (year: number) => year >= 1900 && year <= currentYear + 1;

  assertEquals(isValidYear(2020), true);
  assertEquals(isValidYear(1990), true);
  assertEquals(isValidYear(currentYear + 1), true);
  assertEquals(isValidYear(1899), false);
  assertEquals(isValidYear(currentYear + 2), false);
});

Deno.test("Date format validation - YYYY-MM-DD", () => {
  const isValidDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

  assertEquals(isValidDate("2020-01-15"), true);
  assertEquals(isValidDate("2020-1-15"), false);
  assertEquals(isValidDate("15/01/2020"), false);
  assertEquals(isValidDate("invalid"), false);
});

// =============================================================================
// INTEGRATION TESTS - Vehicle CRUD (require running Supabase)
// =============================================================================

const SUPABASE_AVAILABLE = Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_ANON_KEY");
const BASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const API_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Helper to create a buying opportunity for testing
async function createTestBuyingOpportunity(): Promise<{ id: string; spz: string }> {
  const testSpz = generateTestSpz();
  const response = await fetch(`${BASE_URL}/functions/v1/buying-opportunity`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "apikey": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ spz: testSpz }),
  });

  const data = await response.json();
  return { id: data.id, spz: testSpz };
}

// Helper to make authenticated requests to vehicle endpoint
async function vehicleRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const url = `${BASE_URL}/functions/v1/vehicle${endpoint}`;
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
  name: "POST /vehicle - Create with valid data returns 201",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
        vin: "YV1PZA3TCL1103985",
        znacka: "VOLVO",
        model: "V90 CROSS COUNTRY",
        rok_vyroby: 2020,
        datum_1_registrace: "2020-01-15",
      });

      assertEquals(response.status, 201);

      const data = await response.json();
      assertExists(data.id);
      assertEquals(data.spz, bo.spz);
      assertEquals(data.vin, "YV1PZA3TCL1103985");
      assertEquals(data.znacka, "VOLVO");
      assertEquals(data.data_source, "MANUAL");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vehicle - Invalid VIN length returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
        vin: "TOOSHORT",
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.code, "VALIDATION_ERROR");
      assertEquals(data.details?.includes("VIN must be exactly 17 characters"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vehicle - Non-existent buying opportunity returns 404",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const fakeBoId = "00000000-0000-0000-0000-000000000000";

    const response = await vehicleRequest("POST", "", {
      buying_opportunity_id: fakeBoId,
      spz: "TEST123",
    });

    assertEquals(response.status, 404);
    assertEquals((await response.json()).code, "BUYING_OPPORTUNITY_NOT_FOUND");
  },
});

Deno.test({
  name: "POST /vehicle - Duplicate vehicle for same BO returns 409",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create first vehicle
      await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
      });

      // Attempt duplicate
      const response = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
      });

      assertEquals(response.status, 409);
      assertEquals((await response.json()).code, "DUPLICATE_VEHICLE");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "GET /vehicle - Retrieves by buying_opportunity_id",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create vehicle
      await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
        vin: "YV1PZA3TCL1103985",
      });

      // Retrieve
      const response = await vehicleRequest("GET", `?buying_opportunity_id=${bo.id}`);

      assertEquals(response.status, 200);

      const data = await response.json();
      assertEquals(data.buying_opportunity_id, bo.id);
      assertEquals(data.vin, "YV1PZA3TCL1103985");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "GET /vehicle - Retrieves by SPZ",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create vehicle
      await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
      });

      // Retrieve by SPZ
      const response = await vehicleRequest("GET", `?spz=${bo.spz}`);

      assertEquals(response.status, 200);

      const data = await response.json();
      assertEquals(data.spz, bo.spz);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "GET /vehicle - Non-existent returns 404",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await vehicleRequest("GET", `?id=${fakeId}`);

    assertEquals(response.status, 404);
  },
});

Deno.test({
  name: "PUT /vehicle/{id} - Updates vehicle data",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create vehicle
      const createResponse = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
        znacka: "VOLVO",
      });
      const created = await createResponse.json();

      // Update
      const updateResponse = await vehicleRequest("PUT", `/${created.id}`, {
        model: "V90 CROSS COUNTRY",
        rok_vyroby: 2020,
      });

      assertEquals(updateResponse.status, 200);

      const data = await updateResponse.json();
      assertEquals(data.model, "V90 CROSS COUNTRY");
      assertEquals(data.rok_vyroby, 2020);
      assertEquals(data.znacka, "VOLVO"); // Should be unchanged
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "PUT /vehicle/{id} - Invalid year returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const createResponse = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
      });
      const created = await createResponse.json();

      const response = await vehicleRequest("PUT", `/${created.id}`, {
        rok_vyroby: 1800,
      });

      assertEquals(response.status, 400);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "DELETE /vehicle/{id} - Deletes successfully",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create vehicle
      const createResponse = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
      });
      const created = await createResponse.json();

      // Delete
      const deleteResponse = await vehicleRequest("DELETE", `/${created.id}`);
      assertEquals(deleteResponse.status, 204);

      // Verify it's gone
      const getResponse = await vehicleRequest("GET", `?id=${created.id}`);
      assertEquals(getResponse.status, 404);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "Data source validation - accepts valid values",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
        data_source: "OCR",
      });

      assertEquals(response.status, 201);

      const data = await response.json();
      assertEquals(data.data_source, "OCR");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "Data source validation - rejects invalid values",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vehicleRequest("POST", "", {
        buying_opportunity_id: bo.id,
        spz: bo.spz,
        data_source: "INVALID",
      });

      assertEquals(response.status, 400);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});
