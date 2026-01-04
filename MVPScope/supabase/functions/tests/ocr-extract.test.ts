/**
 * Tests for OCR Extract Edge Function
 *
 * Run with: deno test --allow-env --allow-net tests/ocr-extract.test.ts
 */

import { assertEquals, assertExists } from "@std/assert";

// =============================================================================
// UNIT TESTS - Validation
// =============================================================================

Deno.test("UUID validation pattern", () => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const isValidUuid = (id: string) => uuidPattern.test(id);

  assertEquals(isValidUuid('123e4567-e89b-12d3-a456-426614174000'), true);
  assertEquals(isValidUuid('00000000-0000-0000-0000-000000000000'), true);
  assertEquals(isValidUuid('123E4567-E89B-12D3-A456-426614174000'), true); // uppercase
  assertEquals(isValidUuid('not-a-uuid'), false);
  assertEquals(isValidUuid('123e4567-e89b-12d3-a456'), false); // too short
  assertEquals(isValidUuid(''), false);
});

Deno.test("OCR status values", () => {
  const VALID_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

  const isValidStatus = (status: string) => VALID_STATUSES.includes(status);

  assertEquals(isValidStatus('PENDING'), true);
  assertEquals(isValidStatus('PROCESSING'), true);
  assertEquals(isValidStatus('COMPLETED'), true);
  assertEquals(isValidStatus('FAILED'), true);
  assertEquals(isValidStatus('UNKNOWN'), false);
});

Deno.test("Confidence calculation - should be 0-100", () => {
  const normalizeConfidence = (conf: number) => Math.max(0, Math.min(100, conf));

  assertEquals(normalizeConfidence(50), 50);
  assertEquals(normalizeConfidence(100), 100);
  assertEquals(normalizeConfidence(0), 0);
  assertEquals(normalizeConfidence(-10), 0);
  assertEquals(normalizeConfidence(150), 100);
});

// =============================================================================
// INTEGRATION TESTS (require running Supabase)
// =============================================================================

const SUPABASE_AVAILABLE = Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_ANON_KEY");
const BASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const API_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Helper to make authenticated requests
async function ocrRequest(body: unknown): Promise<Response> {
  return await fetch(`${BASE_URL}/functions/v1/ocr-extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'apikey': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

Deno.test({
  name: "POST /ocr-extract - Missing ocr_extraction_id returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await ocrRequest({});

    assertEquals(response.status, 400);

    const data = await response.json();
    assertEquals(data.code, 'VALIDATION_ERROR');
    assertEquals(data.error, 'ocr_extraction_id is required');
  },
});

Deno.test({
  name: "POST /ocr-extract - Invalid UUID format returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await ocrRequest({
      ocr_extraction_id: 'not-a-uuid',
    });

    assertEquals(response.status, 400);

    const data = await response.json();
    assertEquals(data.code, 'VALIDATION_ERROR');
    assertEquals(data.error, 'ocr_extraction_id must be a valid UUID');
  },
});

Deno.test({
  name: "POST /ocr-extract - Non-existent ID returns 404",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await ocrRequest({
      ocr_extraction_id: '00000000-0000-0000-0000-000000000000',
    });

    assertEquals(response.status, 404);

    const data = await response.json();
    assertEquals(data.code, 'NOT_FOUND');
  },
});

Deno.test({
  name: "GET /ocr-extract - Method not allowed returns 405",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await fetch(`${BASE_URL}/functions/v1/ocr-extract`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'apikey': API_KEY,
      },
    });

    assertEquals(response.status, 405);
  },
});

Deno.test({
  name: "POST /ocr-extract - Invalid JSON returns 400",
  ignore: !SUPABASE_AVAILABLE,
  fn: async () => {
    const response = await fetch(`${BASE_URL}/functions/v1/ocr-extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: 'not-valid-json',
    });

    assertEquals(response.status, 400);

    const data = await response.json();
    assertEquals(data.code, 'INVALID_REQUEST');
  },
});

// =============================================================================
// DATA TRANSFORMATION TESTS
// =============================================================================

Deno.test("ORV data extraction fields", () => {
  // Test that expected fields are recognized
  const expectedOrvFields = [
    'spz',
    'vin',
    'znacka',
    'model',
    'datum_1_registrace',
    'majitel',
    'motor',
    'vykon_kw',
    'barva',
    'kategorie',
  ];

  const extractedData = {
    spz: '5L94454',
    vin: 'YV1PZA3TCL1103985',
    znacka: 'VOLVO',
    model: 'V90 CROSS COUNTRY',
  };

  // Verify all extracted fields are expected
  for (const key of Object.keys(extractedData)) {
    assertEquals(expectedOrvFields.includes(key), true);
  }
});

