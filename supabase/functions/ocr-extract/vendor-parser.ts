/**
 * Vendor Parser Utility Module
 *
 * Parses vendor identity information from ORV documents.
 * Handles extraction of Rodné číslo (birth number) for physical persons
 * and IČO (company ID) for legal entities.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ParsedKeeperName {
  name: string;
  identifier: string | null;
  rawIdentifier: string | null;
}

export interface VendorTypeDetection {
  vendorType: 'PHYSICAL_PERSON' | 'COMPANY';
  confidence: number;
}

export interface ValidationResult {
  valid: boolean;
  normalized: string | null;
  error?: string;
}

export interface VendorData {
  vendorType: 'PHYSICAL_PERSON' | 'COMPANY';
  name: string;
  personalId: string | null;
  companyId: string | null;
  identifierValid: boolean;
}

// =============================================================================
// COMPANY DETECTION PATTERNS
// =============================================================================

/**
 * Czech company suffixes for detection
 * Case-insensitive matching is used
 */
const COMPANY_PATTERNS = [
  /\bS\.?R\.?O\.?\b/i,           // S.R.O., SRO
  /\bA\.?S\.?\b/i,               // A.S., AS
  /\bSPOL\.\s*S\s*R\.?O\.?\b/i,  // SPOL. S R.O.
  /\bK\.?S\.?\b/i,               // K.S., KS (komanditní společnost)
  /\bV\.?O\.?S\.?\b/i,           // V.O.S., VOS (veřejná obchodní společnost)
  /\bZ\.?S\.?\b/i,               // Z.S., ZS (zapsaný spolek)
  /\bDRUŽSTVO\b/i,               // DRUŽSTVO
  /\bO\.?P\.?S\.?\b/i,           // O.P.S., OPS (obecně prospěšná společnost)
  /\bS\.?V\.?J\.?\b/i,           // S.V.J., SVJ (společenství vlastníků jednotek)
  /\bN\.?O\.?\b/i,               // N.O., NO (nadační fond) - at word boundary
  /\bP\.?O\.?\b/i,               // P.O., PO (příspěvková organizace)
  /\bSE\b/i,                     // SE (Societas Europaea)
];

// =============================================================================
// PARSER FUNCTIONS
// =============================================================================

/**
 * Parse keeper name/identifier from ORV format "NAME/IDENTIFIER"
 *
 * Handles:
 * - "JIŘÍ TREBULA/76153037" → { name: "JIŘÍ TREBULA", identifier: "76153037" }
 * - "EFTERODA CONSULTING S.R.O./08852316" → { name: "EFTERODA CONSULTING S.R.O.", identifier: "08852316" }
 * - "JAN NOVÁK" (no separator) → { name: "JAN NOVÁK", identifier: null }
 * - "FIRMA A/S NĚCO/08852316" → { name: "FIRMA A/S NĚCO", identifier: "08852316" }
 *
 * @param fullText The full keeper field text from OCR
 * @returns Parsed name and identifier
 */
export function parseKeeperNameIdentifier(fullText: string | null | undefined): ParsedKeeperName {
  if (!fullText || typeof fullText !== 'string') {
    return { name: '', identifier: null, rawIdentifier: null };
  }

  const trimmed = fullText.trim();
  if (!trimmed) {
    return { name: '', identifier: null, rawIdentifier: null };
  }

  // Match pattern: anything followed by "/" and 8-10 digits at end
  // Uses greedy matching to capture everything before the last valid "/" separator
  const pattern = /^(.+)\/(\d{8,10})$/;
  const match = trimmed.match(pattern);

  if (match) {
    const [, name, identifier] = match;
    return {
      name: name.trim(),
      identifier: identifier,
      rawIdentifier: identifier,
    };
  }

  // Check if there's a "/" with invalid identifier (for debugging)
  const anySlashPattern = /^(.+)\/(.+)$/;
  const anySlashMatch = trimmed.match(anySlashPattern);

  if (anySlashMatch) {
    const [, name, potentialId] = anySlashMatch;
    // Check if it looks like an identifier attempt (digits only)
    if (/^\d+$/.test(potentialId.trim())) {
      return {
        name: name.trim(),
        identifier: null, // Invalid length
        rawIdentifier: potentialId.trim(),
      };
    }
  }

  // No valid separator found, return full text as name
  return { name: trimmed, identifier: null, rawIdentifier: null };
}

/**
 * Detect vendor type based on name patterns and identifier format
 *
 * @param name The vendor name
 * @param identifier The identifier (if available)
 * @returns Vendor type and confidence score
 */
