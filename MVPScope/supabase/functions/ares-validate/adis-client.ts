/**
 * SecureDealAI MVP - ADIS (DPH Registry) Client
 *
 * Handles communication with the Czech ADIS registry
 * for VAT payer verification and bank account checks.
 *
 * ADIS API Documentation:
 * https://adis.mfcr.cz/dpr/DphReg
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

const DEFAULT_ADIS_URL = 'https://adisreg.mfcr.cz/cgi-bin/adis/idph/int_dp_prij.cgi';
const ADIS_TIMEOUT_MS = 15000; // 15 seconds

// =============================================================================
// ADIS CLIENT
// =============================================================================

/**
 * Check DPH (VAT) status in ADIS registry
 *
 * @param dic - Czech VAT ID (DIČ) in format CZxxxxxxxx
 * @returns DPH status or null if not a VAT payer
 * @throws Error on API failures
 */
export async function checkDphStatus(dic: string): Promise<AdisRawResponse | null> {
  const adisUrl = Deno.env.get('ADIS_API_URL') || DEFAULT_ADIS_URL;

  // Normalize DIČ - ensure it starts with CZ
  const normalizedDic = dic.toUpperCase().startsWith('CZ') ? dic : `CZ${dic}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ADIS_TIMEOUT_MS);

    // ADIS uses a query parameter format
    // Real endpoint: https://adisreg.mfcr.cz/cgi-bin/adis/idph/int_dp_prij.cgi?cisession=xxx&dic=CZxxxxxxxx
    const requestUrl = `${adisUrl}?dic=${encodeURIComponent(normalizedDic)}&jazyk=cz&typ=json`;

    console.log(`[ADIS Client] Checking DPH status for DIČ: ${normalizedDic}`);

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      console.log(`[ADIS Client] DIČ ${normalizedDic} not found in registry`);
      return null; // Not a VAT payer
    }

    if (!response.ok) {
      throw new Error(`ADIS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle case where ADIS returns empty or not-found response
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }

    // ADIS may return array or single object depending on endpoint
    const adisRecord = Array.isArray(data) ? data[0] : data;

    return {
      dic: adisRecord.dic || normalizedDic,
      nespolehlivy: adisRecord.nespolehlivy === true || adisRecord.nespolehlivy === 'ano',
      datumZverejneni: adisRecord.datumZverejneniNespolehlivosti || adisRecord.datumZverejneni,
      bankovniUcty: adisRecord.bankovniUcty || adisRecord.ucty || [],
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ADIS API timeout');
    }
    console.error('[ADIS Client] Fetch error:', error);
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
