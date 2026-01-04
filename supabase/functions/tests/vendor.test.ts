/**
 * Tests for Vendor CRUD Edge Function
 *
 * Run with: deno test --allow-env --allow-net tests/vendor.test.ts
 */

import { assertEquals, assertExists } from "@std/assert";
import { getTestClient, generateTestSpz, cleanupTestData } from "./test-utils.ts";

// =============================================================================
// UNIT TESTS - Czech ID Validation
// =============================================================================

Deno.test("Rodne cislo validation - valid formats", () => {
  const isValidRodneCislo = (rc: string) => /^\d{6}\/\d{3,4}$/.test(rc);

  assertEquals(isValidRodneCislo("900101/1234"), true);
  assertEquals(isValidRodneCislo("900101/123"), true);
  assertEquals(isValidRodneCislo("9001011234"), false); // Missing slash
  assertEquals(isValidRodneCislo("900101/12345"), false); // Too many digits
  assertEquals(isValidRodneCislo(""), false);
});

Deno.test("ICO validation - 8 digit format", () => {
  const isValidICO = (ico: string) => /^\d{8}$/.test(ico);

  assertEquals(isValidICO("27074358"), true);
  assertEquals(isValidICO("12345678"), true);
  assertEquals(isValidICO("1234567"), false); // Too short
  assertEquals(isValidICO("123456789"), false); // Too long
  assertEquals(isValidICO("1234567a"), false); // Letter
});

Deno.test("DIC validation - CZ + 8-10 digits", () => {
  const isValidDIC = (dic: string) => /^CZ\d{8,10}$/.test(dic);

  assertEquals(isValidDIC("CZ27074358"), true);
  assertEquals(isValidDIC("CZ1234567890"), true);
  assertEquals(isValidDIC("27074358"), false); // Missing CZ
  assertEquals(isValidDIC("cz27074358"), false); // Lowercase
  assertEquals(isValidDIC("CZ1234567"), false); // Too short
});

// =============================================================================
// INTEGRATION TESTS - Vendor CRUD (require running Supabase)
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

// Helper to make authenticated requests to vendor endpoint
async function vendorRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const url = `${BASE_URL}/functions/v1/vendor${endpoint}`;
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

// =============================================================================
// COMPANY (PO) VENDOR TESTS
// =============================================================================

