/// <reference lib="deno.ns" />
/**
 * Tests for Vendor Parser Utility Module
 *
 * Run with:
 * deno test supabase/functions/tests/vendor-parser.test.ts
 */

import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  parseKeeperNameIdentifier,
  detectVendorType,
  validateRodneCislo,
  validateIco,
  extractVendorDataFromKeeper,
} from "../ocr-extract/vendor-parser.ts";

// =============================================================================
// parseKeeperNameIdentifier Tests
// =============================================================================

Deno.test("parseKeeperNameIdentifier: parses physical person with RC", () => {
  const result = parseKeeperNameIdentifier("JIŘÍ TREBULA/76153037");
  assertEquals(result.name, "JIŘÍ TREBULA");
  assertEquals(result.identifier, "76153037");
  assertEquals(result.rawIdentifier, "76153037");
});

Deno.test("parseKeeperNameIdentifier: parses physical person with 10-digit RC", () => {
  // 8501010001 is a valid 10-digit RC (divisible by 11)
  const result = parseKeeperNameIdentifier("JAN NOVÁK/8501010001");
  assertEquals(result.name, "JAN NOVÁK");
  assertEquals(result.identifier, "8501010001");
});

Deno.test("parseKeeperNameIdentifier: parses company with IČO", () => {
  const result = parseKeeperNameIdentifier("EFTERODA CONSULTING S.R.O./08852316");
  assertEquals(result.name, "EFTERODA CONSULTING S.R.O.");
  assertEquals(result.identifier, "08852316");
});

Deno.test("parseKeeperNameIdentifier: handles name without separator", () => {
  const result = parseKeeperNameIdentifier("JAN NOVÁK");
  assertEquals(result.name, "JAN NOVÁK");
  assertEquals(result.identifier, null);
  assertEquals(result.rawIdentifier, null);
});

Deno.test("parseKeeperNameIdentifier: uses last valid slash with identifier", () => {
  // Company name contains A/S (Danish company form)
  const result = parseKeeperNameIdentifier("FIRMA A/S NĚCO/08852316");
  assertEquals(result.name, "FIRMA A/S NĚCO");
  assertEquals(result.identifier, "08852316");
});

Deno.test("parseKeeperNameIdentifier: handles invalid identifier length", () => {
  // Only 6 digits - too short for valid identifier
  const result = parseKeeperNameIdentifier("JAN NOVÁK/123456");
  assertEquals(result.name, "JAN NOVÁK");
  assertEquals(result.identifier, null);
  assertEquals(result.rawIdentifier, "123456");
});

Deno.test("parseKeeperNameIdentifier: handles empty input", () => {
  const result = parseKeeperNameIdentifier("");
  assertEquals(result.name, "");
  assertEquals(result.identifier, null);
});

Deno.test("parseKeeperNameIdentifier: handles null input", () => {
  const result = parseKeeperNameIdentifier(null);
  assertEquals(result.name, "");
  assertEquals(result.identifier, null);
});

Deno.test("parseKeeperNameIdentifier: handles undefined input", () => {
  const result = parseKeeperNameIdentifier(undefined);
  assertEquals(result.name, "");
  assertEquals(result.identifier, null);
});

Deno.test("parseKeeperNameIdentifier: trims whitespace from ends", () => {
  // Extra spaces around / don't match the pattern - this is expected behavior
  const result = parseKeeperNameIdentifier("  JAN NOVÁK/76153037  ");
  assertEquals(result.name, "JAN NOVÁK");
  assertEquals(result.identifier, "76153037");
});

Deno.test("parseKeeperNameIdentifier: handles slash with text after", () => {
  // Slash followed by non-numeric content
  const result = parseKeeperNameIdentifier("FIRMA ABC/POBOČKA PRAHA");
  assertEquals(result.name, "FIRMA ABC/POBOČKA PRAHA");
  assertEquals(result.identifier, null);
});

// =============================================================================
// detectVendorType Tests
// =============================================================================

Deno.test("detectVendorType: detects S.R.O. as company", () => {
  const result = detectVendorType("EFTERODA CONSULTING S.R.O.", "08852316");
  assertEquals(result.vendorType, "COMPANY");
});

