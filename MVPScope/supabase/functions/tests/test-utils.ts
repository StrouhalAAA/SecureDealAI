import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

export function getTestClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "test-anon-key"
  );
}

export function getBaseUrl(): string {
  return Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
}

export function getApiKey(): string {
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

// =============================================================================
// CLEANUP HELPERS
// =============================================================================

export async function cleanupTestData(spz: string): Promise<void> {
  const client = getTestClient();

  // Delete in order due to foreign key constraints
  // First delete related records, then the buying opportunity
  try {
    // Get the buying opportunity ID
    const { data: bo } = await client
      .from("buying_opportunities")
      .select("id")
      .eq("spz", spz)
      .single();

    if (bo) {
      // Delete OCR extractions by SPZ
      await client.from("ocr_extractions").delete().eq("spz", spz);

      // Delete vendor
      await client.from("vendors").delete().eq("buying_opportunity_id", bo.id);

      // Delete vehicle
      await client.from("vehicles").delete().eq("buying_opportunity_id", bo.id);

      // Delete buying opportunity
      await client.from("buying_opportunities").delete().eq("id", bo.id);
    }
  } catch (error) {
    console.error(`[Cleanup] Error cleaning up test data for SPZ ${spz}:`, error);
  }
}

export async function cleanupOcrExtraction(id: string): Promise<void> {
  const client = getTestClient();
  try {
    await client.from("ocr_extractions").delete().eq("id", id);
  } catch (error) {
    console.error(`[Cleanup] Error cleaning up OCR extraction ${id}:`, error);
  }
}

// =============================================================================
// TEST DATA GENERATORS
// =============================================================================

export function generateTestSpz(): string {
  return `TEST${Date.now().toString().slice(-6)}`;
}

export function generateTestVin(): string {
  // Generate a valid 17-character VIN-like string
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let vin = "";
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return vin;
}

export function generateTestIco(): string {
  // Generate an 8-digit ICO (not necessarily valid checksum)
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export function generateTestRodneCislo(): string {
  // Generate a test rodne cislo format (not a real one)
  const year = String(Math.floor(Math.random() * 99)).padStart(2, "0");
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `${year}${month}${day}/${suffix}`;
}

// =============================================================================
// HTTP REQUEST HELPERS
// =============================================================================

export interface RequestOptions {
  method?: string;
  body?: unknown;
  contentType?: string;
}

export async function makeRequest(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { method = "GET", body, contentType = "application/json" } = options;
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();

  const url = `${baseUrl}/functions/v1/${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    apikey: apiKey,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  return await fetch(url, fetchOptions);
}

// =============================================================================
// TEST FIXTURES
// =============================================================================

export const TEST_FIXTURES = {
  validCompany: {
    ico: "27074358",
    name: "OSIT S.R.O.",
    dic: "CZ27074358",
    city: "Praha",
    postalCode: "11000",
  },
  validVehicle: {
    spz: "5L94454",
    vin: "YV1PZA3TCL1103985",
    znacka: "VOLVO",
    model: "V90 CROSS COUNTRY",
    rok_vyroby: 2020,
  },
  validPerson: {
    name: "Jan Novák",
    personalId: "900101/1234",
    dateOfBirth: "1990-01-01",
  },
};

// =============================================================================
// ASSERTIONS
// =============================================================================

export function assertUuid(value: string): void {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    throw new Error(`Expected valid UUID, got: ${value}`);
  }
}

export function assertDateString(value: string): void {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Expected valid date string, got: ${value}`);
  }
}