Deno.test("OP data extraction fields", () => {
  // Test that expected fields are recognized for OP (personal ID)
  const expectedOpFields = [
    'jmeno',
    'prijmeni',
    'datum_narozeni',
    'misto_narozeni',
    'adresa',
    'cislo_dokladu',
    'datum_vydani',
    'datum_platnosti',
    'vydavajici_urad',
  ];

  const extractedData = {
    jmeno: 'Jan',
    prijmeni: 'Novák',
    datum_narozeni: '1990-01-01',
    cislo_dokladu: 'ABC123456',
  };

  // Verify all extracted fields are expected
  for (const key of Object.keys(extractedData)) {
    assertEquals(expectedOpFields.includes(key), true);
  }
});

Deno.test("VTP data extraction fields", () => {
  // Test that expected fields are recognized for VTP (technical certificate)
  const expectedVtpFields = [
    'spz',
    'vin',
    'znacka',
    'typ',
    'varianta',
    'verze',
    'kategorie',
    'karoserie',
    'barva',
    'rok_vyroby',
    'hmotnost',
    'pocet_mist',
  ];

  const extractedData = {
    spz: '5L94454',
    vin: 'YV1PZA3TCL1103985',
    znacka: 'VOLVO',
    kategorie: 'M1',
  };

  // Verify all extracted fields are expected
  for (const key of Object.keys(extractedData)) {
    assertEquals(expectedVtpFields.includes(key), true);
  }
});

// =============================================================================
// CONFIDENCE CALCULATION TESTS
// =============================================================================

Deno.test("Confidence calculation based on field completeness", () => {
  // Mock confidence calculation
  const calculateConfidence = (documentType: string, data: Record<string, unknown>): number => {
    const requiredFields: Record<string, string[]> = {
      ORV: ['spz', 'vin', 'znacka', 'model', 'majitel'],
      OP: ['jmeno', 'prijmeni', 'datum_narozeni', 'cislo_dokladu'],
      VTP: ['spz', 'vin', 'znacka', 'kategorie'],
    };

    const fields = requiredFields[documentType] || [];
    if (fields.length === 0) return 0;

    let filledCount = 0;
    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        filledCount++;
      }
    }

    return Math.round((filledCount / fields.length) * 100);
  };

  // All fields filled
  assertEquals(calculateConfidence('ORV', {
    spz: '5L94454',
    vin: 'YV1PZA3TCL1103985',
    znacka: 'VOLVO',
    model: 'V90',
    majitel: 'Test Owner',
  }), 100);

  // Some fields filled
  assertEquals(calculateConfidence('ORV', {
    spz: '5L94454',
    vin: 'YV1PZA3TCL1103985',
    znacka: 'VOLVO',
  }), 60); // 3/5 = 60%

  // No fields filled
  assertEquals(calculateConfidence('ORV', {}), 0);

  // Unknown document type
  assertEquals(calculateConfidence('UNKNOWN', { field: 'value' }), 0);
});

// =============================================================================
// RETRY LOGIC TESTS
// =============================================================================

Deno.test("Retry logic - exponential backoff calculation", () => {
  const calculateBackoff = (attempt: number, baseDelay = 1000): number => {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  };

  assertEquals(calculateBackoff(0), 1000);  // 1s
  assertEquals(calculateBackoff(1), 2000);  // 2s
  assertEquals(calculateBackoff(2), 4000);  // 4s
  assertEquals(calculateBackoff(3), 8000);  // 8s
  assertEquals(calculateBackoff(4), 16000); // 16s
  assertEquals(calculateBackoff(5), 30000); // Capped at 30s
  assertEquals(calculateBackoff(10), 30000); // Still capped
});

Deno.test("Should retry on specific errors", () => {
  const shouldRetry = (error: { code?: string; message?: string }): boolean => {
    const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'RATE_LIMIT'];
    const retryableMessages = ['timeout', 'rate limit', 'service unavailable'];

    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }

    if (error.message) {
      const lowerMessage = error.message.toLowerCase();
      return retryableMessages.some(msg => lowerMessage.includes(msg));
    }

    return false;
  };

  assertEquals(shouldRetry({ code: 'ETIMEDOUT' }), true);
  assertEquals(shouldRetry({ code: 'RATE_LIMIT' }), true);
  assertEquals(shouldRetry({ message: 'Request timeout' }), true);
  assertEquals(shouldRetry({ message: 'Rate limit exceeded' }), true);
  assertEquals(shouldRetry({ message: 'Service unavailable' }), true);
  assertEquals(shouldRetry({ code: 'AUTH_ERROR' }), false);
  assertEquals(shouldRetry({ message: 'Invalid API key' }), false);
});
