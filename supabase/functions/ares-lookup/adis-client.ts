/// <reference lib="dom" />

/**
 * SecureDealAI MVP - ADIS (DPH Registry) Client
 *
 * Handles communication with the Czech ADIS registry
 * for VAT payer verification and bank account checks.
 *
 * Uses the official SOAP Web Service:
 * WSDL: https://adisrws.mfcr.cz/dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP?wsdl
 *
 * Note: ADIS provides information about:
 * - Whether a company is a VAT payer
 * - Whether it's marked as an "unreliable" payer
 * - Registered bank accounts for VAT purposes
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Raw response from ADIS API
 * Czech field names as returned by the API
 */
export interface AdisRawResponse {
  dic: string;
  nespolehlivy: boolean;
  datumZverejneni?: string;
  bankovniUcty: string[];
}

/**
 * Transformed DPH status for our API response
 */
export interface DphStatus {
  is_vat_payer: boolean;
  is_unreliable: boolean;
  unreliable_since?: string;
  registered_accounts: string[];
  checked_at: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ADIS_SOAP_URL = 'https://adisrws.mfcr.cz/dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP';
const ADIS_NAMESPACE = 'http://adis.mfcr.cz/rozhraniCRPDPH/';
const ADIS_SOAP_ACTION = 'http://adis.mfcr.cz/rozhraniCRPDPH/getStatusNespolehlivyPlatce';
const ADIS_TIMEOUT_MS = 15000; // 15 seconds

// =============================================================================
// SOAP HELPERS
// =============================================================================

/**
 * Build SOAP envelope for StatusNespolehlivyPlatceRequest
 *
 * @param dic - DIČ without CZ prefix (just digits)
 * @returns SOAP XML envelope as string
 */
function buildSoapRequest(dic: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <StatusNespolehlivyPlatceRequest xmlns="${ADIS_NAMESPACE}">
      <dic>${dic}</dic>
    </StatusNespolehlivyPlatceRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Get text content of a child element by tag name
 */
function getElementText(parent: Element, tagName: string): string | null {
  // Try with namespace prefix variations
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0) {
    return elements[0].textContent;
  }
  // Try with namespace prefix
  const nsElements = parent.getElementsByTagName(`ns:${tagName}`);
  if (nsElements.length > 0) {
    return nsElements[0].textContent;
  }
  return null;
}

/**
 * Extract bank accounts from statusPlatceDPH element
 *
 * ADIS returns accounts in two formats:
 *
 * 1. Standard accounts (Czech format):
 * <ucet datumZverejneni="2013-04-01">
 *   <standardniUcet cislo="256423568" kodBanky="0300"/>
 * </ucet>
 *
 * 2. Non-standard accounts (IBAN format):
 * <ucet datumZverejneni="2019-05-17">
 *   <nestandardniUcet cislo="CZ1603000000000256423568"/>
 * </ucet>
 *
 * Output format:
 * - Standard: number/bankCode (e.g., "256423568/0300")
 * - Non-standard: IBAN as-is (e.g., "CZ1603000000000256423568")
 */
function extractBankAccounts(statusPlatce: Element): string[] {
  const accounts: string[] = [];
  const ucetElements = statusPlatce.getElementsByTagName('ucet');

  for (let i = 0; i < ucetElements.length; i++) {
    const ucet = ucetElements[i];

    // Try standard account format (cislo + kodBanky as attributes on standardniUcet)
    const standardni = ucet.getElementsByTagName('standardniUcet')[0];
    if (standardni) {
      const cislo = standardni.getAttribute('cislo') || '';
      const kod = standardni.getAttribute('kodBanky') || '';
      if (cislo && kod) {
        accounts.push(`${cislo}/${kod}`);
      }
      continue;
    }

    // Try non-standard account format (IBAN in cislo attribute on nestandardniUcet)
    const nestandardni = ucet.getElementsByTagName('nestandardniUcet')[0];
    if (nestandardni) {
      const cislo = nestandardni.getAttribute('cislo') || '';
      if (cislo) {
        accounts.push(cislo);
      }
      continue;
    }

    // Fallback: try legacy format with child elements (just in case)
    const cisloUctu = getElementText(ucet, 'cisloUctu')?.trim();
    const kodBanky = getElementText(ucet, 'kodBanky')?.trim();
    if (cisloUctu && kodBanky) {
      const predcisli = getElementText(ucet, 'predcisliUctu')?.trim() || '';
      const accountStr = predcisli ? `${predcisli}-${cisloUctu}/${kodBanky}` : `${cisloUctu}/${kodBanky}`;
      accounts.push(accountStr);
    }
  }

  return accounts;
}

/**
 * Parse SOAP response XML and extract ADIS data
 *
 * Status codes from ADIS:
 * - 0: OK - Request processed successfully
 * - 1: OK - Too many DIČ (max 100), only first 100 processed
 * - 2: Maintenance - Service unavailable (0:00-0:10 daily)
 * - 3: Error - Service unavailable
 */
function parseSoapResponse(xml: string, requestedDic: string): AdisRawResponse | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Check for parsing errors
  const parseError = doc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    console.error('[ADIS Client] XML parse error:', parseError[0].textContent);
    throw new Error('Failed to parse ADIS SOAP response');
  }

  // Check SOAP fault
  const faultElements = doc.getElementsByTagName('soapenv:Fault');
  if (faultElements.length > 0 || doc.getElementsByTagName('Fault').length > 0) {
    const fault = faultElements[0] || doc.getElementsByTagName('Fault')[0];
    const faultString = getElementText(fault, 'faultstring') || 'Unknown SOAP fault';
    console.error('[ADIS Client] SOAP fault:', faultString);
    throw new Error(`ADIS SOAP fault: ${faultString}`);
  }

  // Check status code (0 = OK, 1 = OK with truncation, 2 = maintenance, 3 = error)
  // Format: <status statusCode="0" statusText="OK"/>
  const statusElements = doc.getElementsByTagName('status');
  const statusCode = statusElements.length > 0
    ? statusElements[0].getAttribute('statusCode')
    : null;

  if (statusCode === '2' || statusCode === '3') {
    console.log(`[ADIS Client] Service unavailable (status code: ${statusCode})`);
    return null; // Service unavailable - graceful degradation
  }

  // Find statusPlatceDPH element (contains VAT payer info)
  const statusPlatceElements = doc.getElementsByTagName('statusPlatceDPH');
  if (statusPlatceElements.length === 0) {
    console.log(`[ADIS Client] No statusPlatceDPH found for DIČ ${requestedDic} - not a VAT payer`);
    return null; // Not found = not a VAT payer
  }

  const statusPlatce = statusPlatceElements[0];

  // Extract unreliable payer status (from attribute on statusPlatceDPH element)
  // Format: nespolehlivyPlatce="NE" or nespolehlivyPlatce="ANO"
  const nespolehlivyAttr = statusPlatce.getAttribute('nespolehlivyPlatce');
  const nespolehlivy = nespolehlivyAttr?.toUpperCase() === 'ANO';

  // Extract unreliable since date (from attribute, empty if not unreliable)
  const datumZverejneni = statusPlatce.getAttribute('datumZverejneniNespolehlivosti') || undefined;

  // Extract bank accounts
  const bankovniUcty = extractBankAccounts(statusPlatce);

  console.log(`[ADIS Client] Found ${bankovniUcty.length} bank accounts for DIČ ${requestedDic}`);

  return {
    dic: requestedDic,
    nespolehlivy,
    datumZverejneni: datumZverejneni || undefined,
    bankovniUcty,
  };
}

