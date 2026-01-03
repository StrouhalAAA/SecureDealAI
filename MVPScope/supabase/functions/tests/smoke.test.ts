import { assertEquals, assertExists } from "@std/assert";

// Basic test to validate Deno test framework is working
Deno.test("Deno test framework is configured correctly", () => {
  assertEquals(1 + 1, 2);
});

Deno.test("Test utilities are importable", async () => {
  const { getTestClient, generateTestSpz } = await import("./test-utils.ts");
  assertExists(getTestClient);
  assertExists(generateTestSpz);

  const testSpz = generateTestSpz();
  assertEquals(testSpz.startsWith("TEST"), true);
});

// This test requires a running Supabase instance - skip if not available
Deno.test({
  name: "Supabase connection works (requires local Supabase)",
  ignore: !Deno.env.get("SUPABASE_ANON_KEY"),
  fn: async () => {
    const res = await fetch("http://localhost:54321/rest/v1/", {
      headers: { "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "" }
    });
    assertEquals(res.status, 200);
  }
});