export function detectVendorType(
  name: string | null | undefined,
  identifier: string | null | undefined
): VendorTypeDetection {
  const normalizedName = name?.toUpperCase() || '';
  let companyScore = 0;
  let personScore = 0;

  // Check for company patterns in name
  for (const pattern of COMPANY_PATTERNS) {
    if (pattern.test(normalizedName)) {
      companyScore += 2;
      break; // One match is enough
    }
  }

  // Check identifier length
  if (identifier) {
    const digits = identifier.replace(/\D/g, '');
    if (digits.length === 8) {
      // 8 digits = IČO (company)
      companyScore += 1.5;
    } else if (digits.length === 9 || digits.length === 10) {
      // 9-10 digits = Rodné číslo (person)
      personScore += 1.5;
    }
  }

  // Default to person if no strong signals
  if (companyScore === 0 && personScore === 0) {
    personScore = 0.5;
  }

  const totalScore = companyScore + personScore;
  const isCompany = companyScore > personScore;

  return {
    vendorType: isCompany ? 'COMPANY' : 'PHYSICAL_PERSON',
    confidence: Math.max(companyScore, personScore) / Math.max(totalScore, 1),
  };
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate and normalize Rodné číslo (Czech birth number)
 *
 * Format: 9-10 digits
 * - 6 digits: birth date (YYMMDD, with month +50 for females)
 * - 3-4 digits: suffix (4 digits for people born after 1954)
 *
 * Validation:
 * - For 10-digit RC: must be divisible by 11
 * - For 9-digit RC (born before 1954): no checksum validation
 *
 * @param rc The rodné číslo to validate
 * @returns Validation result with normalized format
 */
export function validateRodneCislo(rc: string | null | undefined): ValidationResult {
  if (!rc) {
    return { valid: false, normalized: null, error: 'Rodné číslo je povinné' };
  }

  // Remove any non-digit characters (including "/" separator)
  const digits = rc.replace(/\D/g, '');

  // Check length (9 or 10 digits)
  if (digits.length < 9 || digits.length > 10) {
    return {
      valid: false,
      normalized: null,
      error: 'Rodné číslo musí mít 9-10 číslic',
    };
  }

  // For 10-digit RC, validate divisibility by 11
  if (digits.length === 10) {
    const num = parseInt(digits, 10);
    if (num % 11 !== 0) {
      return {
        valid: false,
        normalized: null,
        error: 'Neplatné rodné číslo (kontrolní součet)',
      };
    }
  }

  // Normalize to format "######/####" or "######/###"
  const normalized = `${digits.slice(0, 6)}/${digits.slice(6)}`;

  return { valid: true, normalized };
}

/**
 * Validate and normalize IČO (Czech company ID)
 *
 * Format: exactly 8 digits with modulo 11 checksum
 *
 * Checksum calculation:
 * - Weights: 8, 7, 6, 5, 4, 3, 2 for first 7 digits
 * - Sum weighted digits, take remainder mod 11
 * - If remainder is 0, check digit is 1
 * - If remainder is 1, check digit is 0
 * - Otherwise, check digit is 11 - remainder
 *
 * @param ico The IČO to validate
 * @returns Validation result with normalized format
 */
export function validateIco(ico: string | null | undefined): ValidationResult {
  if (!ico) {
    return { valid: false, normalized: null, error: 'IČO je povinné' };
  }

  // Remove any non-digit characters
  const digits = ico.replace(/\D/g, '');

  // Pad with leading zeros if needed (some IČOs have leading zeros)
  const padded = digits.padStart(8, '0');

  // Check length
  if (padded.length !== 8) {
    return {
      valid: false,
      normalized: null,
      error: 'IČO musí mít 8 číslic',
    };
  }

  // Validate modulo 11 checksum
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += parseInt(padded[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let expectedCheckDigit: number;

  if (remainder === 0) {
    expectedCheckDigit = 1;
  } else if (remainder === 1) {
    expectedCheckDigit = 0;
  } else {
    expectedCheckDigit = 11 - remainder;
  }

  const actualCheckDigit = parseInt(padded[7], 10);

  if (actualCheckDigit !== expectedCheckDigit) {
    return {
      valid: false,
      normalized: null,
      error: 'Neplatné IČO (kontrolní součet)',
    };
  }

  return { valid: true, normalized: padded };
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extract complete vendor data from ORV keeper field
 *
 * Combines parsing, type detection, and validation into one call.
 *
 * @param keeperName The full keeper field from OCR (format: "NAME/IDENTIFIER")
 * @returns Complete vendor data with type and validated identifier
 */
export function extractVendorDataFromKeeper(keeperName: string | null | undefined): VendorData {
  // Parse the keeper field
  const parsed = parseKeeperNameIdentifier(keeperName);

  // Detect vendor type
  const detection = detectVendorType(parsed.name, parsed.identifier);

  // Validate identifier based on detected type
  let personalId: string | null = null;
  let companyId: string | null = null;
  let identifierValid = false;

  if (parsed.identifier) {
    if (detection.vendorType === 'COMPANY') {
      const icoResult = validateIco(parsed.identifier);
      if (icoResult.valid) {
        companyId = icoResult.normalized;
        identifierValid = true;
      }
    } else {
      const rcResult = validateRodneCislo(parsed.identifier);
      if (rcResult.valid) {
        personalId = rcResult.normalized;
        identifierValid = true;
      }
    }
  }

  return {
    vendorType: detection.vendorType,
    name: parsed.name,
    personalId,
    companyId,
    identifierValid,
  };
}