// =============================================================================
// ADIS CLIENT
// =============================================================================

/**
 * Check DPH (VAT) status in ADIS registry using SOAP Web Service
 *
 * Uses the official getStatusNespolehlivyPlatce operation which returns:
 * - Whether the company is a VAT payer
 * - Whether it's marked as an "unreliable" payer
 * - List of registered bank accounts (zverejneneUcty)
 *
 * @param dic - Czech VAT ID (DIČ) in format CZxxxxxxxx or just digits
 * @returns DPH status or null if not a VAT payer / service unavailable
 * @throws Error on API failures (except service unavailable which returns null)
 */
export async function checkDphStatus(dic: string): Promise<AdisRawResponse | null> {
  // SOAP endpoint expects DIČ as digits only (pattern: \d{1,10})
  // Remove CZ prefix if present
  const dicDigits = dic.toUpperCase().replace(/^CZ/, '');

  // Keep normalized DIČ with CZ prefix for return value
  const normalizedDic = `CZ${dicDigits}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ADIS_TIMEOUT_MS);

    // Build SOAP request envelope
    const soapEnvelope = buildSoapRequest(dicDigits);

    console.log(`[ADIS Client] Checking DPH status for DIČ: ${normalizedDic} via SOAP`);

    const response = await fetch(ADIS_SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ADIS_SOAP_ACTION,
      },
      body: soapEnvelope,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ADIS SOAP error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();

    // Parse SOAP response and extract data
    return parseSoapResponse(xml, normalizedDic);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ADIS API timeout');
    }
    console.error('[ADIS Client] SOAP error:', error);
    throw error;
  }
}

/**
 * Transform ADIS raw response to our standardized DPH status format
 *
 * @param adis - Raw ADIS API response (null if not a VAT payer)
 * @returns Standardized DPH status
 */
export function transformAdisResponse(adis: AdisRawResponse | null): DphStatus {
  if (!adis) {
    return {
      is_vat_payer: false,
      is_unreliable: false,
      registered_accounts: [],
      checked_at: new Date().toISOString(),
    };
  }

  return {
    is_vat_payer: true,
    is_unreliable: adis.nespolehlivy === true,
    unreliable_since: adis.datumZverejneni || undefined,
    registered_accounts: normalizeAccountNumbers(adis.bankovniUcty),
    checked_at: new Date().toISOString(),
  };
}

/**
 * Normalize bank account numbers for comparison
 * Removes spaces, dashes, and converts to standard format
 */
function normalizeAccountNumbers(accounts: string[]): string[] {
  if (!accounts || !Array.isArray(accounts)) {
    return [];
  }

  return accounts.map((account) => {
    // Remove all whitespace and standardize separators
    return account
      .replace(/\s+/g, '')
      .replace(/[-–—]/g, '-')
      .trim();
  });
}

/**
 * Check if a specific bank account is registered with ADIS
 *
 * @param bankAccount - Bank account to check
 * @param registeredAccounts - List of registered accounts from ADIS
 * @returns true if account is found in registered list
 */
export function isBankAccountRegistered(
  bankAccount: string,
  registeredAccounts: string[]
): boolean {
  if (!bankAccount || !registeredAccounts.length) {
    return false;
  }

  // Normalize the account for comparison
  const normalizedInput = bankAccount
    .replace(/\s+/g, '')
    .replace(/[-–—]/g, '-')
    .trim()
    .toLowerCase();

  // Check if any registered account matches
  return registeredAccounts.some((registered) => {
    const normalizedRegistered = registered.toLowerCase();
    // Exact match
    if (normalizedRegistered === normalizedInput) {
      return true;
    }
    // Match without bank code prefix if present
    const inputWithoutPrefix = normalizedInput.replace(/^\d+-/, '');
    const registeredWithoutPrefix = normalizedRegistered.replace(/^\d+-/, '');
    return inputWithoutPrefix === registeredWithoutPrefix;
  });
}
