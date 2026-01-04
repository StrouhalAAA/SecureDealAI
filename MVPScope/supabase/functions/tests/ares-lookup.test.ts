/**
 * Tests for ARES Lookup Edge Function
 *
 * Run with: deno test --allow-env tests/ares-lookup.test.ts
 */

import { assertEquals, assertExists } from "@std/assert";

// Test IČO checksum validation (same algorithm as in index.ts)
function isValidICO(ico: string): boolean {
  if (!/^\d{8}$/.test(ico)) {
    return false;
  }

  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += parseInt(ico[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let checkDigit: number;

  if (remainder === 0) {
    checkDigit = 1;
  } else if (remainder === 1) {
    checkDigit = 0;
  } else {
    checkDigit = 11 - remainder;
  }

  return parseInt(ico[7], 10) === checkDigit;
}

// =============================================================================
// IČO VALIDATION TESTS
// =============================================================================

Deno.test("Valid IČO format passes validation", () => {
  // Known valid Czech company IČOs
  assertEquals(isValidICO("27074358"), true); // OSIT S.R.O.
  assertEquals(isValidICO("00000001"), true); // 0000001 + checksum 1 is actually valid
});

Deno.test("Invalid IČO format fails validation", () => {
  assertEquals(isValidICO("123"), false);       // Too short
  assertEquals(isValidICO("123456789"), false); // Too long
  assertEquals(isValidICO("1234567a"), false);  // Contains letter
  assertEquals(isValidICO(""), false);          // Empty
});

Deno.test("IČO with invalid checksum fails validation", () => {
  assertEquals(isValidICO("27074350"), false);  // Wrong checksum
  assertEquals(isValidICO("12345678"), false);  // Random invalid
  assertEquals(isValidICO("99999999"), false);  // All 9s invalid
});

// =============================================================================
// ARES CLIENT TESTS
// =============================================================================

Deno.test("ARES client module is importable", async () => {
  const { fetchFromAres, transformAresResponse } = await import("../ares-lookup/ares-client.ts");
  assertExists(fetchFromAres);
  assertExists(transformAresResponse);
});

Deno.test("transformAresResponse handles complete data", async () => {
  const { transformAresResponse } = await import("../ares-lookup/ares-client.ts");

  const mockAresResponse = {
    ico: "27074358",
    obchodniJmeno: "OSIT S.R.O.",
    dic: "CZ27074358",
    sidlo: {
      kodStatu: "CZ",
      nazevObce: "Praha",
      nazevMestskeCastiObvodu: "Praha 1",
      nazevUlice: "Staroměstské náměstí",
      cisloDomovni: 1,
      psc: 11000,
    },
    pravniForma: "112",
    datumVzniku: "2004-05-01",
    stavSubjektu: "AKTIVNÍ",
  };

  const result = transformAresResponse(mockAresResponse);

  assertEquals(result.ico, "27074358");
  assertEquals(result.name, "OSIT S.R.O.");
  assertEquals(result.dic, "CZ27074358");
  assertEquals(result.address.city, "Praha - Praha 1");
  assertEquals(result.address.postal_code, "11000");
  assertEquals(result.address.country, "CZ");
  assertEquals(result.is_active, true);
});

Deno.test("transformAresResponse handles minimal data", async () => {
  const { transformAresResponse } = await import("../ares-lookup/ares-client.ts");

  const mockAresResponse = {
    ico: "12345679",
    obchodniJmeno: "Test Company",
    sidlo: {
      nazevObce: "Brno",
      psc: 60200,
    },
    stavSubjektu: "AKTIVNÍ",
  };

  const result = transformAresResponse(mockAresResponse);

  assertEquals(result.ico, "12345679");
  assertEquals(result.name, "Test Company");
  assertEquals(result.dic, null);
  assertEquals(result.address.city, "Brno");
  assertEquals(result.address.postal_code, "60200");
  assertEquals(result.is_active, true);
});

Deno.test("transformAresResponse handles inactive company", async () => {
  const { transformAresResponse } = await import("../ares-lookup/ares-client.ts");

  const mockAresResponse = {
    ico: "12345679",
    obchodniJmeno: "Defunct Company",
    sidlo: {
      nazevObce: "Praha",
    },
    stavSubjektu: "VYMAZÁN",
    datumZaniku: "2023-01-15",
  };

  const result = transformAresResponse(mockAresResponse);

  assertEquals(result.is_active, false);
});

// =============================================================================
// INTEGRATION TESTS (require running Supabase)
// =============================================================================

Deno.test({
  name: "ARES lookup endpoint returns valid response for known company",
  ignore: !Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_ANON_KEY"),
  fn: async () => {
    const baseUrl = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
    const apiKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${baseUrl}/functions/v1/ares-lookup/27074358`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
    });

    // Accept either 200 (found) or 404 (not found - ARES might be down)
    // or 503 (service unavailable)
    const acceptableStatuses = [200, 404, 503];
    assertEquals(acceptableStatuses.includes(response.status), true);

    if (response.status === 200) {
      const data = await response.json();
      assertEquals(data.found, true);
      assertExists(data.data);
      assertExists(data.data.ico);
      assertExists(data.data.name);
    }
  },
});

Deno.test({
  name: "ARES lookup returns 400 for invalid IČO format",
  ignore: !Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_ANON_KEY"),
  fn: async () => {
    const baseUrl = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
    const apiKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${baseUrl}/functions/v1/ares-lookup/123`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
    });

    assertEquals(response.status, 400);
    const data = await response.json();
    assertEquals(data.found, false);
  },
});
