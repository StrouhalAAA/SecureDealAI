/// <reference lib="dom" />

/**
 * SecureDealAI MVP - MVCR Invalid Documents Client
 *
 * Handles communication with the Czech Ministry of Interior (MVČR)
 * Invalid Documents registry API.
 *
 * API Details:
 * - Endpoint: https://aplikace.mv.gov.cz/neplatne-doklady/doklady.aspx
 * - Method: GET (public, no authentication required)
 * - Response: XML
 * - Parameters:
 *   - dotaz = document number (e.g., "217215163")
 *   - doklad = document type (0=ID Card, 4=Passport, 6=Weapons)
 *
 * Response formats:
 * - Document NOT in list (valid): <odpoved>Hledaný doklad nebyl nalezen.</odpoved>
 * - Document IS in list (invalid): <doklad>...</doklad> element present
 * - Error: <chyba>...</chyba> element present
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Request parameters for MVCR check
 */
export interface MvcrCheckRequest {
  document_number: string;
  document_type?: number;  // Default: 0 (ID Card)
}

/**
 * Result of MVCR document validation
 */
export interface MvcrValidationResult {
  is_valid: boolean;              // true = document NOT in invalid list (good)
  is_invalid_document: boolean;   // true = found in MVCR invalid list (bad)
  checked_at: string;
  check_status: MvcrCheckStatus;
  raw_response?: string;
  error_message?: string;
}

export type MvcrCheckStatus = 'SUCCESS' | 'API_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';

/**
 * Document types supported by MVCR API
 */
export enum MvcrDocumentType {
  ID_CARD = 0,      // Občanský průkaz
  PASSPORT = 4,     // Cestovní pas
  WEAPONS = 6,      // Zbrojní průkaz
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MVCR_API_URL = 'https://aplikace.mv.gov.cz/neplatne-doklady/doklady.aspx';
const MVCR_TIMEOUT_MS = 15000; // 15 seconds

// Response markers in XML
const NOT_FOUND_MARKER = 'Hledaný doklad nebyl nalezen';
const DOCUMENT_ELEMENT = 'doklad';
const ERROR_ELEMENT = 'chyba';

// =============================================================================
// XML PARSING HELPERS
// =============================================================================

/**
 * Get text content of a child element by tag name
 */
function getElementText(doc: Document, tagName: string): string | null {
  const elements = doc.getElementsByTagName(tagName);
  if (elements.length > 0) {
    return elements[0].textContent;
  }
  return null;
}

/**
 * Check if an element exists in the document
 */
function elementExists(doc: Document, tagName: string): boolean {
  return doc.getElementsByTagName(tagName).length > 0;
}

/**
 * Parse MVCR XML response
 *
 * Valid document (not in invalid list):
 * - Contains <odpoved>Hledaný doklad nebyl nalezen.</odpoved>
 *
 * Invalid document (in invalid list):
 * - Contains <doklad>...</doklad> element with document details
 *
 * Error response:
 * - Contains <chyba>...</chyba> element
 */
function parseMvcrResponse(xml: string): MvcrValidationResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Check for XML parsing errors
  const parseError = doc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    console.error('[MVCR Client] XML parse error:', parseError[0].textContent);
    return {
      is_valid: false,
      is_invalid_document: false,
      checked_at: new Date().toISOString(),
      check_status: 'INVALID_RESPONSE',
      raw_response: xml,
      error_message: 'Failed to parse MVCR XML response',
    };
  }

  // Check for error response
  if (elementExists(doc, ERROR_ELEMENT)) {
    const errorText = getElementText(doc, ERROR_ELEMENT) || 'Unknown error';
    console.error('[MVCR Client] API error:', errorText);
    return {
      is_valid: false,
      is_invalid_document: false,
      checked_at: new Date().toISOString(),
      check_status: 'API_ERROR',
      raw_response: xml,
      error_message: errorText,
    };
  }

  // Check for "not found" response - document is VALID (not in invalid list)
  const odpoved = getElementText(doc, 'odpoved');
  if (odpoved && odpoved.includes(NOT_FOUND_MARKER)) {
    console.log('[MVCR Client] Document is valid (not in invalid list)');
    return {
      is_valid: true,
      is_invalid_document: false,
      checked_at: new Date().toISOString(),
      check_status: 'SUCCESS',
      raw_response: xml,
    };
  }

  // Check for <doklad> element - document IS in invalid list
  if (elementExists(doc, DOCUMENT_ELEMENT)) {
    console.warn('[MVCR Client] Document found in invalid list!');
    return {
      is_valid: false,
      is_invalid_document: true,
      checked_at: new Date().toISOString(),
      check_status: 'SUCCESS',
      raw_response: xml,
    };
  }

  // Unexpected response format
  console.error('[MVCR Client] Unexpected response format:', xml);
  return {
    is_valid: false,
    is_invalid_document: false,
    checked_at: new Date().toISOString(),
    check_status: 'INVALID_RESPONSE',
    raw_response: xml,
    error_message: 'Unexpected MVCR response format',
  };
}

// =============================================================================
// MVCR CLIENT
// =============================================================================

/**
 * Normalize document number for API query
 * - Removes spaces, dashes, and other separators
 * - Converts to uppercase
 */
function normalizeDocumentNumber(documentNumber: string): string {
  return documentNumber
    .replace(/[\s\-–—\.\/]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Check if a document is in the MVCR invalid documents registry
 *
 * @param request - Document number and optional type to check
 * @returns Validation result with status
 */
export async function checkMvcrDocument(
  request: MvcrCheckRequest
): Promise<MvcrValidationResult> {
  const normalizedNumber = normalizeDocumentNumber(request.document_number);
  const documentType = request.document_type ?? MvcrDocumentType.ID_CARD;

  console.log(`[MVCR Client] Checking document: ${normalizedNumber}, type: ${documentType}`);

  if (!normalizedNumber) {
    return {
      is_valid: false,
      is_invalid_document: false,
      checked_at: new Date().toISOString(),
      check_status: 'API_ERROR',
      error_message: 'Document number is required',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MVCR_TIMEOUT_MS);

    // Build URL with query parameters
    const url = new URL(MVCR_API_URL);
    url.searchParams.set('dotaz', normalizedNumber);
    url.searchParams.set('doklad', documentType.toString());

    console.log(`[MVCR Client] Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'SecureDealAI/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MVCR API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    console.log(`[MVCR Client] Response received, length: ${xml.length}`);

    return parseMvcrResponse(xml);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[MVCR Client] Request timeout');
      return {
        is_valid: false,
        is_invalid_document: false,
        checked_at: new Date().toISOString(),
        check_status: 'TIMEOUT',
        error_message: 'MVCR API request timed out',
      };
    }

    console.error('[MVCR Client] Error:', error);
    return {
      is_valid: false,
      is_invalid_document: false,
      checked_at: new Date().toISOString(),
      check_status: 'API_ERROR',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper to check if document number is valid format
 * Czech ID cards typically have 9 digits
 */
export function isValidDocumentNumberFormat(documentNumber: string): boolean {
  const normalized = normalizeDocumentNumber(documentNumber);
  // Czech ID card: 9 digits
  // Allow some flexibility for different formats
  return /^\d{6,12}$/.test(normalized) || /^[A-Z0-9]{6,12}$/.test(normalized);
}
