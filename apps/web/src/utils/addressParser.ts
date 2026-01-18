/**
 * Czech address parser utility
 *
 * Parses Czech addresses in various formats commonly found in ORV/VTP documents:
 * - "PŘÍHON 183/64, 66402 OCHOZ U BRNA"
 * - "MNÍŠEK, ZA HUMNY 420, 463 41"
 * - "NA KOPCI 123, 150 00 PRAHA 5"
 * - "BRNO - BYSTRC, VEJROSTOVA 1294/24, 635 00"
 */

export interface ParsedAddress {
  street: string | null;
  city: string | null;
  postalCode: string | null;
}

/**
 * Parse a Czech address string into structured components
 *
 * @param address - Raw address string from OCR
 * @returns Parsed address components (street, city, postalCode)
 */
export function parseCzechAddress(address: string | null | undefined): ParsedAddress {
  if (!address) {
    return { street: null, city: null, postalCode: null };
  }

  // Normalize: uppercase, trim, replace multiple spaces
  const normalized = address.toUpperCase().trim().replace(/\s+/g, ' ');

  // Extract postal code (5 digits with optional space: "123 45" or "12345")
  const postalCodeMatch = normalized.match(/\b(\d{3})\s*(\d{2})\b/);
  const postalCode = postalCodeMatch
    ? `${postalCodeMatch[1]}${postalCodeMatch[2]}`
    : null;

  // Remove postal code from address for further parsing
  let remaining = postalCode
    ? normalized.replace(/\b\d{3}\s*\d{2}\b/, '').trim()
    : normalized;

  // Split by comma
  const parts = remaining
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let street: string | null = null;
  let city: string | null = null;

  if (parts.length === 0) {
    // No parts found
    return { street: null, city: null, postalCode };
  }

  if (parts.length === 1) {
    // Single part - could be just city or street
    // If it contains a number, likely street; otherwise city
    if (hasStreetNumber(parts[0])) {
      street = parts[0];
    } else {
      city = parts[0];
    }
  } else if (parts.length === 2) {
    // Two parts: usually "STREET, CITY" or "CITY, STREET"
    // Street usually has a number pattern (123 or 123/45)
    const [first, second] = parts;

    if (hasStreetNumber(first) && !hasStreetNumber(second)) {
      // First has number, second doesn't -> street, city
      street = first;
      city = second;
    } else if (!hasStreetNumber(first) && hasStreetNumber(second)) {
      // Second has number, first doesn't -> city, street
      city = first;
      street = second;
    } else {
      // Both or neither have numbers - use heuristic:
      // City names are usually shorter and don't have specific patterns
      // Street often has orientation number (123/45)
      if (hasOrientationNumber(first)) {
        street = first;
        city = second;
      } else if (hasOrientationNumber(second)) {
        street = second;
        city = first;
      } else {
        // Default: assume "CITY, STREET" pattern (common in Czech)
        city = first;
        street = second;
      }
    }
  } else {
    // Three or more parts - common formats:
    // "CITY - DISTRICT, STREET, POSTAL CITY"
    // "VILLAGE, STREET, POSTAL"
    // Find the part with orientation number (street)
    // Last non-postal part is usually city

    const streetIdx = parts.findIndex((p) => hasOrientationNumber(p));
    if (streetIdx >= 0) {
      street = parts[streetIdx];
      // City is usually the first or last part (not street, not empty after postal removal)
      const nonStreetParts = parts.filter((_, i) => i !== streetIdx);
      // Prefer last part as city (often "POSTAL CITY" pattern)
      city = nonStreetParts[nonStreetParts.length - 1] || nonStreetParts[0] || null;
    } else {
      // No clear street - first part might be city/district, second street
      city = parts[0];
      street = parts[1];
    }
  }

  // Clean up city name - remove district prefix patterns like "BRNO -" or "PRAHA 5 -"
  if (city) {
    city = city.replace(/\s*-\s*$/, '').trim();
    // Remove trailing numbers that might be district numbers in weird formats
    // But keep "PRAHA 5" style
    if (!/^(PRAHA|BRNO|OSTRAVA|PLZEN|LIBEREC|OLOMOUC)\s+\d+$/.test(city)) {
      city = city.replace(/\s+\d+$/, '').trim();
    }
  }

  return {
    street: street || null,
    city: city || null,
    postalCode,
  };
}

/**
 * Check if a string contains a street number pattern
 * Czech street numbers: "123", "123/45", "1234A"
 */
function hasStreetNumber(text: string): boolean {
  // Match standalone number or number/number pattern
  return /\b\d+[A-Z]?\b/.test(text) && !/^\d{5}$/.test(text.replace(/\s/g, ''));
}

/**
 * Check if a string has an orientation number (123/45 pattern)
 * This is specific to Czech addressing where buildings have
 * descriptive number / orientation number
 */
function hasOrientationNumber(text: string): boolean {
  return /\b\d+\/\d+\b/.test(text);
}

/**
 * Extract power in kW from OCR maxPower field
 *
 * OCR returns power in format "110/3500" (kW/rpm) or just "110"
 * This extracts just the kW value.
 *
 * @param maxPower - Raw maxPower string from OCR
 * @returns Power in kW or null
 */
export function extractPowerKw(maxPower: string | number | null | undefined): number | null {
  if (maxPower === null || maxPower === undefined) return null;

  const str = String(maxPower);
  const match = str.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