Deno.test({
  name: "POST /vendor - Create COMPANY vendor with valid data returns 201",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "OSIT S.R.O.",
        company_id: "27074358",
        vat_id: "CZ27074358",
        address_city: "Praha",
        address_postal_code: "11000",
      });

      assertEquals(response.status, 201);

      const data = await response.json();
      assertExists(data.id);
      assertEquals(data.vendor_type, "COMPANY");
      assertEquals(data.name, "OSIT S.R.O.");
      assertEquals(data.company_id, "27074358");
      assertEquals(data.vat_id, "CZ27074358");
      assertEquals(data.data_source, "MANUAL");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vendor - COMPANY without company_id returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "Test Company",
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.code, "VALIDATION_ERROR");
      assertEquals(data.details?.includes("company_id is required for COMPANY"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vendor - Invalid ICO format returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "Test Company",
        company_id: "1234", // Too short
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.details?.includes("Invalid company_id format (expected 8 digits)"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vendor - Invalid DIC format returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "Test Company",
        company_id: "27074358",
        vat_id: "27074358", // Missing CZ prefix
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.details?.includes("Invalid vat_id format (expected CZxxxxxxxx)"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

// =============================================================================
// PHYSICAL PERSON (FO) VENDOR TESTS
// =============================================================================

Deno.test({
  name: "POST /vendor - Create PHYSICAL_PERSON vendor with valid data returns 201",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "PHYSICAL_PERSON",
        name: "Jan Novák",
        personal_id: "900101/1234",
        date_of_birth: "1990-01-01",
        address_street: "Hlavní 123",
        address_city: "Praha",
        document_number: "ABC123456",
      });

      assertEquals(response.status, 201);

      const data = await response.json();
      assertExists(data.id);
      assertEquals(data.vendor_type, "PHYSICAL_PERSON");
      assertEquals(data.name, "Jan Novák");
      assertEquals(data.personal_id, "900101/1234");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vendor - PHYSICAL_PERSON without personal_id returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "PHYSICAL_PERSON",
        name: "Jan Novák",
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.details?.includes("personal_id is required for PHYSICAL_PERSON"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vendor - Invalid rodné číslo format returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "PHYSICAL_PERSON",
        name: "Jan Novák",
        personal_id: "9001011234", // Missing slash
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.details?.includes("Invalid personal_id format"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

// =============================================================================
// COMMON VALIDATION TESTS
// =============================================================================

Deno.test({
  name: "POST /vendor - Missing vendor_type returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        name: "Test",
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.details?.includes("vendor_type is required"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vendor - Invalid vendor_type returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "INVALID",
        name: "Test",
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.details?.includes("vendor_type must be one of"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "POST /vendor - Non-existent buying opportunity returns 404",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const fakeBoId = "00000000-0000-0000-0000-000000000000";

    const response = await vendorRequest("POST", "", {
      buying_opportunity_id: fakeBoId,
      vendor_type: "COMPANY",
      name: "Test",
      company_id: "27074358",
    });

    assertEquals(response.status, 404);
    assertEquals((await response.json()).code, "BUYING_OPPORTUNITY_NOT_FOUND");
  },
});

Deno.test({
  name: "POST /vendor - Duplicate vendor for same BO returns 409",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create first vendor
      await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "First Company",
        company_id: "27074358",
      });

      // Attempt duplicate
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "Second Company",
        company_id: "12345679",
      });

      assertEquals(response.status, 409);
      assertEquals((await response.json()).code, "DUPLICATE_VENDOR");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

// =============================================================================
// GET / UPDATE / DELETE TESTS
// =============================================================================

Deno.test({
  name: "GET /vendor - Retrieves by buying_opportunity_id",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create vendor
      await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "Test Company",
        company_id: "27074358",
      });

      // Retrieve
      const response = await vendorRequest("GET", `?buying_opportunity_id=${bo.id}`);

      assertEquals(response.status, 200);

      const data = await response.json();
      assertEquals(data.buying_opportunity_id, bo.id);
      assertEquals(data.name, "Test Company");
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "GET /vendor - Non-existent returns 404",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await vendorRequest("GET", `?id=${fakeId}`);

    assertEquals(response.status, 404);
  },
});

Deno.test({
  name: "PUT /vendor/{id} - Updates vendor data",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create vendor
      const createResponse = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "Original Name",
        company_id: "27074358",
      });
      const created = await createResponse.json();

      // Update
      const updateResponse = await vendorRequest("PUT", `/${created.id}`, {
        name: "Updated Name",
        address_city: "Brno",
      });

      assertEquals(updateResponse.status, 200);

      const data = await updateResponse.json();
      assertEquals(data.name, "Updated Name");
      assertEquals(data.address_city, "Brno");
      assertEquals(data.company_id, "27074358"); // Should be unchanged
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "DELETE /vendor/{id} - Deletes successfully",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      // Create vendor
      const createResponse = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "COMPANY",
        name: "To Delete",
        company_id: "27074358",
      });
      const created = await createResponse.json();

      // Delete
      const deleteResponse = await vendorRequest("DELETE", `/${created.id}`);
      assertEquals(deleteResponse.status, 204);

      // Verify it's gone
      const getResponse = await vendorRequest("GET", `?id=${created.id}`);
      assertEquals(getResponse.status, 404);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});

Deno.test({
  name: "Date format validation in vendor",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const bo = await createTestBuyingOpportunity();

    try {
      const response = await vendorRequest("POST", "", {
        buying_opportunity_id: bo.id,
        vendor_type: "PHYSICAL_PERSON",
        name: "Jan Novák",
        personal_id: "900101/1234",
        date_of_birth: "invalid-date", // Invalid format
      });

      assertEquals(response.status, 400);

      const data = await response.json();
      assertEquals(data.details?.includes("date_of_birth must be in YYYY-MM-DD format"), true);
    } finally {
      await cleanupTestData(bo.spz);
    }
  },
});