Deno.test("detectVendorType: detects SRO (no dots) as company", () => {
  const result = detectVendorType("ABC FIRMA SRO", "12345678");
  assertEquals(result.vendorType, "COMPANY");
});

Deno.test("detectVendorType: detects A.S. as company", () => {
  const result = detectVendorType("VELKÁ FIRMA A.S.", "12345678");
  assertEquals(result.vendorType, "COMPANY");
});

Deno.test("detectVendorType: detects SPOL. S R.O. as company", () => {
  const result = detectVendorType("NĚJAKÁ SPOL. S R.O.", "12345678");
  assertEquals(result.vendorType, "COMPANY");
});

Deno.test("detectVendorType: detects DRUŽSTVO as company", () => {
  const result = detectVendorType("ZEMĚDĚLSKÉ DRUŽSTVO POLABÍ", "12345678");
  assertEquals(result.vendorType, "COMPANY");
});

Deno.test("detectVendorType: case-insensitive company detection (s.r.o.)", () => {
  const result = detectVendorType("firma s.r.o.", "12345678");
  assertEquals(result.vendorType, "COMPANY");
});

Deno.test("detectVendorType: detects physical person with 9-digit RC", () => {
  // 9-digit identifier = Rodné číslo for person born before 1954
  const result = detectVendorType("JIŘÍ TREBULA", "761530374");
  assertEquals(result.vendorType, "PHYSICAL_PERSON");
});

Deno.test("detectVendorType: uses 8-digit IČO as company signal", () => {
  // Even without company suffix, 8-digit identifier suggests company
  const result = detectVendorType("NĚJAKÁ ENTITA", "12345678");
  assertEquals(result.vendorType, "COMPANY");
});

Deno.test("detectVendorType: uses 10-digit RC as person signal", () => {
  // 8501010001 is a valid 10-digit RC (divisible by 11)
  const result = detectVendorType("NĚJAKÁ ENTITA", "8501010001");
  assertEquals(result.vendorType, "PHYSICAL_PERSON");
});

Deno.test("detectVendorType: defaults to person without signals", () => {
  const result = detectVendorType("NĚCO", null);
  assertEquals(result.vendorType, "PHYSICAL_PERSON");
});

Deno.test("detectVendorType: handles null name", () => {
  const result = detectVendorType(null, "12345678");
  assertEquals(result.vendorType, "COMPANY");
});

// =============================================================================
// validateRodneCislo Tests
// =============================================================================

Deno.test("validateRodneCislo: validates correct 10-digit RC", () => {
  // 8501010001 is divisible by 11 (verified: 8501010001 % 11 === 0)
  const result = validateRodneCislo("8501010001");
  assertEquals(result.valid, true);
  assertEquals(result.normalized, "850101/0001");
});

Deno.test("validateRodneCislo: validates RC with slash", () => {
  // Use the same valid RC as above with slash
  const result = validateRodneCislo("850101/0001");
  assertEquals(result.valid, true);
  assertEquals(result.normalized, "850101/0001");
});

Deno.test("validateRodneCislo: validates 9-digit RC (pre-1954)", () => {
  // 9-digit RCs don't have divisibility check
  const result = validateRodneCislo("530120123");
  assertEquals(result.valid, true);
  assertEquals(result.normalized, "530120/123");
});

Deno.test("validateRodneCislo: rejects invalid 10-digit RC", () => {
  // 1234567890 is not divisible by 11
  const result = validateRodneCislo("1234567890");
  assertEquals(result.valid, false);
  assertStrictEquals(result.error, "Neplatné rodné číslo (kontrolní součet)");
});

Deno.test("validateRodneCislo: rejects too short RC", () => {
  const result = validateRodneCislo("12345678");
  assertEquals(result.valid, false);
  assertStrictEquals(result.error, "Rodné číslo musí mít 9-10 číslic");
});

Deno.test("validateRodneCislo: rejects too long RC", () => {
  const result = validateRodneCislo("12345678901");
  assertEquals(result.valid, false);
  assertStrictEquals(result.error, "Rodné číslo musí mít 9-10 číslic");
});

Deno.test("validateRodneCislo: handles empty input", () => {
  const result = validateRodneCislo("");
  assertEquals(result.valid, false);
});

Deno.test("validateRodneCislo: handles null input", () => {
  const result = validateRodneCislo(null);
  assertEquals(result.valid, false);
});

// =============================================================================
// validateIco Tests
// =============================================================================

Deno.test("validateIco: validates correct 8-digit IČO", () => {
  // 25596641 has valid modulo 11 checksum
  const result = validateIco("25596641");
  assertEquals(result.valid, true);
  assertEquals(result.normalized, "25596641");
});

Deno.test("validateIco: validates IČO with leading zeros", () => {
  // 08852316 has valid checksum
  const result = validateIco("08852316");
  assertEquals(result.valid, true);
  assertEquals(result.normalized, "08852316");
});

Deno.test("validateIco: pads short IČO with zeros", () => {
  // 8852316 should become 08852316
  const result = validateIco("8852316");
  assertEquals(result.valid, true);
  assertEquals(result.normalized, "08852316");
});

Deno.test("validateIco: rejects invalid IČO checksum", () => {
  const result = validateIco("12345678");
  assertEquals(result.valid, false);
  assertStrictEquals(result.error, "Neplatné IČO (kontrolní součet)");
});

Deno.test("validateIco: rejects too short IČO", () => {
  // Even after padding, 123456 -> 00123456, but needs valid checksum
  const result = validateIco("123456");
  assertEquals(result.valid, false);
});

Deno.test("validateIco: rejects too long IČO", () => {
  const result = validateIco("123456789");
  assertEquals(result.valid, false);
  assertStrictEquals(result.error, "IČO musí mít 8 číslic");
});

Deno.test("validateIco: handles empty input", () => {
  const result = validateIco("");
  assertEquals(result.valid, false);
});

Deno.test("validateIco: handles null input", () => {
  const result = validateIco(null);
  assertEquals(result.valid, false);
});

Deno.test("validateIco: strips non-digit characters", () => {
  const result = validateIco("08 852 316");
  assertEquals(result.valid, true);
  assertEquals(result.normalized, "08852316");
});

// =============================================================================
// extractVendorDataFromKeeper Tests
// =============================================================================

Deno.test("extractVendorDataFromKeeper: extracts physical person data", () => {
  // Use a valid 10-digit RC divisible by 11 (8501010001 % 11 === 0)
  const result = extractVendorDataFromKeeper("JIŘÍ TREBULA/8501010001");
  assertEquals(result.vendorType, "PHYSICAL_PERSON");
  assertEquals(result.name, "JIŘÍ TREBULA");
  assertEquals(result.personalId, "850101/0001");
  assertEquals(result.companyId, null);
  assertEquals(result.identifierValid, true);
});

Deno.test("extractVendorDataFromKeeper: extracts company data", () => {
  const result = extractVendorDataFromKeeper("EFTERODA CONSULTING S.R.O./08852316");
  assertEquals(result.vendorType, "COMPANY");
  assertEquals(result.name, "EFTERODA CONSULTING S.R.O.");
  assertEquals(result.personalId, null);
  assertEquals(result.companyId, "08852316");
  assertEquals(result.identifierValid, true);
});

Deno.test("extractVendorDataFromKeeper: handles missing identifier", () => {
  const result = extractVendorDataFromKeeper("JAN NOVÁK");
  assertEquals(result.vendorType, "PHYSICAL_PERSON");
  assertEquals(result.name, "JAN NOVÁK");
  assertEquals(result.personalId, null);
  assertEquals(result.companyId, null);
  assertEquals(result.identifierValid, false);
});

Deno.test("extractVendorDataFromKeeper: handles invalid identifier", () => {
  const result = extractVendorDataFromKeeper("JAN NOVÁK/1234567890");
  assertEquals(result.vendorType, "PHYSICAL_PERSON");
  assertEquals(result.name, "JAN NOVÁK");
  assertEquals(result.personalId, null); // Invalid RC not stored
  assertEquals(result.identifierValid, false);
});

Deno.test("extractVendorDataFromKeeper: handles empty input", () => {
  const result = extractVendorDataFromKeeper("");
  assertEquals(result.vendorType, "PHYSICAL_PERSON");
  assertEquals(result.name, "");
  assertEquals(result.personalId, null);
  assertEquals(result.companyId, null);
});
